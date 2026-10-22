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
 * El resto del historial: gacetillas que ya no están entre las recientes
 * pero conservan su página individual y aparecen en el archivo.
 */
export function getGacetillasArchivo(fuente: Gacetilla[] = datos): GacetillaConSlug[] {
  return buildGacetillasConSlug(fuente).slice(CANTIDAD_RECIENTES);
}
