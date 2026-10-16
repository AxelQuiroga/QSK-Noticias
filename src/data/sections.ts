/**
 * Secciones temáticas del portal: taxonomía editorial FIJA.
 *
 * Es la fuente de verdad para el nav, el sidebar y las rutas `/secciones/*`.
 * No se deriva de los artículos, así que aparece completa desde el día 1
 * (aunque todavía no haya nada publicado en alguna de ellas).
 *
 * ⚠️ Si se agrega una sección nueva, hay que sumarla acá: un artículo cuyo
 * `section` no figure en esta lista enlazaría a una ruta inexistente. El
 * schema de contenido valida el campo contra este catálogo, así que un valor
 * desconocido rompe el build (ver `src/content.config.ts`).
 *
 * Criterios de las secciones incorporadas para clasificar noticias locales:
 * - Política  → decisiones de gobiernos municipales, concejos deliberantes,
 *               elecciones, legislación y gestión política.
 * - Servicios → agua, electricidad, gas, transporte, cortes programados,
 *               baja presión y funcionamiento de servicios públicos.
 * - Seguridad → hechos policiales, investigaciones y prevención del delito.
 * - Sociedad  → reclamos vecinales, organizaciones comunitarias, actividades
 *               e historias de interés local.
 *
 * Orden: `Actualidad` primero (catch-all) y el resto alfabético. La sección
 * representa el TEMA de la noticia; DÓNDE ocurre se expresa con los campos
 * geográficos del frontmatter (`municipality`, `localidad`, `region`), no con
 * una sección por localidad.
 */
export const SECTIONS: readonly string[] = [
  'Actualidad',
  'Deportes',
  'Economía',
  'Educación',
  'Obras públicas',
  'Política',
  'Salud',
  'Seguridad',
  'Servicios',
  'Sociedad',
  'Tránsito',
];

/**
 * `true` si `name` es una sección del catálogo editorial. Lo usa el schema de
 * contenido para rechazar categorías inexistentes antes de que generen
 * enlaces rotos en el sitio.
 */
export function isKnownSection(name: string): boolean {
  return SECTIONS.includes(name);
}
