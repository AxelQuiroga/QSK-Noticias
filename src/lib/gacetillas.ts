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
}

export interface GacetillaConSlug extends Gacetilla {
  slug: string;
}

/**
 * Selecciona hasta `limit` gacetillas del listado oficial.
 * Devuelve una lista vacía cuando no hay datos, para que el
 * componente muestre su estado vacío.
 */
export function getGacetillas(limit: number, fuente: Gacetilla[] = datos): Gacetilla[] {
  return fuente.slice(0, limit);
}

/**
 * Deriva un slug URL-friendly del título de cada gacetilla y resuelve
 * colisiones agregando un sufijo numérico (`-2`, `-3`, ...). El resultado
 * es determinista: la misma fuente siempre produce los mismos slugs.
 */
export function buildGacetillasConSlug(fuente: Gacetilla[] = datos): GacetillaConSlug[] {
  const usados = new Map<string, number>();

  return fuente.map((gacetilla) => {
    const base = slugify(gacetilla.titulo) || 'gacetilla';
    const repeticiones = usados.get(base) ?? 0;
    usados.set(base, repeticiones + 1);

    return {
      ...gacetilla,
      slug: repeticiones === 0 ? base : `${base}-${repeticiones + 1}`,
    };
  });
}

/** Todas las gacetillas con slug (para rutas y tarjetas), opcionalmente limitadas. */
export function getGacetillasConSlug(limit?: number, fuente: Gacetilla[] = datos): GacetillaConSlug[] {
  const todas = buildGacetillasConSlug(fuente);
  return typeof limit === 'number' ? todas.slice(0, limit) : todas;
}
