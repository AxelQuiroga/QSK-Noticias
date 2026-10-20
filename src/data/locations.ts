import { slugify } from '../lib/utils';

/**
 * Catálogo de ubicaciones, INDEPENDIENTE de los artículos.
 *
 * Modelo geográfico de cinco niveles:
 * - `pais`      -> Argentina.
 * - `provincia` -> Buenos Aires.
 * - `region`    -> agrupación editorial de cobertura (Zona Sur, AMBA); NO es
 *                  una jurisdicción y puede cruzar provincias.
 * - `municipio` -> partido del conurbano (Lomas de Zamora, Quilmes, Lanús).
 * - `localidad` -> ciudad/barrio dentro de un partido (Banfield, Ezpeleta).
 *
 * `parentId` expresa CONTENCIÓN ADMINISTRATIVA
 * (localidad -> municipio -> provincia -> pais). La pertenencia a regiones
 * editoriales es otra relación y se expresa con `regionIds` en los municipios,
 * para no confundir una agrupación periodística (Zona Sur) con una
 * jurisdicción (provincia de Buenos Aires).
 *
 * Frontmatter de los artículos:
 * - `municipality` guarda el PARTIDO, no la localidad.
 * - `localidad` (opcional) guarda la localidad del catálogo a la que refiere
 *   la noticia; permite que `/localidades/*` liste contenido real.
 * - `region` es la agrupación editorial declarada por la redacción.
 * El schema de contenido valida estos valores contra el catálogo, así un
 * municipio inexistente o un tipo mal usado fallan en el build (ver
 * `src/content.config.ts`).
 *
 * Una ubicación puede NO tener artículos publicados: el catálogo es la fuente
 * de verdad para la navegación y las rutas, no el contenido.
 */
export type LocationType = 'pais' | 'provincia' | 'region' | 'municipio' | 'localidad';

export interface Location {
  /** Identificador estable. Nunca se deriva del nombre visible. */
  id: string;
  /** Nombre oficial que se muestra al lector. */
  name: string;
  /** Tipo de ubicación. */
  type: LocationType;
  /** Contenedor administrativo directo (localidad -> municipio -> provincia -> pais). */
  parentId?: string;
  /** Regiones editoriales a las que pertenece (solo municipios). */
  regionIds?: readonly string[];
}

const ZONA_SUR_REGIONS = ['region-zona-sur', 'region-amba'] as const;

export const LOCATIONS: readonly Location[] = [
  { id: 'pais-argentina', name: 'Argentina', type: 'pais' },
  {
    id: 'provincia-buenos-aires',
    name: 'Buenos Aires',
    type: 'provincia',
    parentId: 'pais-argentina',
  },
  // Regiones editoriales: agrupaciones de cobertura, no jurisdicciones.
  { id: 'region-zona-sur', name: 'Zona Sur', type: 'region' },
  { id: 'region-amba', name: 'AMBA', type: 'region' },
  {
    id: 'municipio-avellaneda',
    name: 'Avellaneda',
    type: 'municipio',
    parentId: 'provincia-buenos-aires',
    regionIds: ZONA_SUR_REGIONS,
  },
  {
    id: 'municipio-lanus',
    name: 'Lanús',
    type: 'municipio',
    parentId: 'provincia-buenos-aires',
    regionIds: ZONA_SUR_REGIONS,
  },
  {
    id: 'municipio-lomas-de-zamora',
    name: 'Lomas de Zamora',
    type: 'municipio',
    parentId: 'provincia-buenos-aires',
    regionIds: ZONA_SUR_REGIONS,
  },
  {
    id: 'municipio-almirante-brown',
    name: 'Almirante Brown',
    type: 'municipio',
    parentId: 'provincia-buenos-aires',
    regionIds: ZONA_SUR_REGIONS,
  },
  {
    id: 'municipio-quilmes',
    name: 'Quilmes',
    type: 'municipio',
    parentId: 'provincia-buenos-aires',
    regionIds: ZONA_SUR_REGIONS,
  },
  {
    id: 'municipio-berazategui',
    name: 'Berazategui',
    type: 'municipio',
    parentId: 'provincia-buenos-aires',
    regionIds: ZONA_SUR_REGIONS,
  },
  {
    id: 'municipio-florencio-varela',
    name: 'Florencio Varela',
    type: 'municipio',
    parentId: 'provincia-buenos-aires',
    regionIds: ZONA_SUR_REGIONS,
  },
  {
    id: 'municipio-esteban-echeverria',
    name: 'Esteban Echeverría',
    type: 'municipio',
    parentId: 'provincia-buenos-aires',
    regionIds: ZONA_SUR_REGIONS,
  },
  {
    id: 'municipio-ezeiza',
    name: 'Ezeiza',
    type: 'municipio',
    parentId: 'provincia-buenos-aires',
    regionIds: ZONA_SUR_REGIONS,
  },
  {
    id: 'municipio-presidente-peron',
    name: 'Presidente Perón',
    type: 'municipio',
    parentId: 'provincia-buenos-aires',
    regionIds: ZONA_SUR_REGIONS,
  },
  {
    id: 'municipio-san-vicente',
    name: 'San Vicente',
    type: 'municipio',
    parentId: 'provincia-buenos-aires',
    regionIds: ZONA_SUR_REGIONS,
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

/** Ubicación del catálogo con ese nombre y ese tipo, o `undefined`. */
export const findLocationByNameAndType = (
  name: string,
  type: LocationType,
): Location | undefined => {
  const location = findLocationByName(name);
  return location && location.type === type ? location : undefined;
};

/** ¿`name` es una ubicación del catálogo de ese tipo? */
export const isKnownLocationName = (name: string, type: LocationType): boolean =>
  findLocationByNameAndType(name, type) !== undefined;

/** Ancestros administrativos, del más cercano al más lejano. */
export const getAncestors = (location: Location): Location[] => {
  const ancestors: Location[] = [];
  let current = location.parentId ? getLocationById(location.parentId) : undefined;
  while (current && !ancestors.includes(current)) {
    ancestors.push(current);
    current = current.parentId ? getLocationById(current.parentId) : undefined;
  }
  return ancestors;
};

/** Primer ancestro del tipo indicado (o `undefined`). */
export const getAncestorOfType = (location: Location, type: LocationType): Location | undefined =>
  getAncestors(location).find((ancestor) => ancestor.type === type);

/** Regiones editoriales a las que pertenece una ubicación. */
export const getRegions = (location: Location): Location[] =>
  (location.regionIds ?? [])
    .map((id) => getLocationById(id))
    .filter((region): region is Location => region !== undefined);

/**
 * Contexto geográfico completo de un nombre del catálogo: la ubicación, sus
 * ancestros administrativos, sus regiones editoriales y todos los nombres
 * asociados (para indexar y mostrar). `undefined` si el nombre no pertenece
 * al catálogo.
 */
export interface LocationContext {
  location: Location;
  ancestors: Location[];
  regions: Location[];
  /** Nombres únicos, del más específico al más general. */
  names: string[];
}

export const getLocationContext = (name: string): LocationContext | undefined => {
  const location = findLocationByName(name);
  if (!location) return undefined;

  const ancestors = getAncestors(location);
  const regions = getRegions(location);
  const names: string[] = [];
  for (const item of [location, ...ancestors, ...regions]) {
    if (!names.includes(item.name)) names.push(item.name);
  }

  return { location, ancestors, regions, names };
};

/**
 * Provincia y país de una ubicación del catálogo, resueltos por la cadena
 * administrativa (`parentId`). Devuelve cadenas vacías si no se pueden
 * determinar, en vez de inventar un valor.
 */
export const getProvinciaOf = (name: string): string =>
  (() => {
    const location = findLocationByName(name);
    return location ? (getAncestorOfType(location, 'provincia')?.name ?? '') : '';
  })();

export const getPaisOf = (name: string): string =>
  (() => {
    const location = findLocationByName(name);
    return location ? (getAncestorOfType(location, 'pais')?.name ?? '') : '';
  })();
