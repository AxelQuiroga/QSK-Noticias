import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import yaml from 'js-yaml';
import { findLocationByNameAndType, type LocationType } from '../src/data/locations';
import { SECTIONS, isKnownSection, isKnownTopic } from '../src/data/sections';
import { COUNTRY_CODES } from '../src/lib/international';
import { z } from 'astro/zod';

const CONTENT_DIR = 'src/content/noticias';
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VALID_STATUSES = ['draft', 'review', 'published'];
const VALID_SCOPES = ['local', 'regional', 'provincial', 'nacional', 'internacional'];

// Definir el schema Zod igual que en content.config.ts
const newsSchema = z
  .object({
    title: z.string().min(1, 'El titular es obligatorio'),
    description: z.string().min(1, 'La bajada es obligatoria'),
    slug: z
      .string()
      .min(1, 'El slug es obligatorio')
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'El slug debe ser URL-friendly'),
    primaryTopic: z.string().optional(),
    secondaryTopics: z
      .array(z.string())
      .optional()
      .default([])
      .refine((topics) => topics.length === 0 || topics.every(isKnownTopic), {
        message: 'Los topics secundarios deben ser topics del catálogo editorial.',
      }),
    section: z.string().min(1, 'La sección es obligatoria').optional(),
    municipality: z.string().optional(),
    localidad: z.string().optional(),
    region: z.string().optional(),
    country: z.string().refine((code) => Object.hasOwn(COUNTRY_CODES, code), 'Código de país desconocido').optional(),
    scope: z.enum(['local', 'regional', 'provincial', 'nacional', 'internacional']).optional(),
    author: z.string().min(1, 'El autor es obligatorio'),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    status: z.enum(['draft', 'review', 'published']),
    featured: z.boolean().default(false),
    sources: z
      .array(
        z.object({
          name: z.string().min(1),
          url: z.url(),
          description: z.string().optional(),
        }),
      )
      .default([]),
    image: z
      .object({
        src: z
          .string()
          .trim()
          .min(1, 'La ruta de la imagen es obligatoria')
          .refine(() => true, 'Ruta no válida')
          .refine(() => true, 'El archivo debe existir'),
        alt: z.string().trim().min(1, 'El alt text es obligatorio'),
        attribution: z.string().optional(),
      })
      .optional(),
    gallery: z
      .array(
        z.object({
          src: z
            .string()
            .trim()
            .min(1, 'La ruta de la imagen es obligatoria')
            .refine(() => true, 'Ruta no válida')
            .refine(() => true, 'El archivo debe existir'),
          alt: z.string().trim().min(1, 'El alt text es obligatorio'),
          attribution: z.string().optional(),
        }),
      )
      .optional()
      .default([]),
  })
  .superRefine((data, ctx) => {
    // Validate primaryTopic is a known topic (if present)
    if (data.primaryTopic && !isKnownTopic(data.primaryTopic)) {
      ctx.addIssue({
        code: 'custom',
        path: ['primaryTopic'],
        message: `"${data.primaryTopic}" no es un topic del catálogo editorial (src/data/sections.ts).`,
      });
    }

    // Validate secondaryTopics are known topics and don't duplicate primaryTopic
    if (data.secondaryTopics && data.secondaryTopics.length > 0) {
      if (!data.secondaryTopics.every(isKnownTopic)) {
        ctx.addIssue({
          code: 'custom',
          path: ['secondaryTopics'],
          message: 'Los topics secundarios deben ser topics del catálogo editorial.',
        });
      }
      // Check that secondary topics don't duplicate the primary topic
      const primaryTopicIsInSecondaries = data.secondaryTopics?.includes(data.primaryTopic as string);
      if (primaryTopicIsInSecondaries) {
        ctx.addIssue({
          code: 'custom',
          path: ['secondaryTopics'],
          message: 'Un topic no puede ser tanto primary como secondary. Elige uno como primary y los otros como secundarios.',
        });
      }
    }

    if (data.scope === 'internacional' && !data.country) {
      ctx.addIssue({
        code: 'custom',
        path: ['country'],
        message: 'Las noticias de alcance internacional deben indicar el país principal (country).',
      });
    }
    if (data.country && data.scope !== 'internacional') {
      ctx.addIssue({
        code: 'custom',
        path: ['scope'],
        message: 'El campo country solo puede usarse con scope: internacional.',
      });
    }

    // Validate section is required for published articles
    if (data.status === 'published' && !data.section) {
      ctx.addIssue({
        code: 'custom',
        path: ['section'],
        message: 'La sección es obligatoria para artículos publicados.',
      });
    }

    // Validate section against known sections (for backward compatibility during migration)
    if (data.section && !isKnownSection(data.section)) {
      ctx.addIssue({
        code: 'custom',
        path: ['section'],
        message: `"${data.section}" no es una sección del catálogo editorial (src/data/sections.ts).`,
      });
    }

    for (const { field, type } of [
      { field: 'municipality' as const, type: 'municipio' as const },
      { field: 'localidad' as const, type: 'localidad' as const },
      { field: 'region' as const, type: 'region' as const },
    ]) {
      const value = data[field];
      if (value === undefined) continue;
      if (!findLocationByNameAndType(value, type)) {
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: `"${value}" no es un ${type} del catálogo de ubicaciones (src/data/locations.ts).`,
        });
      }
    }
  });

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
  localidad?: string;
  region?: string;
  scope?: string;
  country?: string;
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

  it('las noticias internacionales requieren un país válido y un alcance coherente', () => {
    const base = {
      title: 'Noticia internacional',
      description: 'Descripción de prueba',
      slug: 'noticia-internacional',
      section: 'Política',
      author: 'Test',
      publishedAt: '2026-10-20T00:00:00.000Z',
      status: 'published',
    };

    expect(() => newsSchema.parse({ ...base, scope: 'internacional' })).toThrow();
    expect(() => newsSchema.parse({ ...base, country: 'BR' })).toThrow();

    const valid = newsSchema.parse({ ...base, scope: 'internacional', country: 'BR' });
    expect(valid.scope).toBe('internacional');
    expect(valid.country).toBe('BR');
  });

  it('el alcance geográfico es válido cuando está presente', () => {
    for (const { data } of getAllArticles()) {
      if (data.scope === undefined) continue;
      expect(VALID_SCOPES, `Scope inválido en ${data.slug}: ${data.scope}`).toContain(data.scope);
    }
  });

  it('municipio, localidad y región son textos no vacíos cuando están presentes', () => {
    for (const { data } of getAllArticles()) {
      const locations: Record<string, string | undefined> = {
        municipality: data.municipality,
        localidad: data.localidad,
        region: data.region,
      };
      for (const [field, value] of Object.entries(locations)) {
        if (value === undefined) continue;
        expect(typeof value, `${field} no es texto en ${data.slug}`).toBe('string');
        expect(value.trim(), `${field} vacío en ${data.slug}`).not.toBe('');
      }
    }
  });

  it('las ubicaciones declaradas existen en el catálogo con el tipo correcto', () => {
    const fields: ReadonlyArray<{ field: keyof RawArticle; type: LocationType }> = [
      { field: 'municipality', type: 'municipio' },
      { field: 'localidad', type: 'localidad' },
      { field: 'region', type: 'region' },
    ];

    for (const { file, data } of getAllArticles()) {
      for (const { field, type } of fields) {
        const value = data[field];
        if (typeof value !== 'string') continue;
        expect(
          findLocationByNameAndType(value, type),
          `"${value}" en ${field} no es un ${type} del catálogo (${data.slug ?? file})`,
        ).toBeDefined();
      }
    }
  });

  it('las secciones declaradas existen en el catálogo editorial', () => {
    for (const { file, data } of getAllArticles()) {
      if (typeof data.section !== 'string') continue;
      expect(
        SECTIONS,
        `"${data.section}" en section no es una sección del catálogo (${data.slug ?? file})`,
      ).toContain(data.section);
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

  // Tests para la validación de 'section' solo para artículos publicados
  describe('Validation - section mandatory for published articles', () => {
    const validSection = isKnownSection('Actualidad') ? 'Actualidad' : SECTIONS[0]; // Usar una sección válida del catálogo

    it('draft sin section debe pasar', () => {
      const result = newsSchema.parse({
        title: 'Draft sin section',
        description: 'Descripción de prueba',
        slug: 'draft-sin-section',
        section: undefined,
        author: 'Test',
        publishedAt: '2026-10-20T00:00:00.000Z',
        status: 'draft',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('draft');
      expect(result.section).toBeUndefined();
    });

    it('review sin section debe pasar', () => {
      const result = newsSchema.parse({
        title: 'Review sin section',
        description: 'Descripción de prueba',
        slug: 'review-sin-section',
        section: undefined,
        author: 'Test',
        publishedAt: '2026-10-20T00:00:00.000Z',
        status: 'review',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('review');
      expect(result.section).toBeUndefined();
    });

    it('published sin section debe fallar', () => {
      expect(() =>
        newsSchema.parse({
          title: 'Published sin section',
          description: 'Descripción de prueba',
          slug: 'published-sin-section',
          section: undefined,
          author: 'Test',
          publishedAt: '2026-10-20T00:00:00.000Z',
          status: 'published',
        })
      ).toThrow();
    });

    it('published con section inválida debe fallar', () => {
      expect(() =>
        newsSchema.parse({
          title: 'Published con section inválida',
          description: 'Descripción de prueba',
          slug: 'published-section-invalid',
          section: 'Sección Inexistente',
          author: 'Test',
          publishedAt: '2026-10-20T00:00:00.000Z',
          status: 'published',
        })
      ).toThrow();
    });

    it('published con section válida debe pasar', () => {
      const result = newsSchema.parse({
        title: 'Published con section válida',
        description: 'Descripción de prueba',
        slug: 'published-section-valid',
        section: validSection,
        author: 'Test',
        publishedAt: '2026-10-20T00:00:00.000Z',
        status: 'published',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('published');
      expect(result.section).toBe(validSection);
    });
  });
});
