/**
 * Política de indexabilidad del sitemap de QSK Noticias.
 *
 * Fuente única de verdad compartida por tres contextos:
 * - `astro.config.mjs`  → filtro de la integración `@astrojs/sitemap`.
 * - `scripts/verify-sitemap.mjs` (postbuild) → verificación de cobertura.
 * - `tests/sitemap-policy.test.ts` → unit tests.
 *
 * Está en `.mjs` (no en `.ts`) para ser importable por Node plano (`scripts/`)
 * sin transpilación. Por la misma razón incluye `slugifyLite`, una copia
 * local de `slugify()` de `src/lib/utils.ts`; el test
 * `tests/sitemap-policy.test.ts` verifica que ambas produzcan el mismo slug
 * para todo el catálogo editorial, así que la copia no puede divergir en
 * silencio.
 *
 * Política:
 * - Nunca se indexan rutas de utilidad (`/404`, búsqueda interna).
 * - Las páginas de localidad se indexan recién cuando algún artículo
 *   publicado las referencie mediante el campo opcional `localidad`
 *   (nombre oficial) del frontmatter. Hoy el schema de contenido no tiene
 *   ese campo, así que localidades sin etiquetar quedan fuera (thin
 *   content). Cuando se sume el campo, el sitemap se corrige solo.
 * - Todo el resto de las rutas compiladas es indexable.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import matter from 'gray-matter';

/** Rutas que nunca deben aparecer en el sitemap (sin barra final). */
export const NEVER_INDEXED_PATHS = ['/404', '/buscar'];

/**
 * Copia local de `slugify()` de `src/lib/utils.ts`. Mantener sincronizada;
 * el test unitario la comparará contra la original.
 */
export function slugifyLite(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '');
}

/**
 * Escanea el frontmatter de la colección `contentDir` y devuelve el set de
 * slugs de localidades referenciadas por algún artículo publicado.
 *
 * El artículo declara la localidad con su nombre oficial en el campo
 * opcional `localidad` (ej.: `localidad: 'Banfield'`); el slug se deriva
 * igual que las rutas del sitio (slugify del nombre).
 */
export function collectReferencedLocalidadSlugs(contentDir) {
  const slugs = new Set();
  for (const file of readdirSync(contentDir).filter((f) => extname(f) === '.md')) {
    const { data } = matter(readFileSync(join(contentDir, file), 'utf-8'));
    const localidad = data?.localidad;
    if (data?.status !== 'published') continue;
    if (typeof localidad === 'string' && localidad.trim() !== '') {
      slugs.add(slugifyLite(localidad.trim()));
    }
  }
  return slugs;
}

/**
 * Decide si una ruta (pathname con o sin barra final) debe estar en el
 * sitemap. El contexto puede omitirse; `referencedLocalidades` vacío
 * significa "todavía no hay localidades etiquetadas en el contenido".
 */
export function isIndexablePath(pathname, context = {}) {
  const cleaned = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  const matchesNeverIndexed = NEVER_INDEXED_PATHS.some(
    (prefix) => cleaned === prefix || cleaned.startsWith(`${prefix}/`),
  );
  if (matchesNeverIndexed) return false;
  if (cleaned.startsWith('/localidades/')) {
    const slug = cleaned.split('/')[2] ?? '';
    return (context.referencedLocalidades ?? new Set()).has(slug);
  }
  return true;
}
