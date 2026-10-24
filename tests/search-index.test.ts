import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import {
  CONTENT_DIR,
  OUTPUT_FILE,
  buildSearchIndex,
  toPlainText,
} from '../scripts/generate-search.mjs';
import { findLocationByNameAndType } from '../src/data/locations';
import type { SearchIndexEntry } from '../src/lib/search';

const GEO_FIELDS: ReadonlyArray<{
  field: 'municipality' | 'localidad' | 'region';
  type: 'municipio' | 'localidad' | 'region';
}> = [
  { field: 'municipality', type: 'municipio' },
  { field: 'localidad', type: 'localidad' },
  { field: 'region', type: 'region' },
];

const readPublishedFrontmatter = () =>
  readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith('.md'))
    .map((file) => ({ file, data: matter(readFileSync(join(CONTENT_DIR, file), 'utf-8')).data }))
    .filter(({ data }) => data.status === 'published');

const committed = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8')) as SearchIndexEntry[];
const generated = buildSearchIndex(CONTENT_DIR) as SearchIndexEntry[];

describe('generate-search', () => {
  it('el índice versionado es exactamente el que genera el build', () => {
    expect(committed).toEqual(generated);
  });

  it('sólo indexa artículos publicados', () => {
    const published = readPublishedFrontmatter();
    expect(generated.length).toBe(published.length);
    expect(generated.length).toBeGreaterThan(0);
  });

  it('la lista de slugs coincide con el frontmatter publicado', () => {
    const fromFrontmatter = readPublishedFrontmatter().map(({ data }) => data.slug).sort();
    expect(generated.map((entry) => entry.slug).sort()).toEqual(fromFrontmatter);
  });

  it('cada entrada trae título, sección, fecha y contenido indexable', () => {
    for (const entry of generated) {
      expect(entry.title, `${entry.slug} sin título`).not.toBe('');
      expect(entry.section, `${entry.slug} sin sección`).not.toBe('');
      expect(entry.publishedAt, `${entry.slug} sin fecha`).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(entry.content.length, `${entry.slug} sin contenido`).toBeGreaterThan(0);
      expect(entry.content, `${entry.slug} conserva markdown de enlaces`).not.toContain('](http');
      expect(entry.content, `${entry.slug} conserva encabezados markdown`).not.toContain('##');
    }
  });

  it('las ubicaciones del índice pertenecen al catálogo con el tipo correcto', () => {
    for (const entry of generated) {
      for (const { field, type } of GEO_FIELDS) {
        const value = entry[field];
        if (value === '') continue;
        expect(
          findLocationByNameAndType(value, type),
          `${entry.slug}: ${field} "${value}" no es un ${type} del catálogo`,
        ).toBeDefined();
      }
    }
  });
});

describe('toPlainText', () => {
  it('quita marcadores de markdown y conserva el texto', () => {
    const markdown = [
      '## Qué se sabe',
      '',
      'Una publicación de [El Diario Sur](https://example.com) informó **más de 70 cuadras**.',
      '',
      '- Primer punto',
      '- Segundo punto',
    ].join('\n');

    const plain = toPlainText(markdown);
    expect(plain).not.toContain('#');
    expect(plain).not.toContain('**');
    expect(plain).not.toContain('](http');
    expect(plain).toContain('El Diario Sur');
    expect(plain).toContain('más de 70 cuadras');
    expect(plain).toContain('Primer punto');
  });

  it('colapsa espacios y saltos de línea', () => {
    expect(toPlainText('a\n\n   b\t c')).toBe('a b c');
  });

  it('preserva la separación entre párrafos y encabezados con CRLF', () => {
  const markdown = 'Primer párrafo.\r\n## Segundo apartado\r\nTexto final.';

  expect(toPlainText(markdown)).toBe(
    'Primer párrafo. Segundo apartado Texto final.',
  );
});

it('preserva la separación entre párrafos, listas y citas con CRLF', () => {
  const markdown =
    'Antes.\r\n- Elemento uno\r\n> Una cita\r\nDespués.';

  expect(toPlainText(markdown)).toBe(
    'Antes. Elemento uno Una cita Después.',
  );
});
});
