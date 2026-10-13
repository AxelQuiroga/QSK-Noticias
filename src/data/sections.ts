/**
 * Secciones temáticas del portal: taxonomía editorial FIJA.
 *
 * Es la fuente de verdad para el nav, el sidebar y las rutas `/secciones/*`.
 * No se deriva de los artículos, así que aparece completa desde el día 1
 * (aunque todavía no haya nada publicado).
 *
 * ⚠️ Si se agrega una sección nueva, hay que sumarla acá: un artículo cuyo
 * `section` no figure en esta lista enlazará a una ruta inexistente.
 */
export const SECTIONS: readonly string[] = [
  'Actualidad',
  'Deportes',
  'Economía',
  'Educación',
  'Obras públicas',
  'Salud',
  'Tránsito',
];
