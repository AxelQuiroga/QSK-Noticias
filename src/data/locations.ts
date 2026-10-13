import { slugify } from '../lib/utils';

/**
 * Catálogo de ubicaciones, INDEPENDIENTE de los artículos.
 *
 * Modelo geográfico adoptado (frontmatter):
 * - `region`    -> agrupación amplia (AMBA, Zona Sur).
 * - `municipio` -> partido del conurbano (Lomas de Zamora, Quilmes, Lanús).
 * - `localidad` -> ciudad/barrio dentro de un partido (Banfield, Ezpeleta).
 *
 * El campo `municipality` del frontmatter guarda el PARTIDO, no la localidad.
 * Las relaciones territoriales se expresan con `parentId`
 * (localidad -> municipio -> region).
 *
 * Una ubicación puede NO tener artículos publicados: el catálogo es la fuente
 * de verdad para la navegación y las rutas, no el contenido.
 */
export type LocationType = 'region' | 'municipio' | 'localidad';

export interface Location {
  /** Identificador estable. Nunca se deriva del nombre visible. */
  id: string;
  /** Nombre oficial que se muestra al lector. */
  name: string;
  /** Tipo de ubicación. */
  type: LocationType;
  /** Ubicación que la contiene (localidad -> municipio -> region). */
  parentId?: string;
}

export const LOCATIONS: readonly Location[] = [
  { id: 'region-zona-sur', name: 'Zona Sur', type: 'region' },
  { id: 'region-amba', name: 'AMBA', type: 'region' },
  {
    id: 'municipio-lomas-de-zamora',
    name: 'Lomas de Zamora',
    type: 'municipio',
    parentId: 'region-zona-sur',
  },
  {
    id: 'municipio-quilmes',
    name: 'Quilmes',
    type: 'municipio',
    parentId: 'region-zona-sur',
  },
  {
    id: 'municipio-lanus',
    name: 'Lanús',
    type: 'municipio',
    parentId: 'region-zona-sur',
  },
  {
    id: 'localidad-banfield',
    name: 'Banfield',
    type: 'localidad',
    parentId: 'municipio-lomas-de-zamora',
  },
  {
    id: 'localidad-ezpeleta',
    name: 'Ezpeleta',
    type: 'localidad',
    parentId: 'municipio-quilmes',
  },
];

export const getLocationsByType = (type: LocationType): Location[] =>
  LOCATIONS.filter((location) => location.type === type);

/** Devuelve la ubicación con ese `id`, o `undefined` si no existe. */
export const getLocationById = (id: string): Location | undefined =>
  LOCATIONS.find((location) => location.id === id);

/** Ubicaciones cuyo `parentId` es el indicado (hijas directas). */
export const getChildLocations = (id: string): Location[] =>
  LOCATIONS.filter((location) => location.parentId === id);

/** Slug de URL de una ubicación (estable mientras no cambie el nombre oficial). */
export const locationSlug = (location: Location): string => slugify(location.name);

/**
 * Busca una ubicación por el nombre que viene en el frontmatter.
 * Devuelve `undefined` si el valor no pertenece al catálogo, para que la UI
 * omita el enlace en vez de generar una URL rota.
 */
export const findLocationByName = (name: string): Location | undefined => {
  const normalized = name.trim().toLowerCase();
  return LOCATIONS.find((location) => location.name.toLowerCase() === normalized);
};
