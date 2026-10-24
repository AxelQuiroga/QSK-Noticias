/**
 * Genera `public/search-index.json` durante el build (`prebuild`).
 *
 * El índice es la fuente única de datos de la búsqueda: la interfaz lo
 * descarga en tiempo de ejecución y aplica el matching con
 * `src/lib/search.ts`. Acá sólo se extrae y serializa información, no se
 * decide cómo se busca.
 *
 * Las funciones puras se exportan para que `tests/search-index.test.ts` pueda
 * regenerar el índice en memoria y compararlo con el archivo versionado.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { basename, join, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import matter from 'gray-matter';

export const CONTENT_DIR = 'src/content/noticias';
export const OUTPUT_FILE = 'public/search-index.json';

/**
 * Convierte el cuerpo markdown en texto plano para indexarlo: quita el código,
 * los marcadores de encabezado, listas, citas y énfasis, y deja el texto de
 * los enlaces (sin la URL). No resume ni recorta: la búsqueda por contenido
 * debe encontrar cualquier término del artículo.
 */
export function toPlainText(markdown) {
  return markdown
    .replace(/\r\n?/g, '\n')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '')
    .replace(/^[ \t]{0,3}>[ \t]?/gm, '')
    .replace(/^[ \t]{0,3}[-*+][ \t]+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|[\s(])\*([^*]+)\*/g, '$1$2')
    .replace(/\r/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Lee frontmatter (gray-matter) y cuerpo de un artículo markdown. */
function readArticle(filePath) {
  const { data, content } = matter(readFileSync(filePath, 'utf-8'));
  return { data, content };
}

/**
 * Construye el índice a partir de los artículos publicados de `contentDir`.
 * Orden determinista (fecha descendente, luego slug) para que el archivo
 * versionado no cambie sin motivo.
 */
export function buildSearchIndex(contentDir = CONTENT_DIR) {
  return readdirSync(contentDir)
    .filter((file) => extname(file) === '.md')
    .map((file) => ({ file, ...readArticle(join(contentDir, file)) }))
    .filter(({ data }) => data.status === 'published')
    .map(({ file, data, content }) => ({
      slug: data.slug || basename(file, '.md'),
      title: data.title || '',
      description: data.description || '',
      section: data.section || '',
      municipality: data.municipality || '',
      localidad: data.localidad || '',
      region: data.region || '',
      scope: data.scope || '',
      publishedAt: data.publishedAt ? new Date(data.publishedAt).toISOString() : '',
      content: toPlainText(content),
    }))
    .sort(
      (a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug),
    );
}

/** Genera y escribe el índice. Devuelve las entradas escritas. */
export function writeSearchIndex(outputFile = OUTPUT_FILE, contentDir = CONTENT_DIR) {
  const entries = buildSearchIndex(contentDir);
  writeFileSync(outputFile, `${JSON.stringify(entries, null, 2)}\n`);
  return entries;
}

const isMainModule =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  const entries = writeSearchIndex();
  console.log(`Search index generated: ${entries.length} entries -> ${OUTPUT_FILE}`);
}
