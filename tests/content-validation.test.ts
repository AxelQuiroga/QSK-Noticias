
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import yaml from 'js-yaml';
import { newsSchema } from '../src/schemas/news';

const CONTENT_DIR = 'src/content/noticias';

interface RawArticle {
  slug?: string;
  publishedAt?: string | Date;
  updatedAt?: string | Date;
}

interface ParsedArticle {
  file: string;
  data: RawArticle;
}

function getMarkdownFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((file) => extname(file) === '.md')
    .map((file) => join(dir, file));
}

function parseFrontmatter(filePath: string): RawArticle {
  const content = readFileSync(filePath, 'utf-8');
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);

  if (!frontmatterMatch) return {};

  const rawYaml = frontmatterMatch[1] ?? '';

  try {
    return (yaml.load(rawYaml) as RawArticle | undefined) ?? {};
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);

    throw new Error(`YAML inválido en ${filePath}:\n${detail}`, {
      cause: error,
    });
  }
}

function getAllArticles(): ParsedArticle[] {
  return getMarkdownFiles(CONTENT_DIR).map((file) => ({
    file,
    data: parseFrontmatter(file),
  }));
}

function toTimestamp(value: string | Date): number {
  return value instanceof Date ? value.getTime() : Date.parse(value);
}

describe('Validación del contenido editorial', () => {
  it('existe al menos un artículo', () => {
    const articles = getAllArticles();

    expect(articles.length).toBeGreaterThan(0);
  });

  it('todos los artículos cumplen el schema de producción', () => {
    const articles = getAllArticles();

    for (const { file, data } of articles) {
      const result = newsSchema.safeParse(data);

      expect(
        result.success,
        `Schema inválido en ${file}:\n${JSON.stringify(result.error?.issues, null, 2)}`,
      ).toBe(true);
    }
  });

  it('updatedAt no es anterior a publishedAt cuando existe', () => {
    const articles = getAllArticles();

    for (const { file, data } of articles) {
      if (!data.updatedAt || !data.publishedAt) continue;

      const published = toTimestamp(data.publishedAt);
      const updated = toTimestamp(data.updatedAt);

      expect(
        updated >= published,
        `Artículo ${data.slug ?? file}: updatedAt es anterior a publishedAt`,
      ).toBe(true);
    }
  });

  describe('Reglas de internacional', () => {
    const base = {
      title: 'Noticia internacional',
      description: 'Descripción de prueba',
      slug: 'noticia-internacional',
      section: 'Política',
      author: 'Test',
      publishedAt: '2026-10-20T00:00:00.000Z',
      status: 'published',
    };

    it('scope internacional requiere country', () => {
      expect(() =>
        newsSchema.parse({
          ...base,
          scope: 'internacional',
        }),
      ).toThrow();
    });

    it('country solo se permite con scope internacional', () => {
      expect(() =>
        newsSchema.parse({
          ...base,
          country: 'BR',
        }),
      ).toThrow();
    });

    it('country debe ser un código válido', () => {
      expect(() =>
        newsSchema.parse({
          ...base,
          scope: 'internacional',
          country: 'XX',
        }),
      ).toThrow();
    });

    it('acepta una noticia internacional con país válido', () => {
      const result = newsSchema.parse({
        ...base,
        scope: 'internacional',
        country: 'BR',
      });

      expect(result.scope).toBe('internacional');
      expect(result.country).toBe('BR');
    });
  });

  describe('Reglas de section', () => {
    const validSection = 'Política';

    it('draft sin section debe pasar', () => {
      const result = newsSchema.parse({
        title: 'Draft sin section',
        description: 'Descripción de prueba',
        slug: 'draft-sin-section',
        author: 'Test',
        publishedAt: '2026-10-20T00:00:00.000Z',
        status: 'draft',
      });

      expect(result.status).toBe('draft');
      expect(result.section).toBeUndefined();
    });

    it('review sin section debe pasar', () => {
      const result = newsSchema.parse({
        title: 'Review sin section',
        description: 'Descripción de prueba',
        slug: 'review-sin-section',
        author: 'Test',
        publishedAt: '2026-10-20T00:00:00.000Z',
        status: 'review',
      });

      expect(result.status).toBe('review');
      expect(result.section).toBeUndefined();
    });

    it('published nacional sin section debe pasar', () => {
      const result = newsSchema.parse({
        title: 'Noticia nacional',
        description: 'Descripción de prueba',
        slug: 'noticia-nacional',
        scope: 'nacional',
        author: 'Argentina.gob.ar',
        publishedAt: '2026-10-20T00:00:00.000Z',
        status: 'published',
      });

      expect(result.scope).toBe('nacional');
      expect(result.section).toBeUndefined();
    });

    it('published local sin section debe fallar', () => {
      expect(() =>
        newsSchema.parse({
          title: 'Noticia local',
          description: 'Descripción de prueba',
          slug: 'noticia-local',
          scope: 'local',
          author: 'Test',
          publishedAt: '2026-10-20T00:00:00.000Z',
          status: 'published',
        }),
      ).toThrow();
    });

    it('published con section inválida debe fallar', () => {
      expect(() =>
        newsSchema.parse({
          title: 'Noticia con sección inválida',
          description: 'Descripción de prueba',
          slug: 'noticia-section-invalid',
          section: 'Sección Inexistente',
          author: 'Test',
          publishedAt: '2026-10-20T00:00:00.000Z',
          status: 'published',
        }),
      ).toThrow();
    });

    it('published con section válida debe pasar', () => {
      const result = newsSchema.parse({
        title: 'Noticia con sección válida',
        description: 'Descripción de prueba',
        slug: 'noticia-section-valid',
        section: validSection,
        author: 'Test',
        publishedAt: '2026-10-20T00:00:00.000Z',
        status: 'published',
      });

      expect(result.status).toBe('published');
      expect(result.section).toBe(validSection);
    });
  });
});
