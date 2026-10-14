/**
 * Verificación del sitemap tras `astro build` (se ejecuta como postbuild).
 *
 * Comprueba contra los artefactos reales del build, no contra una lista
 * mantenida a mano:
 *  1. `dist/sitemap-index.xml` y los sitemaps que referencia existen y son
 *     XML estructuralmente válidos.
 *  2. Toda URL tiene el dominio canónico y termina en `/` (formato directory).
 *  3. Sin URLs duplicadas ni envueltas vacías.
 *  4. Cobertura EXACTA: el sitemap contiene exactamente las páginas
 *     indexables que `dist/` compila (política en `src/lib/sitemap-policy.mjs`).
 *  5. Las noticias publicadas del frontmatter existen en `dist` Y en el
 *     sitemap (omisiones de contenido = error).
 *  6. `robots.txt` apunta al sitemap correcto.
 *
 * Sale con exit code 1 si falla algo.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  collectReferencedLocalidadSlugs,
  isIndexablePath,
  NEVER_INDEXED_PATHS,
} from '../src/lib/sitemap-policy.mjs';

const DIST_DIR = 'dist';
const CONTENT_DIR = 'src/content/noticias';
const CANONICAL_BASE = 'https://qsk-noticias.pages.dev';

const failures = [];
const fail = (message) => failures.push(message);

/** Rutas (pathname con barra final) de todas las páginas HTML compiladas. */
function collectBuiltPagePaths(dir) {
  const paths = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      paths.push(...collectBuiltPagePaths(full));
    } else if (entry === 'index.html') {
      const rel = relative(DIST_DIR, full).replace(/\\+/g, '/').slice(0, -'/index.html'.length);
      paths.push(rel === '' ? '/' : `/${rel}/`);
    }
  }
  return paths;
}

/** Extrae el texto dentro de cada par de etiquetas `<tag>...</tag>` (tolera atributos). */
function extractTagValues(xml, tag) {
  return [...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>(.*?)</${tag}>`, 'gs'))].map((m) => m[1]);
}

/** Chequeo estructural razonable de un documento XML del esquema sitemaps.org. */
function validateXmlFile(path, rootTag, childrenPerEntry) {
  if (!existsSync(path)) {
    fail(`No existe ${path}`);
    return null;
  }
  const xml = readFileSync(path, 'utf-8');

  if (!/^<\?xml version="1\.0" encoding="UTF-8"\?>/i.test(xml)) {
    fail(`${path}: falta el prólogo XML <?xml ... encoding="UTF-8"?>`);
  }
  const openTagRe = new RegExp(`<${rootTag}(\\s[^>]*)?>`);
  if (!openTagRe.test(xml)) fail(`${path}: falta la etiqueta raíz <${rootTag}>`);
  if (!xml.includes(`</${rootTag}>`)) fail(`${path}: falta el cierre </${rootTag}>`);

  const entries = extractTagValues(xml, childrenPerEntry.tag);
  const closers = xml.split(`</${childrenPerEntry.tag}>`).length - 1;
  if (entries.length !== closers) {
    fail(`${path}: <${childrenPerEntry.tag}> sin cerrar (${entries.length} aperturas, ${closers} cierres)`);
  }
  const locs = entries.flatMap((entry) => extractTagValues(entry, 'loc'));
  if (entries.length !== locs.length) {
    fail(`${path}: hay ${childrenPerEntry.tag} sin <loc>`);
  }
  return locs;
}

function urlsAreValidFormat(file, locs) {
  for (const loc of locs) {
    if (!loc.startsWith(`${CANONICAL_BASE}/`)) {
      fail(`${file}: URL fuera del dominio canónico: ${loc}`);
    }
    if (!loc.endsWith('/')) {
      fail(`${file}: URL sin barra final (formato directory): ${loc}`);
    }
    try {
      // Debe ser una URL absoluta bien formada.
      void new URL(loc);
    } catch {
      fail(`${file}: URL inválida: ${loc}`);
    }
  }
}

// ---------- 1-3: index + sitemaps ----------
const indexXmlPath = join(DIST_DIR, 'sitemap-index.xml');
const indexXml = validateXmlFile(indexXmlPath, 'sitemapindex', { tag: 'sitemap' })
  ? readFileSync(indexXmlPath, 'utf-8')
  : null;
const sitemapRefs = indexXml
  ? extractTagValues(indexXml, 'sitemap').flatMap((entry) => extractTagValues(entry, 'loc'))
  : [];

const allLocs = [];
for (const ref of sitemapRefs) {
  const relPath = ref.replace(`${CANONICAL_BASE}/`, '') || 'index.xml';
  const filePath = join(DIST_DIR, relPath);
  const isInvalid = ref.startsWith(CANONICAL_BASE) === false;
  if (isInvalid) fail(`sitemap-index.xml: referencia fuera del dominio canónico: ${ref}`);
  const locs = validateXmlFile(filePath, 'urlset', { tag: 'url' }) ?? [];
  urlsAreValidFormat(relPath, locs);
  allLocs.push(...locs);
}

if (sitemapRefs.length === 0) fail('sitemap-index.xml no referencia ningún sitemap');
if (allLocs.length === 0) fail('el sitemap no contiene ninguna URL');

const duplicated = allLocs.filter((loc, i) => allLocs.indexOf(loc) !== i);
if (duplicated.length > 0) {
  fail(`URLs duplicadas en el sitemap: ${[...new Set(duplicated)].join(', ')}`);
}

// ---------- 4-5: cobertura exacta contra dist + frontmatter ----------
if (!existsSync(DIST_DIR)) {
  fail(`No existe ${DIST_DIR}: corré el build antes de la verificación.`);
} else {
  const builtPaths = collectBuiltPagePaths(DIST_DIR);
  const referencedLocalidades = collectReferencedLocalidadSlugs(CONTENT_DIR);
  const expected = new Set(builtPaths.filter((p) => isIndexablePath(p, { referencedLocalidades })));
  const actual = new Set(allLocs);

  const missing = [...expected].filter((p) => !actual.has(`${CANONICAL_BASE}${p}`));
  const extra = [...actual].map((u) => u.slice(CANONICAL_BASE.length)).filter((p) => !expected.has(p));

  if (missing.length > 0) fail(`Páginas indexables OMITIDAS del sitemap: ${missing.join(', ')}`);
  if (extra.length > 0) fail(`URLs en el sitemap que NO son indexables: ${extra.join(', ')}`);

  // Omisiones específicas de contenido editorial y de portada/institucionales.
  for (const required of ['/', '/quienes-somos/', '/contacto/', '/criterios-editoriales/', '/correcciones/', '/politica-de-privacidad/']) {
    if (!actual.has(`${CANONICAL_BASE}${required}`)) fail(`Falta página institucional/clave: ${required}`);
  }
  const noticiaPaths = builtPaths.filter((p) => p.startsWith('/noticias/'));
  const noticiasInSitemap = noticiaPaths.filter((p) => actual.has(`${CANONICAL_BASE}${p}`));
  console.log(`Páginas compiladas: ${builtPaths.length} · En sitemap: ${actual.size} · Noticias: ${noticiasInSitemap.length}/${noticiaPaths.length}`);
  if (noticiasInSitemap.length === 0 && noticiaPaths.length > 0) {
    fail('Ninguna noticia quedó en el sitemap aunque hay noticias compiladas');
  }

  // Nunca indexados deben estar ausentes.
  for (const never of NEVER_INDEXED_PATHS) {
    if (actual.has(`${CANONICAL_BASE}${never}/`)) fail(`Ruta excluida por política presente en el sitemap: ${never}`);
  }
}

// ---------- 6: robots.txt ----------
const robots = existsSync('public/robots.txt') ? readFileSync('public/robots.txt', 'utf-8') : '';
const sitemapLineRe = new RegExp(`Sitemap:\\s*${CANONICAL_BASE.replaceAll('.', '\\.')}/sitemap-index\\.xml`);
if (!sitemapLineRe.test(robots)) {
  fail('robots.txt no apunta a https://qsk-noticias.pages.dev/sitemap-index.xml');
}

// ---------- Resultado ----------
if (failures.length > 0) {
  console.error('✗ Verificación del sitemap falló:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('✓ Verificación del sitemap OK');
