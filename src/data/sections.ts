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

/**
 * Agrupación de la navegación principal del header.
 *
 * Los grupos son AGRUPACIONES DE NAVEGACIÓN, no secciones editoriales: no
 * tienen ruta propia ni entran en `SECTIONS`, así que no existe (ni debe
 * existir) `/secciones/comunidad/`. Cada entrada referencia el NOMBRE de una
 * sección del catálogo: el slug y la ruta se derivan siempre de `SECTIONS` +
 * `slugify()`, nunca se escriben a mano acá.
 *
 * ⚠️ `Actualidad` es la excepción: es sección del catálogo y a la vez el
 * nombre de un grupo. El grupo navega a Política y Sociedad; la sección
 * `Actualidad` se alcanza desde el sidebar de la portada y desde la etiqueta
 * de cada tarjeta de noticia. Si se quisiera que el header también la enlace,
 * alcanza con sumarla a `sections` del grupo (decisión editorial pendiente).
 */
export interface NavGroup {
  readonly label: string;
  readonly sections: readonly string[];
}

/** Grupos desplegables, en el orden en que se muestran en el header. */
export const NAV_GROUPS: readonly NavGroup[] = [
  { label: 'Actualidad', sections: ['Política', 'Sociedad'] },
  { label: 'Comunidad', sections: ['Seguridad', 'Servicios', 'Salud', 'Educación'] },
  { label: 'Ciudad', sections: ['Obras públicas', 'Tránsito'] },
];

/** Secciones con acceso directo en el header, sin desplegable. */
export const NAV_DIRECT: readonly string[] = ['Economía', 'Deportes'];
