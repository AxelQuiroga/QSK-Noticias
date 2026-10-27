#!/usr/bin/env python3
"""Pruebas unitarias del contrato Markdown/YAML del agente editorial."""
import importlib.util
import sys
import unittest
from unittest.mock import patch
import json
import tempfile
from pathlib import Path

SCRIPT = Path(__file__).with_name("agente-editorial.py")
SPEC = importlib.util.spec_from_file_location("agente_editorial", SCRIPT)
agent = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = agent
SPEC.loader.exec_module(agent)

ROOT = Path(__file__).resolve().parents[2]
CATALOGS = agent.load_catalogs(ROOT)

SOURCE = """---
status: draft
title: "Borrador extractivo"
description: "Síntesis automática de una publicación oficial."
slug: "noticia-oficial-prueba"
section: "Obras públicas"
scope: "nacional"
author: "Redacción QSK Noticias"
sources:
  - name: "Organismo oficial"
    url: "https://www.argentina.gob.ar/noticias/prueba"
---

## Síntesis extractiva de la fuente

Fragmentos textuales y datos detectados por el extractor que deben convertirse en una noticia.
"""

OUTPUT = """---
title: "El organismo anunció una medida para el sector"
description: "El organismo informó una medida y detalló los pasos previstos para su implementación."
slug: "noticia-oficial-prueba"
primaryTopic: "Obras públicas"
secondaryTopics:
  - "Sociedad"
section: "Obras públicas"
scope: "nacional"
author: "Redacción QSK Noticias"
status: draft
sources:
  - name: "Organismo oficial"
    url: "https://www.argentina.gob.ar/noticias/prueba"
---

El organismo oficial informó que adoptará una medida para el sector y describió los pasos previstos para llevarla adelante. La comunicación no confirma que la implementación haya finalizado.

Según la información difundida por el organismo, la iniciativa seguirá las etapas detalladas en el anuncio. El material disponible no aporta más datos para precisar un calendario o cuantificar sus efectos.
"""


class EditorialAgentTests(unittest.TestCase):
    def test_retries_once_when_workers_ai_response_has_no_text(self):
        class FakeResponse:
            def __init__(self, payload):
                self.payload = payload
            def __enter__(self):
                return self
            def __exit__(self, *args):
                return False
            def read(self):
                return json.dumps(self.payload).encode("utf-8")

        responses = [
            FakeResponse({"success": True, "result": {"unexpected": "shape"}}),
            FakeResponse({"success": True, "result": {"response": OUTPUT}}),
        ]
        with patch.object(agent.urllib.request, "urlopen", side_effect=responses) as mocked:
            result = agent.call_model("prompt", SOURCE, "token", "account", CATALOGS)
        self.assertEqual(result, OUTPUT.strip())
        self.assertEqual(mocked.call_count, 2)

    def test_stops_after_third_unrecognized_workers_ai_response(self):
        class FakeResponse:
            def __enter__(self):
                return self
            def __exit__(self, *args):
                return False
            def read(self):
                return json.dumps({"success": True, "result": {"unexpected": "shape"}}).encode("utf-8")

        with patch.object(agent.urllib.request, "urlopen", side_effect=[
            FakeResponse(), FakeResponse(), FakeResponse(),
        ]) as mocked, patch.object(agent.time, "sleep"):
            with self.assertRaisesRegex(agent.EditorialError, "Se agotaron los reintentos"):
                agent.call_model("prompt", SOURCE, "token", "account", CATALOGS)
        self.assertEqual(mocked.call_count, agent.WORKERS_AI_MAX_ATTEMPTS)

    def test_reads_real_catalogs(self):
        self.assertIn("Obras públicas", CATALOGS.topics)
        self.assertIn("Lanús", CATALOGS.municipalities)
        self.assertIn("Banfield", CATALOGS.localities)
        self.assertIn("AMBA", CATALOGS.regions)
        self.assertIn("RS", CATALOGS.countries)

    def test_accepts_complete_markdown_and_yaml_frontmatter(self):
        rewritten = agent.rewrite_markdown(SOURCE, OUTPUT, CATALOGS)
        metadata, body = agent.parse_frontmatter(rewritten)
        self.assertEqual(metadata["status"], "draft")
        self.assertEqual(metadata["primaryTopic"], "Obras públicas")
        self.assertEqual(metadata["section"], metadata["primaryTopic"])
        self.assertIn("El organismo oficial informó", body)
        self.assertNotIn("Síntesis extractiva", body)

    def test_accepts_short_article_without_editorial_body_gate(self):
        metadata, _ = agent.parse_frontmatter(OUTPUT)
        short_output = agent.serialize_markdown(metadata, "El municipio anunció una obra.")
        rewritten = agent.rewrite_markdown(SOURCE, short_output, CATALOGS)
        _, body = agent.parse_frontmatter(rewritten)
        self.assertEqual(body, "El municipio anunció una obra.")

    def test_preserves_article_body_instead_of_normalizing_its_content(self):
        metadata, _ = agent.parse_frontmatter(OUTPUT)
        article_body = "\n\nTexto redactado por la IA.  \n"
        model_output = agent.serialize_markdown(metadata, article_body)
        rewritten = agent.rewrite_markdown(SOURCE, model_output, CATALOGS)
        _, body = agent.parse_frontmatter(rewritten)
        self.assertEqual(body, article_body)

    def test_section_and_primary_topic_can_be_valid_independently(self):
        independent = OUTPUT.replace(
            'primaryTopic: "Obras públicas"', 'primaryTopic: "Sociedad"'
        ).replace('  - "Sociedad"', '  - "Educación"')
        rewritten = agent.rewrite_markdown(SOURCE, independent, CATALOGS)
        metadata, _ = agent.parse_frontmatter(rewritten)
        self.assertEqual(metadata["primaryTopic"], "Sociedad")
        self.assertEqual(metadata["section"], "Obras públicas")

    def test_restores_model_modified_slug_from_original(self):
        invalid = OUTPUT.replace('slug: "noticia-oficial-prueba"', 'slug: "slug-inventado-por-el-modelo"')
        rewritten = agent.rewrite_markdown(SOURCE, invalid, CATALOGS)
        metadata, _ = agent.parse_frontmatter(rewritten)
        self.assertEqual(metadata["slug"], "noticia-oficial-prueba")

    def test_restores_model_modified_sources_from_original(self):
        invalid = OUTPUT.replace("https://www.argentina.gob.ar/noticias/prueba", "https://example.com/inventada")
        rewritten = agent.rewrite_markdown(SOURCE, invalid, CATALOGS)
        metadata, _ = agent.parse_frontmatter(rewritten)
        self.assertEqual(metadata["sources"], agent.parse_frontmatter(SOURCE)[0]["sources"])

    def test_removes_protected_field_not_present_in_original(self):
        invalid = OUTPUT.replace('scope: "nacional"', 'scope: "nacional"\nfeatured: true')
        rewritten = agent.rewrite_markdown(SOURCE, invalid, CATALOGS)
        metadata, _ = agent.parse_frontmatter(rewritten)
        self.assertNotIn("featured", metadata)

    def test_rejects_json_instead_of_markdown(self):
        with self.assertRaises(agent.EditorialError):
            agent.rewrite_markdown(SOURCE, '{"title":"noticia"}', CATALOGS)

    def test_rejects_invalid_yaml(self):
        invalid = OUTPUT.replace('title: "El organismo anunció una medida para el sector"', 'title: [sin cerrar')
        with self.assertRaises(agent.EditorialError):
            agent.rewrite_markdown(SOURCE, invalid, CATALOGS)

    def test_rejects_unknown_section(self):
        invalid = OUTPUT.replace('section: "Obras públicas"', 'section: "Actualidad inventada"')
        with self.assertRaisesRegex(agent.EditorialError, "section"):
            agent.rewrite_markdown(SOURCE, invalid, CATALOGS)

    def test_rejects_unknown_topic(self):
        invalid = OUTPUT.replace('primaryTopic: "Obras públicas"', 'primaryTopic: "Gobierno local"')
        with self.assertRaisesRegex(agent.EditorialError, "primaryTopic"):
            agent.rewrite_markdown(SOURCE, invalid, CATALOGS)

    def test_rejects_unknown_municipality(self):
        invalid = OUTPUT.replace('scope: "nacional"', 'scope: "nacional"\nmunicipality: "Municipio inventado"')
        with self.assertRaisesRegex(agent.EditorialError, "municipality"):
            agent.rewrite_markdown(SOURCE, invalid, CATALOGS)

    def test_rejects_wrong_location_type(self):
        invalid = OUTPUT.replace('scope: "nacional"', 'scope: "nacional"\nmunicipality: "Banfield"')
        with self.assertRaisesRegex(agent.EditorialError, "municipality"):
            agent.rewrite_markdown(SOURCE, invalid, CATALOGS)

    def test_rejects_unknown_country(self):
        invalid = OUTPUT.replace('scope: "nacional"', 'scope: "internacional"\ncountry: "ZZ"')
        with self.assertRaisesRegex(agent.EditorialError, "country"):
            agent.rewrite_markdown(SOURCE, invalid, CATALOGS)

    def test_removes_country_from_domestic_ushuaia_story(self):
        # Una noticia argentina sobre el puerto de Ushuaia no es internacional
        # por incluir un country incidental en la salida del modelo.
        invalid = OUTPUT.replace(
            'scope: "nacional"',
            'scope: "nacional"\ncountry: "AR"',
        )
        rewritten = agent.rewrite_markdown(SOURCE, invalid, CATALOGS)
        metadata, _ = agent.parse_frontmatter(rewritten)
        self.assertEqual(metadata["scope"], "nacional")
        self.assertNotIn("country", metadata)

    def test_accepts_country_for_international_scope(self):
        international = OUTPUT.replace(
            'scope: "nacional"',
            'scope: "internacional"\ncountry: "BR"',
        )
        rewritten = agent.rewrite_markdown(SOURCE, international, CATALOGS)
        metadata, _ = agent.parse_frontmatter(rewritten)
        self.assertEqual(metadata["scope"], "internacional")
        self.assertEqual(metadata["country"], "BR")

    def test_restores_source_changes(self):
        invalid = OUTPUT.replace("https://www.argentina.gob.ar/noticias/prueba", "https://example.com/noticia")
        rewritten = agent.rewrite_markdown(SOURCE, invalid, CATALOGS)
        metadata, _ = agent.parse_frontmatter(rewritten)
        self.assertEqual(metadata["sources"], agent.parse_frontmatter(SOURCE)[0]["sources"])

    def test_restores_status_change(self):
        invalid = OUTPUT.replace("status: draft", "status: published")
        rewritten = agent.rewrite_markdown(SOURCE, invalid, CATALOGS)
        metadata, _ = agent.parse_frontmatter(rewritten)
        self.assertEqual(metadata["status"], "draft")

    def test_rejects_unknown_frontmatter_field(self):
        invalid = OUTPUT.replace('scope: "nacional"', 'scope: "nacional"\nmunicipioNuevo: "X"')
        with self.assertRaisesRegex(agent.EditorialError, "no admitidos"):
            agent.rewrite_markdown(SOURCE, invalid, CATALOGS)

    def test_rejects_extractor_only_origen_metadata(self):
        invalid = OUTPUT.replace(
            'scope: "nacional"',
            'scope: "nacional"\norigen:\n  url: "https://www.argentina.gob.ar/noticias/prueba"',
        )
        with self.assertRaisesRegex(agent.EditorialError, "origen"):
            agent.rewrite_markdown(SOURCE, invalid, CATALOGS)

    def test_removes_added_published_date(self):
        invalid = OUTPUT.replace('scope: "nacional"', 'scope: "nacional"\npublishedAt: "2026-10-27"')
        rewritten = agent.rewrite_markdown(SOURCE, invalid, CATALOGS)
        metadata, _ = agent.parse_frontmatter(rewritten)
        self.assertNotIn("publishedAt", metadata)

    def test_retries_malformed_yaml_and_accepts_corrected_output(self):
        malformed = OUTPUT.replace(
            'title: "El organismo anunció una medida para el sector"',
            'title: El organismo anunció: una medida para el sector',
        )
        with patch.object(agent, "call_model", side_effect=[malformed, OUTPUT]) as mocked:
            with tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / "borrador.md"
                path.write_text(SOURCE, encoding="utf-8")
                rewritten = agent.rewrite_file(path, "prompt", "token", "account", CATALOGS)
        self.assertIn("El organismo anunció una medida", rewritten)
        self.assertEqual(mocked.call_count, 2)
        self.assertEqual(mocked.call_args_list[1].kwargs["repair_context"]["output"], malformed)
        self.assertIn("YAML inválido", mocked.call_args_list[1].kwargs["repair_context"]["error"])

    def test_process_files_continues_after_one_invalid_news_item(self):
        with tempfile.TemporaryDirectory() as directory:
            first = Path(directory) / "first.md"
            second = Path(directory) / "second.md"
            first.write_text(SOURCE, encoding="utf-8")
            second.write_text(SOURCE, encoding="utf-8")
            with patch.object(agent, "rewrite_file", side_effect=[
                agent.EditorialError("YAML inválido"),
                OUTPUT,
            ]) as mocked:
                result = agent.process_files([first, second], "prompt", "token", "account", CATALOGS)
            self.assertEqual(mocked.call_count, 2)
            self.assertEqual(len(result["failures"]), 1)
            self.assertIn("YAML inválido", result["failures"][0])
            self.assertEqual(first.read_text(encoding="utf-8"), SOURCE)
            self.assertIn("El organismo anunció una medida", second.read_text(encoding="utf-8"))

    def test_process_files_stops_on_global_workers_ai_failure(self):
        with __import__("tempfile").TemporaryDirectory() as directory:
            first = Path(directory) / "first.md"
            second = Path(directory) / "second.md"
            first.write_text(SOURCE, encoding="utf-8")
            second.write_text(SOURCE, encoding="utf-8")
            with patch.object(agent, "rewrite_file", side_effect=agent.SystemEditorialError("HTTP 401")) as mocked:
                with self.assertRaises(agent.SystemEditorialError):
                    agent.process_files([first, second], "prompt", "token", "account", CATALOGS)
            self.assertEqual(mocked.call_count, 1)
            self.assertEqual(first.read_text(encoding="utf-8"), SOURCE)
            self.assertEqual(second.read_text(encoding="utf-8"), SOURCE)

    def test_rejects_legacy_actualidad_section(self):
        invalid = OUTPUT.replace('section: "Obras públicas"', 'section: "Actualidad"')
        with self.assertRaisesRegex(agent.EditorialError, "section"):
            agent.rewrite_markdown(SOURCE, invalid, CATALOGS)


    def test_retries_transient_timeout_and_succeeds(self):
        class FakeResponse:
            def __enter__(self):
                return self
            def __exit__(self, *args):
                return False
            def read(self):
                return json.dumps({"success": True, "result": {"response": OUTPUT}}).encode("utf-8")

        with patch.object(
            agent.urllib.request, "urlopen",
            side_effect=[TimeoutError("read timed out"), TimeoutError("read timed out"), FakeResponse()],
        ) as mocked, patch.object(agent.time, "sleep") as sleeper:
            result = agent.call_model("prompt", SOURCE, "token", "account", CATALOGS)
        self.assertEqual(result, OUTPUT.strip())
        self.assertEqual(mocked.call_count, 3)
        self.assertEqual([call.args[0] for call in sleeper.call_args_list], [2, 5])

    def test_exhausted_timeout_is_a_per_draft_error(self):
        with patch.object(agent.urllib.request, "urlopen", side_effect=TimeoutError("read timed out")) as mocked:
            with patch.object(agent.time, "sleep"):
                with self.assertRaises(agent.TransientWorkersAIError):
                    agent.call_model("prompt", SOURCE, "token", "account", CATALOGS)
        self.assertEqual(mocked.call_count, agent.WORKERS_AI_MAX_ATTEMPTS)

    def test_process_files_continues_after_transient_timeout_exhaustion(self):
        with tempfile.TemporaryDirectory() as directory:
            first = Path(directory) / "first.md"
            second = Path(directory) / "second.md"
            first.write_text(SOURCE, encoding="utf-8")
            second.write_text(SOURCE, encoding="utf-8")
            with patch.object(agent, "rewrite_file", side_effect=[
                agent.TransientWorkersAIError("Workers AI timeout agotado"),
                OUTPUT,
            ]) as mocked:
                result = agent.process_files([first, second], "prompt", "token", "account", CATALOGS)
            self.assertEqual(mocked.call_count, 2)
            self.assertEqual(len(result["failures"]), 1)
            self.assertIn("timeout agotado", result["failures"][0])
            self.assertEqual(first.read_text(encoding="utf-8"), SOURCE)
            self.assertIn("El organismo anunció una medida", second.read_text(encoding="utf-8"))



if __name__ == "__main__":
    unittest.main()
