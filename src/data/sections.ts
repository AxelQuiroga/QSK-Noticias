/**
 * Topics editoriales del portal: taxonomía de temas FIJA.
 *
 * Los artículos pueden tener un `primaryTopic` requerido y cero o más
 * `secondaryTopics`. Un artículo sobre cortes de tráfico por obras
 * municipales podría tener `primaryTopic: 'Obras públicas'` y
 * `secondaryTopic: 'Tránsito'`.
 *
 * Geografía siempre es independiente: `municipality`, `localidad`, `region`
 * siguen siendo los campos para expresar DÓNDE ocurre la noticia, no el topic.
 *
 * ⚠️ Si un `primaryTopic` o `secondaryTopic` no figura en esta lista, el
 * schema de contenido rompe el build. Es responsabilidad del editor elegir
 * entre los topics catalogados.
 *
 * `Actualidad` fue removido de la taxonomía de topics: ya no es un tema de
 * artículo. Se usa únicamente para artículos antiguos que aún no fueron
 * migrados (ver migración abajo). El listado completo y estable permite
 * URLs predictibles `/secciones/<topic>/` y navegación confiable.
 */
export const TOPICS: readonly string[] = [
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
 * `true` si `name` es un topic del catálogo editorial. Lo usa el schema de
 * contenido para validar los nuevos campos `primaryTopic` y
 * `secondaryTopic`.
 */
export function isKnownTopic(name: string): boolean {
  return TOPICS.includes(name);
}

/**
 * Secciones del catálogo editorial MANTENIDAS para compatibilidad con
 * artículos existentes durante la migración. `Actualidad` figura aquí solo
 * como sección de transición; los artículos nuevos deben usar `primaryTopic`.
 *
 * Nota: este catálogo se usa para la navegación `/secciones/*` y la validación
 * de rutas. No representa la clasificación temática de los artículos en el
 * nuevo modelo.
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
 * enlaces rotos en el sitio (compatibilidad con artículos no migrados).
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