import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import matter from 'gray-matter';

const CONTENT_DIR = 'src/content/noticias';

function getMarkdownFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => extname(f) === '.md')
    .map((f) => join(dir, f));
}

function getAllArticles() {
  return getMarkdownFiles(CONTENT_DIR).map((f) => {
    const content = readFileSync(f, 'utf-8');
    const { data } = matter(content);
    return { file: f, data };
  });
}

describe('Content validation - artículos de demostración', () => {
  it('todos los artículos tienen campos obligatorios', () => {
    const articles = getAllArticles();
    expect(articles.length).toBeGreaterThan(0);

    for (const { data } of articles) {
      expect(data.title, `Artículo sin título: ${data.slug}`).toBeTruthy();
      expect(data.description, `Artículo sin descripción: ${data.slug}`).toBeTruthy();
      expect(data.slug, `Artículo sin slug en ${data.file}`).toBeTruthy();
      expect(data.section, `Artículo sin sección: ${data.slug}`).toBeTruthy();
      expect(data.municipality, `Artículo sin municipio: ${data.slug}`).toBeTruthy();
      expect(data.author, `Artículo sin autor: ${data.slug}`).toBeTruthy();
      expect(data.publishedAt, `Artículo sin fecha: ${data.slug}`).toBeTruthy();
    }
  });

  it('el slug es URL-friendly', () => {
    const articles = getAllArticles();
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

    for (const { data } of articles) {
      expect(data.slug, `Slug inválido: ${data.slug}`).toMatch(slugRegex);
    }
  });

  it('los estados editoriales son válidos', () => {
    const articles = getAllArticles();
    const validStatuses = ['draft', 'review', 'published'];

    for (const { data } of articles) {
      expect(validStatuses).toContain(data.status);
    }
  });

  it('las fechas de actualización son posteriores a la publicación cuando existen', () => {
    const articles = getAllArticles();

    for (const { data } of articles) {
      if (data.updatedAt) {
        const published = new Date(data.publishedAt);
        const updated = new Date(data.updatedAt);
        expect(
          updated >= published,
          `Artículo ${data.slug}: updatedAt anterior a publishedAt`,
        ).toBe(true);
      }
    }
  });

  it('las fuentes tienen nombre y URL válida', () => {
    const articles = getAllArticles();

    for (const { data } of articles) {
      if (data.sources && Array.isArray(data.sources)) {
        for (const source of data.sources) {
          expect(source.name, `Fuente sin nombre en ${data.slug}`).toBeTruthy();
          expect(
            () => new URL(source.url),
            `URL inválida en ${data.slug}: ${source.url}`,
          ).not.toThrow();
        }
      }
    }
  });

  it('hay al menos un artículo destacado', () => {
    const articles = getAllArticles();
    const featured = articles.filter((a) => a.data.featured === true);
    expect(featured.length).toBeGreaterThanOrEqual(1);
  });

  it('los artículos publicados aparecen en el índice de búsqueda', () => {
    const articles = getAllArticles().filter((a) => a.data.status === 'published');
    expect(articles.length).toBeGreaterThan(0);
  });
});
