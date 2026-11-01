import { findLocationByName, getLocationContext, getAncestorOfType } from '../data/locations';
import { getCountryName } from './international';

/**
 * Búsqueda textual y geográfica del sitio: UNA sola implementación, compartida
 * por la interfaz (`src/pages/buscar.astro`) y por los tests unitarios.
 *
 * Estrategia única:
 * 1. `scripts/generate-search.mjs` serializa en build `public/search-index.json`
 *    con el frontmatter publicado y el cuerpo del artículo en texto plano.
 * 2. La interfaz descarga ese índice y lo convierte en `SearchDocument` con
 *    `buildSearchDocument`, resolviendo las ubicaciones contra el catálogo.
 * 3. `searchDocuments` aplica el matching (tolerante a mayúsculas y tildes,
 *    AND por término) y ordena por relevancia.
 *
 * No hay reglas de búsqueda duplicadas en ningún otro archivo.
 */

/** Entrada tal como se serializa en `public/search-index.json` (build). */
export interface SearchIndexEntry {
  slug: string;
  title: string;
  description: string;
  section: string;
  municipality: string;
  localidad: string;
  region: string;
  scope: string;
  publishedAt: string;
  /** Clasificación editorial. Opcionales para tolerar índices anteriores. */
  primaryTopic?: string;
  secondaryTopics?: string[];
  /** Código ISO 3166-1 alpha-2 del país, si corresponde. */
  country?: string;
  /** Cuerpo del artículo sin markdown. Puede venir vacío. */
  content: string;
}

/** Ubicación de un documento, resuelta contra el catálogo geográfico. */
export interface DocumentLocation {
  municipality: string;
  localidad: string;
  /** Regiones editoriales resueltas del catálogo (Zona Sur, AMBA). */
  regions: string[];
  /** Provincia de la cadena administrativa del municipio/localidad. */
  provincia: string;
  /** País de la cadena administrativa del municipio/localidad. */
  pais: string;
}

/** Documento listo para buscar: campos normalizados con su peso. */
export interface SearchDocument {
  slug: string;
  title: string;
  description: string;
  section: string;
  location: DocumentLocation;
  publishedAt: string;
  /** Campos sobre los que se evalúa la consulta. */
  fields: ReadonlyArray<{ text: string; weight: number }>;
}

/** Peso relativo de cada campo: el título pesa más que el cuerpo. */
export const FIELD_WEIGHTS = {
  title: 5,
  location: 4,
  primaryTopic: 4,
  country: 4,
  section: 3,
  secondaryTopics: 2,
  description: 2,
  content: 1,
} as const;

/**
 * Palabras vacías del español que no aportan a la consulta. Permiten que
 * `transporte en Lanús` se evalúe como `transporte` AND `lanus` sin exigir
 * que el texto contenga literalmente el "en".
 */
const STOPWORDS = new Set([
  'a',
  'al',
  'como',
  'con',
  'de',
  'del',
  'el',
  'en',
  'es',
  'la',
  'las',
  'los',
  'mas',
  'o',
  'para',
  'por',
  'que',
  'sin',
  'sobre',
  'su',
  'sus',
  'un',
  'una',
  'unas',
  'unos',
  'y',
]);

/**
 * Normaliza texto para comparar: minúsculas, sin acentos y con la puntuación
 * reducida a espacios. `Lanús` y `Lanus` producen la misma cadena.
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Términos significativos de una consulta, sin palabras vacías ni repetidos. */
export function tokenizeQuery(query: string): string[] {
  return [
    ...new Set(
      normalizeText(query)
        .split(' ')
        .filter((token) => token !== '' && !STOPWORDS.has(token)),
    ),
  ];
}

/** ¿`text` contiene todos los términos significativos de `query`? */
export function matchesQuery(text: string, query: string): boolean {
  const terms = tokenizeQuery(query);
  if (terms.length === 0) return false;
  const haystack = normalizeText(text);
  return terms.every((term) => haystack.includes(term));
}

const uniqueNonEmpty = (values: ReadonlyArray<string | undefined>): string[] => {
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim() ?? '';
    if (trimmed !== '' && !result.includes(trimmed)) result.push(trimmed);
  }
  return result;
};

const provinciaOf = (entry: SearchIndexEntry): string => {
  for (const name of [entry.municipality, entry.localidad]) {
    if (!name) continue;
    const location = findLocationByName(name);
    if (!location) continue;
    const provincia = getAncestorOfType(location, 'provincia');
    if (provincia) return provincia.name;
  }
  return '';
};

const paisOf = (entry: SearchIndexEntry): string => {
  for (const name of [entry.municipality, entry.localidad]) {
    if (!name) continue;
    const location = findLocationByName(name);
    if (!location) continue;
    const pais = getAncestorOfType(location, 'pais');
    if (pais) return pais.name;
  }
  return '';
};

/**
 * Convierte una entrada del índice en un documento buscable, resolviendo
 * municipio, localidad, regiones, provincia y país contra el catálogo.
 *
 * Los valores que no pertenecen al catálogo no se inventan: se conservan tal
 * como vienen (para no perder información) pero no aportan jerarquía.
 */
export function buildSearchDocument(entry: SearchIndexEntry): SearchDocument {
  const municipalityContext = entry.municipality ? getLocationContext(entry.municipality) : undefined;
  const localidadContext = entry.localidad ? getLocationContext(entry.localidad) : undefined;

  const regionNames = uniqueNonEmpty([
    entry.region,
    ...(municipalityContext?.regions ?? []).map((region) => region.name),
  ]).sort((a, b) => a.localeCompare(b, 'es'));

  const locationNames = uniqueNonEmpty([
    entry.municipality,
    entry.localidad,
    ...(municipalityContext?.names ?? []),
    ...(localidadContext?.names ?? []),
    ...regionNames,
  ]);

  const countryCode = entry.country?.trim().toUpperCase() ?? '';
  const countryName = countryCode ? getCountryName(countryCode) ?? countryCode : '';

  return {
    slug: entry.slug,
    title: entry.title,
    description: entry.description,
    section: entry.section,
    location: {
      municipality: entry.municipality.trim(),
      localidad: entry.localidad.trim(),
      regions: regionNames,
      provincia: provinciaOf(entry),
      pais: paisOf(entry),
    },
    publishedAt: entry.publishedAt,
    fields: [
      { text: entry.title, weight: FIELD_WEIGHTS.title },
      { text: locationNames.join(' '), weight: FIELD_WEIGHTS.location },
      { text: entry.primaryTopic ?? '', weight: FIELD_WEIGHTS.primaryTopic },
      { text: (entry.secondaryTopics ?? []).join(' '), weight: FIELD_WEIGHTS.secondaryTopics },
      { text: [countryCode, countryName].filter(Boolean).join(' '), weight: FIELD_WEIGHTS.country },
      { text: entry.section, weight: FIELD_WEIGHTS.section },
      { text: entry.description, weight: FIELD_WEIGHTS.description },
      { text: entry.content, weight: FIELD_WEIGHTS.content },
    ]
      .map((field) => ({ text: normalizeText(field.text), weight: field.weight }))
      .filter((field) => field.text !== ''),
  };
}

export function buildSearchDocuments(entries: readonly SearchIndexEntry[]): SearchDocument[] {
  return entries.map(buildSearchDocument);
}

/** Puntaje de un documento para los términos dados; `-1` si no coincide con todos. */
function scoreDocument(document: SearchDocument, terms: readonly string[]): number {
  let score = 0;
  for (const term of terms) {
    let best = 0;
    for (const field of document.fields) {
      if (field.weight > best && field.text.includes(term)) best = field.weight;
    }
    if (best === 0) return -1;
    score += best;
  }
  return score;
}

/**
 * Busca en los documentos: todos los términos deben aparecer (AND lógico),
 * sin distinguir mayúsculas ni tildes. Ordena por relevancia y, a igualdad,
 * por fecha de publicación descendente y slug.
 */
export function searchDocuments(
  documents: readonly SearchDocument[],
  query: string,
): SearchDocument[] {
  const terms = tokenizeQuery(query);
  if (terms.length === 0) return [];

  return documents
    .map((document) => ({ document, score: scoreDocument(document, terms) }))
    .filter((scored) => scored.score >= 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.document.publishedAt.localeCompare(a.document.publishedAt) ||
        a.document.slug.localeCompare(b.document.slug),
    )
    .map((scored) => scored.document);
}

/**
 * Filtra artículos por municipio (el valor del frontmatter, que guarda el
 * partido). Sin municipio seleccionado devuelve la lista completa.
 */
export function filterByMunicipality<T extends { data: { municipality?: string } }>(
  articles: T[],
  municipality: string | null,
): T[] {
  if (!municipality) return articles;
  return articles.filter((article) => article.data.municipality === municipality);
}
