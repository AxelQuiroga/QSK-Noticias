import { createHash } from 'node:crypto';
import nationalData from '../data/nacional.json' with { type: 'json' };
import { slugify } from './utils';

export interface NationalImage {
  src: string;
  alt: string | null;
}

export interface NationalRecord {
  title: string | null;
  description: string | null;
  content: string | null;
  publishedAt: string | null;
  url: string;
  image: NationalImage | null;
}

export interface NationalArticle extends NationalRecord {
  slug: string;
  scope: 'nacional';
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function isArgentinaSourceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') &&
      (url.hostname === 'argentina.gob.ar' || url.hostname.endsWith('.argentina.gob.ar'));
  } catch {
    return false;
  }
}

/**
 * Comprueba únicamente la estructura técnica mínima necesaria para renderizar.
 * La selección y validación editorial pertenecen a Extracción Ultimate.
 */
function assertNationalRecord(record: NationalRecord): void {
  if (typeof record.title !== 'string' || record.title.trim().length === 0) {
    throw new Error('La noticia nacional debe tener un título no vacío.');
  }
  if (typeof record.url !== 'string' || !isArgentinaSourceUrl(record.url)) {
    throw new Error('La noticia nacional debe tener una URL original válida de Argentina.gob.ar.');
  }

  for (const field of ['description', 'content'] as const) {
    const value = record[field];
    if (value !== null && typeof value !== 'string') {
      throw new Error(`El campo ${field} debe ser texto o null.`);
    }
  }

  if (record.publishedAt !== null) {
    if (
      typeof record.publishedAt !== 'string' ||
      Number.isNaN(Date.parse(record.publishedAt))
    ) {
      throw new Error('La fecha de publicación debe ser una fecha válida o null.');
    }
  }

  if (record.image !== null) {
    if (
      !record.image ||
      typeof record.image.src !== 'string' ||
      !isHttpUrl(record.image.src) ||
      (record.image.alt !== null && typeof record.image.alt !== 'string')
    ) {
      throw new Error('La imagen debe tener una URL remota HTTP(S) y un alt de texto o null.');
    }
  }
}

/**
 * Une una entrega incremental al historial. La primera versión de cada URL
 * prevalece: una entrega repetida nunca reemplaza un registro existente.
 */
export function mergeNationalArticles(
  existing: readonly NationalRecord[],
  incoming: readonly NationalRecord[],
): NationalRecord[] {
  const merged: NationalRecord[] = [];
  const seenUrls = new Set<string>();

  for (const record of [...existing, ...incoming]) {
    assertNationalRecord(record);
    if (seenUrls.has(record.url)) continue;
    seenUrls.add(record.url);
    merged.push(record);
  }

  return merged;
}

/** Slug determinista: el hash de la URL distingue titulares iguales. */
export function createNationalSlug(record: NationalRecord): string {
  const titleSlug = slugify(record.title ?? '') || 'noticia';
  const urlHash = createHash('sha256').update(record.url).digest('hex').slice(0, 8);
  return `${titleSlug}-${urlHash}`;
}

/** Fecha descendente; sin fecha al final; slug como desempate estable. */
export function sortNationalArticles<T extends NationalRecord>(articles: readonly T[]): T[] {
  return [...articles].sort((a, b) => {
    const dateA = a.publishedAt ? Date.parse(a.publishedAt) : Number.NEGATIVE_INFINITY;
    const dateB = b.publishedAt ? Date.parse(b.publishedAt) : Number.NEGATIVE_INFINITY;
    if (dateA !== dateB) return dateB - dateA;
    return createNationalSlug(a).localeCompare(createNationalSlug(b));
  });
}

/** Asigna el alcance por procedencia y proyecta solo los campos del contrato. */
export function toNationalArticle(record: NationalRecord): NationalArticle {
  assertNationalRecord(record);
  return {
    title: record.title,
    description: record.description,
    content: record.content,
    publishedAt: record.publishedAt,
    url: record.url,
    image: record.image,
    slug: createNationalSlug(record),
    scope: 'nacional',
  };
}

/** Dataset acumulado servido exclusivamente por el hub Nacional. */
export function getNationalArticles(): NationalArticle[] {
  const records = mergeNationalArticles([], nationalData as NationalRecord[]);
  return sortNationalArticles(records).map(toNationalArticle);
}

export function getNationalArticleBySlug(slug: string): NationalArticle | undefined {
  return getNationalArticles().find((article) => article.slug === slug);
}


/** Selecciona las noticias mas recientes que caben en el carrusel de portada. */
export function selectNationalCarouselArticles<T extends NationalRecord>(
  articles: readonly T[],
  limit = 6,
): T[] {
  if (!Number.isInteger(limit) || limit <= 0) return [];
  return sortNationalArticles(articles).slice(0, limit);
}
