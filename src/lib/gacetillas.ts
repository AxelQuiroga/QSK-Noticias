import datos from '../data/gacetillas.json';
import { slugify } from './utils';

export interface Gacetilla {
  titulo: string;
  descripcion: string | null;
  imagenUrl: string | null;
  urlNoticia: string;
  fecha: string | null;
  volanta: string | null;
  /**
   * Identificador de la fuente (src/fuentes.ts del extractor): "gba",
   * "lanus", "avellaneda", "esteban-echeverria". Los registros del
   * extractor nuevo lo traen siempre; el legado previo a la migración no
   * lo tiene y se interpreta como "gba" (única fuente que existía).
   */
  fuente?: string;
  /**
   * Texto completo de la publicación oficial, cuando el extractor lo provea.
   * La data actual del listado solo trae título, bajada e imagen.
   */
  cuerpo?: string | null;
  /**
   * Slug persistente asignado por el extractor al momento de la extracción.
   * Una vez asignado es inmutable: garantiza que la URL individual de la
   * gacetilla no cambie porque varíe el orden del listado o salga del top-12.
   * Las entradas previas a la migración no lo tienen; el fallback deriva
   * el slug del título igual que siempre.
   */
  slug?: string;
}

export interface GacetillaConSlug extends Gacetilla {
  slug: string;
}

/** Cantidad de gacetillas recientes que muestra la sección principal. */
export const CANTIDAD_RECIENTES = 12;

/**
 * Selecciona hasta `limit` gacetillas del listado oficial.
 * Devuelve una lista vacía cuando no hay datos, para que el
 * componente muestre su estado vacío.
 */
export function getGacetillas(limit: number, fuente: Gacetilla[] = datos): Gacetilla[] {
  return fuente.slice(0, limit);
}

/**
 * Devuelve todas las gacetillas con slug resuelto.
 *
 * Un slug almacenado gana siempre y reserva su nombre; una entrada sin slug
 * lo conserva. El resto deriva `slugify(titulo)` resolviendo colisiones con
 * un sufijo numérico (`-2`, `-3`, ...). El resultado es determinista: la misma
 * fuente siempre produce los mismos slugs.
 */
export function buildGacetillasConSlug(fuente: Gacetilla[] = datos): GacetillaConSlug[] {
  const usados = new Set<string>();

  for (const gacetilla of fuente) {
    if (typeof gacetilla.slug === 'string' && gacetilla.slug.trim() !== '') {
      usados.add(gacetilla.slug);
    }
  }

  return fuente.map((gacetilla) => {
    const almacenado = gacetilla.slug;
    if (typeof almacenado === 'string' && almacenado.trim() !== '') {
      return { ...gacetilla, slug: almacenado };
    }

    const base = slugify(gacetilla.titulo) || 'gacetilla';
    let asignado = base;
    let sufijo = 2;
    while (usados.has(asignado)) {
      asignado = `${base}-${sufijo++}`;
    }
    usados.add(asignado);

    return { ...gacetilla, slug: asignado };
  });
}

/** Todas las gacetillas con slug (para rutas y tarjetas), opcionalmente limitadas. */
export function getGacetillasConSlug(limit?: number, fuente: Gacetilla[] = datos): GacetillaConSlug[] {
  const todas = buildGacetillasConSlug(fuente);
  return typeof limit === 'number' ? todas.slice(0, limit) : todas;
}

/** Ruta de la página per-fuente dentro del portal. */
export function rutaFuenteGacetillas(id: string): string {
  return `/gacetillas-oficiales/fuente/${id}/`;
}

/**
 * Identidad de las fuentes oficiales que pueden aportar registros.
 * Los ids coinciden con src/fuentes.ts del extractor; el nombre es el
 * que se muestra en las tarjetas y las secciones.
 */
export interface FuenteInfo {
  id: string;
  nombre: string;
  /** URL del listado/feed oficial que alimenta al extractor. */
  listadoUrl: string;
}

export const FUENTES_GACETILLAS: FuenteInfo[] = [
  {
    id: 'gba',
    nombre: 'Gobierno de la Provincia de Buenos Aires',
    listadoUrl: 'https://www.gba.gob.ar/comunicacion_publica/gacetillas',
  },
  {
    id: 'lanus',
    nombre: 'Municipalidad de Lanús',
    listadoUrl: 'https://www.lanus.gob.ar/noticias',
  },
  {
    id: 'avellaneda',
    nombre: 'Municipalidad de Avellaneda',
    listadoUrl: 'https://www.mda.gob.ar/noticias/',
  },
  {
    id: 'esteban-echeverria',
    nombre: 'Municipalidad de Esteban Echeverría',
    listadoUrl: 'https://www.estebanecheverria.gob.ar/feed/',
  },
];

export function getFuenteInfo(id: string): FuenteInfo | undefined {
  return FUENTES_GACETILLAS.find((fuente) => fuente.id === id);
}

/**
 * Nombre para la atribución en tarjetas y páginas. Sin fuente declarada
 * (legado previo a la migración) se interpreta GBA, única fuente que
 * existía; un id desconocido cae en "Fuente externa" sin inventar datos.
 */
export function nombreFuente(id: string | undefined): string {
  if (!id) return FUENTES_GACETILLAS[0]?.nombre ?? 'Fuente externa';
  return getFuenteInfo(id)?.nombre ?? 'Fuente externa';
}

/** Las gacetillas de una fuente; el legado sin campo `fuente` cuenta como GBA. */
function gacetillasDeFuente(id: string, fuente: Gacetilla[] = datos): Gacetilla[] {
  return fuente.filter((gacetilla) => (gacetilla.fuente ?? 'gba') === id);
}

/** Todas las gacetillas de una fuente (con slug resuelto por fuente). */
export function getGacetillasPorFuente(id: string, fuente: Gacetilla[] = datos): GacetillaConSlug[] {
  return buildGacetillasConSlug(gacetillasDeFuente(id, fuente));
}

/** Las últimas `limite` gacetillas de una fuente, ordenadas por fecha. */
export function getGacetillasRecientesPorFuente(
  id: string,
  limite: number = CANTIDAD_RECIENTES,
  fuente: Gacetilla[] = datos,
): GacetillaConSlug[] {
  const deLaFuente = getGacetillasPorFuente(id, fuente);
  return ordenarPorFechaYOrden(deLaFuente, fuente).slice(0, limite);
}

/** El archivo de una fuente: su historial menos las recientes. */
export function getGacetillasArchivoPorFuente(id: string, fuente: Gacetilla[] = datos): GacetillaConSlug[] {
  return getGacetillasPorFuente(id, fuente).slice(CANTIDAD_RECIENTES);
}

/** Fuentes con al menos un registro en el dataset, en orden de registro. */
export function getFuentesConDatos(fuente: Gacetilla[] = datos): FuenteInfo[] {
  const presentes = new Set(fuente.map((gacetilla) => gacetilla.fuente ?? 'gba'));
  return FUENTES_GACETILLAS.filter((fuenteInfo) => presentes.has(fuenteInfo.id));
}

/**
 * Las últimas `limit` gacetillas: la sección actual de la página dedicada
 * y las tarjetas del carrusel de portada.
 */
export function getGacetillasRecientes(
  limit: number = CANTIDAD_RECIENTES,
  fuente: Gacetilla[] = datos,
): GacetillaConSlug[] {
  return buildGacetillasConSlug(fuente).slice(0, limit);
}

/**
 * Orden interno de una gacetilla dentro del array fuente original: se usa
 * como desempate determinista cuando no hay fecha válida.
 */
function indiceEnFuente(gacetilla: Gacetilla, fuente: Gacetilla[]): number {
  return fuente.indexOf(gacetilla);
}

/**
 * Ordena gacetillas de una fuente: primero las que tienen fecha válida (de
 * la más reciente a la más antigua), luego las que no tienen fecha, en el
 * orden en que aparecen en el dataset original.
 */
function ordenarPorFechaYOrden(
  lista: GacetillaConSlug[],
  fuente: Gacetilla[],
): GacetillaConSlug[] {
  return [...lista].sort((a, b) => {
    const fechaA = a.fecha ? new Date(a.fecha) : null;
    const fechaB = b.fecha ? new Date(b.fecha) : null;
    const validaA = fechaA && !Number.isNaN(fechaA.getTime());
    const validaB = fechaB && !Number.isNaN(fechaB.getTime());

    if (validaA && validaB) return fechaB!.getTime() - fechaA!.getTime();
    if (validaA) return -1;
    if (validaB) return 1;

    return (
      indiceEnFuente(a, fuente) - indiceEnFuente(b, fuente)
    );
  });
}

/**
 * Selección representativa para el carrusel de portada.
 *
 * - Mezcla todas las fuentes que tienen datos.
 * - Cuando la cantidad de fuentes es menor o igual al `limit`, garantiza al
 *   menos una historia de cada fuente disponible.
 * - Llena los restantes slots con las historias más recientes disponibles,
 *   usando fecha válida cuando exista; sin inventar fechas.
 * - No duplica historias ni cambia sus slugs persistentes.
 * - Determinista: mismo dataset produce siempre la misma selección.
 */
export function getGacetillasDestacadas(
  limit: number = CANTIDAD_RECIENTES,
  fuente: Gacetilla[] = datos,
): GacetillaConSlug[] {
  const todas = buildGacetillasConSlug(fuente);
  if (todas.length === 0 || limit <= 0) return [];

  const fuentesConDatos = getFuentesConDatos(fuente);
  if (fuentesConDatos.length === 0) return [];

  // Todas las gacetillas ordenadas globalmente: fecha válida descendente,
  // luego orden de aparición en el dataset.
  const ordenGlobal = ordenarPorFechaYOrden(todas, fuente);

  const seleccionados: GacetillaConSlug[] = [];
  const usados = new Set<string>();

  // 1. Garantizar al menos una de cada fuente cuando hay cupo.
  if (fuentesConDatos.length <= limit) {
    for (const fuenteInfo of fuentesConDatos) {
      const primera = ordenGlobal.find(
        (g) => (g.fuente ?? 'gba') === fuenteInfo.id && !usados.has(g.urlNoticia),
      );
      if (primera) {
        usados.add(primera.urlNoticia);
        seleccionados.push(primera);
      }
    }
  }

  // 2. Llenar restantes con las más recientes de cualquier fuente (orden global).
  for (const gacetilla of ordenGlobal) {
    if (seleccionados.length >= limit) break;
    if (!usados.has(gacetilla.urlNoticia)) {
      usados.add(gacetilla.urlNoticia);
      seleccionados.push(gacetilla);
    }
  }

  // 3. Orden final: fecha válida descendente, luego orden en dataset.
  return ordenarPorFechaYOrden(seleccionados, fuente).slice(0, limit);
}

/**
 * El resto del historial: gacetillas que ya no están entre las recientes
 * pero conservan su página individual y aparecen en el archivo.
 */
export function getGacetillasArchivo(fuente: Gacetilla[] = datos): GacetillaConSlug[] {
  return buildGacetillasConSlug(fuente).slice(CANTIDAD_RECIENTES);
}
