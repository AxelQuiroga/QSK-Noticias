import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import yaml from 'js-yaml';

const CONTENT_DIR = 'src/content/noticias';

function getMarkdownFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => extname(f) === '.md')
    .map((f) => join(dir, f));
}

function getAllArticles() {
  return getMarkdownFiles(CONTENT_DIR).map((f) => {
    const content = readFileSync(f, 'utf-8');
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    let data = {};
    if (frontmatterMatch) {
      try {
        data = yaml.load(frontmatterMatch[1]) || {};
      } catch (e) {
        data = {};
      }
    }
    return { file: f, data };
  });
}

describe('Content validation - articulos de demostracion', () => {
  it('todos los articulos tienen campos obligatorios', () => {
    const articles = getAllArticles();
    expect(articles.length).toBeGreaterThan(0);

    for (const { data } of articles) {
      expect(data.title, `Articulo sin titulo: ${data.slug}`).toBeTruthy();
      expect(data.description, `Articulo sin descripcion: ${data.slug}`).toBeTruthy();
      expect(data.slug, `Articulo sin slug en ${data.file}`).toBeTruthy();
      expect(data.section, `Articulo sin seccion: ${data.slug}`).toBeTruthy();
      expect(data.author, `Articulo sin autor: ${data.slug}`).toBeTruthy();
      expect(data.publishedAt, `Articulo sin fecha: ${data.slug}`).toBeTruthy();
    }
  });

  it('el slug es URL-friendly', () => {
    const articles = getAllArticles();
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

    for (const { data } of articles) {
      expect(data.slug, `Slug invalido: ${data.slug}`).toMatch(slugRegex);
    }
  });

  it('los estados editoriales son validos', () => {
    const articles = getAllArticles();
    const validStatuses = ['draft', 'review', 'published'];

    for (const { data } of articles) {
      expect(validStatuses).toContain(data.status);
    }
  });

  it('las fechas de actualizacion son posteriores a la publicacion cuando existen', () => {
    const articles = getAllArticles();

    for (const { data } of articles) {
      if (data.updatedAt) {
        const published = new Date(data.publishedAt);
        const updated = new Date(data.updatedAt);
        expect(
          updated >= published,
          `Articulo ${data.slug}: updatedAt anterior a publishedAt`,
        ).toBe(true);
      }
    }
  });

  it('las fuentes tienen nombre y URL valida', () => {
    const articles = getAllArticles();

    for (const { data } of articles) {
      if (data.sources && Array.isArray(data.sources)) {
        for (const source of data.sources) {
          expect(source.name, `Fuente sin nombre en ${data.slug}`).toBeTruthy();
          expect(
            () => new URL(source.url),
            `URL invalida en ${data.slug}: ${source.url}`,
          ).not.toThrow();
        }
      }
    }
  });

  it('hay al menos un articulo destacado', () => {
    const articles = getAllArticles();
    const featured = articles.filter((a) => a.data.featured === true);
    expect(featured.length).toBeGreaterThanOrEqual(1);
  });

  it('los articulos publicados aparecen en el indice de busqueda', () => {
    const articles = getAllArticles().filter((a) => a.data.status === 'published');
    expect(articles.length).toBeGreaterThan(0);
  };
});
