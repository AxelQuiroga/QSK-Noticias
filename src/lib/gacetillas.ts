import datos from '../data/gacetillas.json';

export interface Gacetilla {
  titulo: string;
  descripcion: string | null;
  imagenUrl: string | null;
  urlNoticia: string;
  fecha: string | null;
  volanta: string | null;
}

/**
 * Selecciona hasta `limit` gacetillas del listado oficial.
 * Devuelve una lista vacía cuando no hay datos, para que el
 * componente muestre su estado vacío.
 */
export function getGacetillas(limit: number, fuente: Gacetilla[] = datos): Gacetilla[] {
  return fuente.slice(0, limit);
}
