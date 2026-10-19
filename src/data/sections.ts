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
 * `Actualidad` no está en esta lista y no es un topic: la URL
 * `/secciones/actualidad/` se conserva, pero dejó de ser una categoría
 * editorial y ahora muestra las noticias publicadas en los últimos días
 * (ventana temporal en `src/lib/actualidad.ts`). Sobrevive solo como
 * `section` de compatibilidad para artículos históricos (ver
 * `LEGACY_SECTIONS`). El listado completo y estable permite URLs
 * predictibles `/secciones/<topic>/` y navegación confiable.
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
 * Nombre de la sección de compatibilidad y de la página de últimos días: la
 * URL `/secciones/actualidad/` se conserva, pero ya no es una categoría
 * editorial.
 */
export const ACTUALIDAD_SECTION = 'Actualidad';

/**
 * Secciones de COMPATIBILIDAD: no son topics y no deben asignarse a artículos
 * nuevos. Existen porque su URL `/secciones/<slug>/` ya está publicada y hay
 * artículos históricos que todavía las declaran como `section`. Quitarlas del
 * catálogo rompería el schema de contenido y las URLs ya indexadas.
 *
 * `Actualidad` es la única: su página ya no lista una categoría editorial sino
 * las noticias publicadas en la ventana de 7 días (`src/lib/actualidad.ts`).
 */
export const LEGACY_SECTIONS: readonly string[] = [ACTUALIDAD_SECTION];

/** `true` si `name` es una sección de compatibilidad, no un topic asignable. */
export function isLegacySection(name: string): boolean {
  return LEGACY_SECTIONS.includes(name);
}

/**
 * Catálogo de rutas `/secciones/*`: los diez topics oficiales más las
 * secciones de compatibilidad. De acá salen las rutas estáticas del sitio y la
 * validación de `section` del schema.
 */
export const SECTIONS: readonly string[] = [...LEGACY_SECTIONS, ...TOPICS];

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
 * ⚠️ `Actualidad` da nombre al primer grupo sin ser un topic: el desplegable
 * navega a Política y Sociedad, y la página `/secciones/actualidad/` (el
 * listado de últimos días) se alcanza desde el sidebar de la portada. Si se
 * quisiera que el header también la enlace, alcanza con sumarla a `sections`
 * del grupo (decisión editorial pendiente).
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