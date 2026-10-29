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
 * Navegación principal del header.
 *
 * El header renderiza UNA lista ordenada de entradas (`NAV_ITEMS`): el orden
 * del array es el orden en pantalla, así que la jerarquía editorial se lee en
 * un solo lugar y reordenar el header no obliga a tocar el componente.
 *
 * Los grupos son AGRUPACIONES DE NAVEGACIÓN, no secciones editoriales: no
 * tienen ruta propia ni entran en `SECTIONS`, así que no existe (ni debe
 * existir) `/secciones/comunidad/`. Los enlaces convencionales usan
 * `/secciones/<slug>/`; los hubs editoriales independientes declaran su `href`
 * explícitamente en `NAV_ITEMS`.
 *
 * ⚠️ `Actualidad` es un enlace DIRECTO aunque no sea un topic: es el feed de
 * los últimos días (`src/lib/actualidad.ts`) y conserva su URL
 * `/secciones/actualidad/`. No lleva desplegable porque no tiene subsecciones:
 * colgarla de un grupo temático sería volver a tratarla como categoría.
 */
export interface NavLink {
  readonly kind: 'link';
  /** Nombre visible del enlace. */
  readonly section: string;
  /** Ruta propia para enlaces que no pertenecen al catálogo `/secciones/*`. */
  readonly href?: string;
}

export interface NavGroup {
  readonly kind: 'group';
  readonly label: string;
  readonly sections: readonly string[];
}

export type NavItem = NavLink | NavGroup;

/**
 * Orden exacto del header. "Portada" y "Buscar" son fijos en el componente:
 * abren y cierran la navegación, así que no son entradas de este catálogo.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { kind: 'link', section: ACTUALIDAD_SECTION },
  { kind: 'group', label: 'Política y sociedad', sections: ['Política', 'Sociedad'] },
  {
    kind: 'group',
    label: 'Comunidad',
    sections: ['Seguridad', 'Servicios', 'Salud', 'Educación'],
  },
  { kind: 'group', label: 'Ciudad', sections: ['Obras públicas', 'Tránsito'] },
  { kind: 'link', section: 'Economía' },
  { kind: 'link', section: 'Deportes' },
  { kind: 'link', section: 'Olé', href: '/fuentes/ole/' },
  { kind: 'link', section: 'Internacional', href: '/internacional/' },
];

/** Grupos desplegables del header, en orden. Derivado de `NAV_ITEMS`. */
export const NAV_GROUPS: readonly NavGroup[] = NAV_ITEMS.filter(
  (item): item is NavGroup => item.kind === 'group',
);

/** Secciones con acceso directo, sin desplegable. Derivado de `NAV_ITEMS`. */
export const NAV_DIRECT: readonly string[] = NAV_ITEMS.filter(
  (item): item is NavLink => item.kind === 'link',
).map((item) => item.section);
