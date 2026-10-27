#!/usr/bin/env python3
"""Pruebas unitarias del contrato Markdown/YAML del agente editorial."""
import importlib.util
import sys
import unittest
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

    def test_reports_safe_diagnostic_for_unrecognized_workers_response(self):
        payload = {
            "success": True,
            "result": {"status": "incomplete", "usage": {"tokens": 3}},
        }
        with self.assertRaisesRegex(agent.EditorialError, "top_level_keys"):
            agent.response_text(payload)

    def test_rejects_empty_workers_response_text(self):
        with self.assertRaisesRegex(agent.EditorialError, "result_keys"):
            agent.response_text({"success": True, "result": {"response": "   "}})

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

    def test_rejects_legacy_actualidad_section(self):
        invalid = OUTPUT.replace('section: "Obras públicas"', 'section: "Actualidad"')
        with self.assertRaisesRegex(agent.EditorialError, "section"):
            agent.rewrite_markdown(SOURCE, invalid, CATALOGS)


if __name__ == "__main__":
    unittest.main()
