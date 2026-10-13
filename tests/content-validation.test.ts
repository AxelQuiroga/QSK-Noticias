import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import yaml from 'js-yaml';

const CONTENT_DIR = 'src/content/noticias';
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VALID_STATUSES = ['draft', 'review', 'published'];
const VALID_SCOPES = ['local', 'regional', 'provincial', 'nacional'];

interface RawSource {
  name?: string;
  url?: string;
  description?: string;
}

interface RawArticle {
  title?: string;
  description?: string;
  slug?: string;
  section?: string;
  municipality?: string;
  region?: string;
  scope?: string;
  author?: string;
  publishedAt?: string;
  updatedAt?: string;
  status?: string;
  featured?: boolean;
  sources?: RawSource[];
}

interface ParsedArticle {
  file: string;
  data: RawArticle;
}

function getMarkdownFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => extname(f) === '.md')
    .map((f) => join(dir, f));
}

function parseFrontmatter(filePath: string): RawArticle {
  const content = readFileSync(filePath, 'utf-8');
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!frontmatterMatch) return {};

  const rawYaml = frontmatterMatch[1] ?? '';
  try {
    return (yaml.load(rawYaml) as RawArticle | undefined) ?? {};
  } catch {
    return {};
  }
}

function getAllArticles(): ParsedArticle[] {
  return getMarkdownFiles(CONTENT_DIR).map((file) => ({
    file,
    data: parseFrontmatter(file),
  }));
}

describe('Content validation - artículos', () => {
  it('todos los artículos tienen campos obligatorios', () => {
    const articles = getAllArticles();
    expect(articles.length).toBeGreaterThan(0);

    for (const { file, data } of articles) {
      expect(data.title, `Artículo sin título: ${data.slug ?? file}`).toBeTruthy();
      expect(data.description, `Artículo sin descripción: ${data.slug ?? file}`).toBeTruthy();
      expect(data.slug, `Artículo sin slug en ${file}`).toBeTruthy();
      expect(data.section, `Artículo sin sección: ${data.slug ?? file}`).toBeTruthy();
      expect(data.author, `Artículo sin autor: ${data.slug ?? file}`).toBeTruthy();
      expect(data.publishedAt, `Artículo sin fecha: ${data.slug ?? file}`).toBeTruthy();
    }
  });

  it('el slug es URL-friendly', () => {
    for (const { data } of getAllArticles()) {
      expect(data.slug, `Slug inválido: ${data.slug}`).toMatch(SLUG_REGEX);
    }
  });

  it('los estados editoriales son válidos', () => {
    for (const { data } of getAllArticles()) {
      const status = data.status;
      expect(status, `Artículo sin estado: ${data.slug}`).toBeTruthy();
      if (typeof status !== 'string') continue;
      expect(VALID_STATUSES, `Estado inválido en ${data.slug}: ${status}`).toContain(status);
    }
  });

  it('el alcance geográfico es válido cuando está presente', () => {
    for (const { data } of getAllArticles()) {
      if (data.scope === undefined) continue;
      expect(VALID_SCOPES, `Scope inválido en ${data.slug}: ${data.scope}`).toContain(data.scope);
    }
  });

  it('municipio y región son textos no vacíos cuando están presentes', () => {
    for (const { data } of getAllArticles()) {
      const locations: Record<string, string | undefined> = {
        municipality: data.municipality,
        region: data.region,
      };
      for (const [field, value] of Object.entries(locations)) {
        if (value === undefined) continue;
        expect(typeof value, `${field} no es texto en ${data.slug}`).toBe('string');
        expect(value.trim(), `${field} vacío en ${data.slug}`).not.toBe('');
      }
    }
  });

  it('las fechas de publicación son válidas', () => {
    for (const { data } of getAllArticles()) {
      const published = new Date(data.publishedAt ?? '');
      expect(
        Number.isNaN(published.getTime()),
        `Fecha inválida en ${data.slug}: ${data.publishedAt}`,
      ).toBe(false);
    }
  });

  it('las fechas de actualización son posteriores a la publicación cuando existen', () => {
    for (const { data } of getAllArticles()) {
      if (!data.updatedAt) continue;
      const published = new Date(data.publishedAt ?? '');
      const updated = new Date(data.updatedAt);
      expect(
        updated >= published,
        `Artículo ${data.slug}: updatedAt anterior a publishedAt`,
      ).toBe(true);
    }
  });

  it('las fuentes tienen nombre y URL válida', () => {
    for (const { data } of getAllArticles()) {
      if (!Array.isArray(data.sources)) continue;
      for (const source of data.sources) {
        expect(source.name, `Fuente sin nombre en ${data.slug}`).toBeTruthy();
        const url = source.url ?? '';
        expect(
          () => new URL(url),
          `URL inválida en ${data.slug}: ${source.url}`,
        ).not.toThrow();
      }
    }
  });

  it('el flag featured es booleano cuando está presente', () => {
    for (const { data } of getAllArticles()) {
      if (data.featured === undefined) continue;
      expect(typeof data.featured, `featured no es booleano en ${data.slug}`).toBe('boolean');
    }
  });
});
