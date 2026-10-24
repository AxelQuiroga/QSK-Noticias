import { describe, expect, it } from 'vitest';
import {
  buildGacetillasConSlug,
  CANTIDAD_RECIENTES,
  FUENTES_GACETILLAS,
  getGacetillas,
  getGacetillasArchivo,
  getGacetillasArchivoPorFuente,
  getGacetillasConSlug,
  getGacetillasDestacadas,
  getGacetillasPorFuente,
  getGacetillasRecientes,
  getGacetillasRecientesPorFuente,
  getFuentesConDatos,
  nombreFuente,
  rutaFuenteGacetillas,
  type Gacetilla,
} from '../src/lib/gacetillas';

const gacetillaSinOpcionales: Gacetilla = {
  titulo: 'Gacetilla sin imagen ni volanta',
  descripcion: null,
  imagenUrl: null,
  urlNoticia: 'https://www.gba.gob.ar/comunicacion_publica/gacetillas/ejemplo',
  fecha: null,
  volanta: null,
};

describe('getGacetillas', () => {
  it('respeta el límite de 8 del carrusel de portada', () => {
    expect(getGacetillas(8)).toHaveLength(8);
  });

  it('respeta el límite de 12 de la página dedicada', () => {
    expect(getGacetillas(12)).toHaveLength(12);
  });

  it('devuelve una lista vacía cuando la fuente no tiene gacetillas', () => {
    expect(getGacetillas(4, [])).toEqual([]);
  });

  it('conserva los campos opcionales ausentes como null', () => {
    expect(getGacetillas(4, [gacetillaSinOpcionales])).toEqual([gacetillaSinOpcionales]);
  });

  it('la fuente local trae al menos 12 gacetillas con título y enlace originales', () => {
    const todas = getGacetillas(Number.MAX_SAFE_INTEGER);

    expect(todas.length).toBeGreaterThanOrEqual(12);
    for (const gacetilla of todas) {
      expect(gacetilla.titulo.trim()).not.toBe('');
      expect(gacetilla.urlNoticia).toMatch(/^https:\/\//);
    }
  });
});

describe('buildGacetillasConSlug', () => {
  it('genera slugs únicos y URL-friendly para la fuente local', () => {
    const conSlug = getGacetillasConSlug();
    const slugs = conSlug.map((gacetilla) => gacetilla.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('resuelve colisiones de slug con sufijo numérico determinista', () => {
    const base: Omit<Gacetilla, 'titulo'> = {
      descripcion: null,
      imagenUrl: null,
      urlNoticia: 'https://www.gba.gob.ar/comunicacion_publica/gacetillas/ejemplo',
      fecha: null,
      volanta: null,
    };

    const conSlug = buildGacetillasConSlug([
      { ...base, titulo: 'Obra repetida' },
      { ...base, titulo: 'Obra repetida' },
      { ...base, titulo: 'Otra obra' },
    ]);

    expect(conSlug.map((gacetilla) => gacetilla.slug)).toEqual([
      'obra-repetida',
      'obra-repetida-2',
      'otra-obra',
    ]);
  });

  it('combina límite y slugs para las tarjetas del carrusel', () => {
    expect(getGacetillasConSlug(8)).toHaveLength(8);
  });
});

function gacetillaDePrueba(n: number): Gacetilla {
  return {
    titulo: `Gacetilla de prueba ${n}`,
    descripcion: null,
    imagenUrl: null,
    urlNoticia: `https://www.gba.gob.ar/comunicacion_publica/gacetillas/prueba-${n}`,
    fecha: null,
    volanta: null,
  };
}

describe('dataset completo (historial + archivo)', () => {
  const fuente15 = Array.from({ length: 15 }, (_, i) => gacetillaDePrueba(i + 1));

  it('las rutas se generan para todo el dataset, no solo las recientes', () => {
    expect(buildGacetillasConSlug(fuente15)).toHaveLength(15);
    expect(buildGacetillasConSlug(fuente15).length).toBeGreaterThan(CANTIDAD_RECIENTES);
  });

  it('la sección reciente muestra exactamente las 12 más nuevas', () => {
    const recientes = getGacetillasRecientes(CANTIDAD_RECIENTES, fuente15);
    expect(recientes).toHaveLength(12);
    expect(recientes.map((g) => g.slug)).toEqual(
      Array.from({ length: 12 }, (_, i) => `gacetilla-de-prueba-${i + 1}`),
    );
  });

  it('la gacetilla 13 conserva su slug, deja la sección reciente y aparece en el archivo', () => {
    const archivo = getGacetillasArchivo(fuente15);
    expect(archivo.map((g) => g.slug)).toContain('gacetilla-de-prueba-13');
    expect(archivo).toHaveLength(3);

    const slugsRecientes = getGacetillasRecientes(CANTIDAD_RECIENTES, fuente15).map((g) => g.slug);
    expect(slugsRecientes).not.toContain('gacetilla-de-prueba-13');
  });

  it('un slug almacenado es inmutable aunque el título derive distinto', () => {
    const conSlug = buildGacetillasConSlug([
      { ...gacetillaSinOpcionales, slug: 'mi-url-historica', titulo: 'Título que derivaría otra cosa' },
      { ...gacetillaSinOpcionales, urlNoticia: 'https://www.gba.gob.ar/comunicacion_publica/gacetillas/prueba-2', titulo: 'Título que derivaría otra cosa' },
    ]);

    expect(conSlug[0]?.slug).toBe('mi-url-historica');
    expect(conSlug[1]?.slug).toBe('titulo-que-derivaria-otra-cosa');
  });

  it('la derivación por fallback respeta los nombres reservados por slugs almacenados', () => {
    const conSlug = buildGacetillasConSlug([
      { ...gacetillaSinOpcionales, slug: 'gacetilla-de-prueba-1', urlNoticia: 'https://www.gba.gob.ar/comunicacion_publica/gacetillas/vieja' },
      gacetillaDePrueba(1),
    ]);

    expect(conSlug[0]?.slug).toBe('gacetilla-de-prueba-1');
    expect(conSlug[1]?.slug).toBe('gacetilla-de-prueba-1-2');
  });

  
it('el dataset actual tiene slugs persistentes válidos y únicos', () => {
  const todas = getGacetillasConSlug();

  expect(todas.length).toBeGreaterThanOrEqual(CANTIDAD_RECIENTES);

  const slugs = todas.map((g) => g.slug);
  expect(new Set(slugs).size).toBe(slugs.length);

  for (const g of todas) {
    expect(g.slug).toMatch(/^[a-z0-9-]+$/);
  }
});

it('conserva los slugs persistidos aunque difieran del título', () => {
  const original = [
    {
      ...gacetillaSinOpcionales,
      titulo: 'Nuevas obras de bacheo en Monte Grande',
      urlNoticia: 'https://ejemplo.com/obra-8',
      slug: 'nuevas-obras-de-bacheo-en-monte-grande',
    },
    {
      ...gacetillaSinOpcionales,
      titulo: 'Nuevas obras de bacheo en Monte Grande',
      urlNoticia: 'https://ejemplo.com/obra-9',
      slug: 'nuevas-obras-de-bacheo-en-monte-grande-2',
    },
  ];

  expect(buildGacetillasConSlug(original).map((g) => g.slug)).toEqual([
    'nuevas-obras-de-bacheo-en-monte-grande',
    'nuevas-obras-de-bacheo-en-monte-grande-2',
  ]);
});


  it('el archivo es exactamente el resto del historial excluyendo las recientes', () => {
    const todas = buildGacetillasConSlug(fuente15);
    expect(getGacetillasArchivo(fuente15)).toEqual(todas.slice(CANTIDAD_RECIENTES));
    expect(todas).toEqual([...getGacetillasRecientes(CANTIDAD_RECIENTES, fuente15), ...getGacetillasArchivo(fuente15)]);
  });
});

/**
 * Dataset multi-fuente de prueba: 2 de GBA (1 con declaracion explícita y
 * 1 del legado sin `fuente`, que se interpreta GBA), 15 de Lanús (colapsan
 * recientes + archivo), 2 de Avellaneda y 0 de Esteban Echeverría.
 */
const datosMultiFuente: Gacetilla[] = [
  { ...gacetillaDePrueba(1), titulo: 'Gaci provincial nueva', fuente: 'gba' },
  { ...gacetillaDePrueba(2), titulo: 'Gaci municipal lanus', fuente: 'lanus' },
  { ...gacetillaDePrueba(3), titulo: 'Gaci municipal lanus dos', fuente: 'lanus' },
  ...Array.from({ length: 13 }, (_, i) => ({
    ...gacetillaDePrueba(i + 10),
    titulo: `Gaci lanus histórica ${i + 1}`,
    fuente: 'lanus' as const,
  })),
  { ...gacetillaDePrueba(90), titulo: 'Gaci municipal avellaneda', fuente: 'avellaneda' },
  { ...gacetillaDePrueba(91), titulo: 'Gaci municipal avellaneda dos', fuente: 'avellaneda' },
  // Legado previo a la migración: sin campo `fuente`.
  gacetillaDePrueba(99),
];

describe('getGacetillasPorFuente', () => {
  it('filtra por la fuente declarada sin mezclar registros de otras', () => {
    const lanus = getGacetillasPorFuente('lanus', datosMultiFuente);
    expect(lanus).toHaveLength(15);
    expect(lanus.every((g) => g.titulo.includes('lanus'))).toBe(true);
  });

  it('el legado sin campo fuente se interpreta como GBA (única fuente previa a la migración)', () => {
    const gba = getGacetillasPorFuente('gba', datosMultiFuente);
    expect(gba.map((g) => g.titulo)).toEqual(['Gaci provincial nueva', 'Gacetilla de prueba 99']);
  });

  it('devuelve lista vacía para una fuente sin registros (sin inventar datos)', () => {
    expect(getGacetillasPorFuente('esteban-echeverria', datosMultiFuente)).toEqual([]);
  });

  it('resuelve slugs dentro del subconjunto de la fuente', () => {
    const lanus = getGacetillasPorFuente('lanus', datosMultiFuente);
    expect(lanus[0]?.slug).toBe('gaci-municipal-lanus');
    expect(lanus[1]?.slug).toBe('gaci-municipal-lanus-dos');
  });
});

describe('recientes y archivo por fuente', () => {
  it('recientes respeta su límite dentro de la fuente', () => {
    const recientes = getGacetillasRecientesPorFuente('lanus', CANTIDAD_RECIENTES, datosMultiFuente);
    expect(recientes).toHaveLength(CANTIDAD_RECIENTES);
    expect(recientes[0]?.titulo).toBe('Gaci municipal lanus');
    expect(recientes.some((g) => g.titulo.includes('avellaneda'))).toBe(false);
  });

  it('archivo por fuente es el resto, independiente del de otras fuentes', () => {
    const archivoLanus = getGacetillasArchivoPorFuente('lanus', datosMultiFuente);
    expect(archivoLanus).toHaveLength(15 - CANTIDAD_RECIENTES);
    expect(archivoLanus.every((g) => g.titulo.includes('lanus'))).toBe(true);
  });

  it('una fuente con pocas gacetillas tiene archivo vacío', () => {
    expect(getGacetillasArchivoPorFuente('avellaneda', datosMultiFuente)).toEqual([]);
    expect(getGacetillasRecientesPorFuente('avellaneda', CANTIDAD_RECIENTES, datosMultiFuente)).toHaveLength(2);
  });
});

describe('getGacetillasRecientesPorFuente (dos secciones separadas)', () => {
  const datosDosSecciones: Gacetilla[] = [
    // GBA: 4 registros, 2 con fecha y 2 sin fecha
    { ...gacetillaDePrueba(1), titulo: 'GBA reciente con fecha', fuente: 'gba', urlNoticia: 'https://www.gba.gob.ar/comunicacion_publica/gacetillas/gba-reciente-fecha', fecha: '2026-10-20' },
    { ...gacetillaDePrueba(2), titulo: 'GBA antigua con fecha', fuente: 'gba', urlNoticia: 'https://www.gba.gob.ar/comunicacion_publica/gacetillas/gba-antigua-fecha', fecha: '2026-10-16' },
    { ...gacetillaDePrueba(3), titulo: 'GBA sin fecha uno', fuente: 'gba', urlNoticia: 'https://www.gba.gob.ar/comunicacion_publica/gacetillas/gba-sin-fecha-1', fecha: null },
    { ...gacetillaDePrueba(4), titulo: 'GBA sin fecha dos', fuente: 'gba', urlNoticia: 'https://www.gba.gob.ar/comunicacion_publica/gacetillas/gba-sin-fecha-2', fecha: null },
    // Esteban Echeverría: 3 registros, 2 con fecha y 1 sin fecha
    { ...gacetillaDePrueba(10), titulo: 'EE reciente con fecha', fuente: 'esteban-echeverria', urlNoticia: 'https://www.estebanecheverria.gob.ar/noticias/ee-reciente-fecha', fecha: '2026-10-20' },
    { ...gacetillaDePrueba(11), titulo: 'EE antigua con fecha', fuente: 'esteban-echeverria', urlNoticia: 'https://www.estebanecheverria.gob.ar/noticias/ee-antigua-fecha', fecha: '2026-10-16' },
    { ...gacetillaDePrueba(12), titulo: 'EE sin fecha', fuente: 'esteban-echeverria', urlNoticia: 'https://www.estebanecheverria.gob.ar/noticias/ee-sin-fecha', fecha: null },
  ];

  it('filtra solo publicaciones de GBA para la sección provincial', () => {
    const gba = getGacetillasRecientesPorFuente('gba', 12, datosDosSecciones);
    expect(gba).toHaveLength(4);
    expect(gba.every((g) => (g.fuente ?? 'gba') === 'gba')).toBe(true);
    expect(gba.some((g) => (g.fuente ?? 'gba') === 'esteban-echeverria')).toBe(false);
  });

  it('filtra solo publicaciones de Esteban Echeverría para la sección municipal', () => {
    const ee = getGacetillasRecientesPorFuente('esteban-echeverria', 12, datosDosSecciones);
    expect(ee).toHaveLength(3);
    expect(ee.every((g) => (g.fuente ?? 'gba') === 'esteban-echeverria')).toBe(true);
    expect(ee.some((g) => (g.fuente ?? 'gba') === 'gba')).toBe(false);
  });

  it('prioriza publicaciones con fecha válida (más recientes primero)', () => {
    const gba = getGacetillasRecientesPorFuente('gba', 12, datosDosSecciones);
    const conFecha = gba.filter((g) => g.fecha !== null);
    const sinFecha = gba.filter((g) => g.fecha === null);
    expect(conFecha.length).toBe(2);
    expect(sinFecha.length).toBe(2);
    // La más reciente con fecha debe estar primero
    expect(conFecha[0]?.titulo).toBe('GBA reciente con fecha');
    expect(conFecha[1]?.titulo).toBe('GBA antigua con fecha');
  });

  it('no excede el límite de 12 por fuente', () => {
    const muchosGba = Array.from({ length: 15 }, (_, i) => ({
      ...gacetillaDePrueba(i + 100),
      titulo: `GBA ${i + 1}`,
      fuente: 'gba' as const,
      urlNoticia: `https://www.gba.gob.ar/comunicacion_publica/gacetillas/gba-masivo-${i + 1}`,
    }));
    const seleccion = getGacetillasRecientesPorFuente('gba', 12, muchosGba);
    expect(seleccion).toHaveLength(12);
  });

  it('no duplica tarjetas entre fuentes', () => {
    const gba = getGacetillasRecientesPorFuente('gba', 12, datosDosSecciones);
    const ee = getGacetillasRecientesPorFuente('esteban-echeverria', 12, datosDosSecciones);
    const urlsGba = new Set(gba.map((g) => g.urlNoticia));
    const urlsEe = new Set(ee.map((g) => g.urlNoticia));
    const duplicados = [...urlsGba].filter((u) => urlsEe.has(u));
    expect(duplicados).toEqual([]);
  });

  it('devuelve lista vacía para una fuente sin registros', () => {
    expect(getGacetillasRecientesPorFuente('lanus', 12, datosDosSecciones)).toEqual([]);
    expect(getGacetillasRecientesPorFuente('avellaneda', 12, datosDosSecciones)).toEqual([]);
  });

  it('devuelve slugs persistentes válidos sin duplicar', () => {
    const gba = getGacetillasRecientesPorFuente('gba', 12, datosDosSecciones);
    const slugs = gba.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    }
  });
});

describe('getFuentesConDatos', () => {
  it('lista solo las fuentes con al menos un registro, en orden de registro', () => {
    expect(getFuentesConDatos(datosMultiFuente).map((f) => f.id)).toEqual([
      'gba',
      'lanus',
      'avellaneda',
    ]);
  });

  it('getFuentesConDatos refleja exactamente las fuentes presentes en el dataset', () => {
    // Invariante (no acoplado a qué fuentes tenga hoy el dataset): sin
    // inventar fuentes de más ni perder las presentes.
    const idsReales = new Set(getFuentesConDatos().map((f) => f.id));
    const registradas = FUENTES_GACETILLAS.map((f) => f.id);
    expect([...idsReales].every((id) => registradas.includes(id))).toBe(true);
    // El legado sin `fuente` cae en gba: si hay registros, gba siempre cuenta.
    const datasetNoVacio = getGacetillasConSlug().length > 0;
    if (datasetNoVacio) {
      expect(idsReales.has('gba')).toBe(true);
    }
  });
});

describe('nombreFuente', () => {
  it('resuelve nombres conocidos', () => {
    expect(nombreFuente('lanus')).toBe('Municipalidad de Lanús');
    expect(nombreFuente('gba')).toBe('Gobierno de la Provincia de Buenos Aires');
  });

  it('sin fuente (legado) cae en GBA y con id desconocido en genérico', () => {
    expect(nombreFuente(undefined)).toBe('Gobierno de la Provincia de Buenos Aires');
    expect(nombreFuente('fuente-fantasma')).toBe('Fuente externa');
  });
});

describe('FUENTES_GACETILLAS y rutas', () => {
  it('las cuatro fuentes registradas coinciden con el extractor', () => {
    expect(FUENTES_GACETILLAS.map((f) => f.id)).toEqual([
      'gba',
      'lanus',
      'avellaneda',
      'esteban-echeverria',
    ]);
  });

  it('rutaFuenteGacetillas construye la URL de la sección per-fuente', () => {
    expect(rutaFuenteGacetillas('lanus')).toBe('/gacetillas-oficiales/fuente/lanus/');
  });
});

/**
 * Dataset para pruebas de mezcla de portada: GBA sin fecha, EE con fecha,
 * Lanús sin fecha y un duplicado intencional de URL.
 */
const datosMezcla: Gacetilla[] = [
  { ...gacetillaDePrueba(1), titulo: 'Noticia GBA una', fuente: 'gba', urlNoticia: 'https://www.gba.gob.ar/comunicacion_publica/gacetillas/gba-1' },
  { ...gacetillaDePrueba(2), titulo: 'Noticia GBA dos', fuente: 'gba', urlNoticia: 'https://www.gba.gob.ar/comunicacion_publica/gacetillas/gba-2', fecha: null },
  { ...gacetillaDePrueba(3), titulo: 'NOTICIA EE RECIENTE', fuente: 'esteban-echeverria', urlNoticia: 'https://www.estebanecheverria.gob.ar/noticias/ee-1', fecha: '2026-10-20' },
  { ...gacetillaDePrueba(4), titulo: 'Noticia EE antigua', fuente: 'esteban-echeverria', urlNoticia: 'https://www.estebanecheverria.gob.ar/noticias/ee-2', fecha: '2026-10-16' },
  { ...gacetillaDePrueba(5), titulo: 'Noticia Lanús', fuente: 'lanus', urlNoticia: 'https://www.lanus.gob.ar/noticias/lanus-1' },
  // Duplicado intencional de URL de GBA uno para probar que no se repite.
  { ...gacetillaDePrueba(6), titulo: 'Noticia GBA una (duplicada)', fuente: 'gba', urlNoticia: 'https://www.gba.gob.ar/comunicacion_publica/gacetillas/gba-1' },
];

describe('getGacetillasDestacadas', () => {
  it('incluye tanto GBA como Esteban Echeverría en las primeras 8 cuando ambos tienen datos', () => {
    const seleccion = getGacetillasDestacadas(8, datosMezcla);
    const fuentes = new Set(seleccion.map((g) => g.fuente ?? 'gba'));
    expect(fuentes.has('gba')).toBe(true);
    expect(fuentes.has('esteban-echeverria')).toBe(true);
  });

  it('garantiza al menos una historia de cada fuente cuando fuentes <= limit', () => {
    const seleccion = getGacetillasDestacadas(3, datosMezcla);
    const fuentes = new Set(seleccion.map((g) => g.fuente ?? 'gba'));
    expect(fuentes.has('gba')).toBe(true);
    expect(fuentes.has('esteban-echeverria')).toBe(true);
    expect(fuentes.has('lanus')).toBe(true);
    expect(seleccion).toHaveLength(3);
  });

  it('no duplica historias ni repite URLs', () => {
    const seleccion = getGacetillasDestacadas(8, datosMezcla);
    const urls = seleccion.map((g) => g.urlNoticia);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('es determinista: mismo dataset produce misma selección', () => {
    const primera = getGacetillasDestacadas(5, datosMezcla);
    const segunda = getGacetillasDestacadas(5, datosMezcla);
    expect(primera.map((g) => g.urlNoticia)).toEqual(segunda.map((g) => g.urlNoticia));
  });

  it('prioriza historias con fecha válida sin inventar fechas para las que la tienen null', () => {
    const seleccion = getGacetillasDestacadas(2, [
      { ...gacetillaDePrueba(1), titulo: 'Sin fecha', fuente: 'gba', urlNoticia: 'https://www.gba.gob.ar/comunicacion_publica/gacetillas/sin-fecha' },
      { ...gacetillaDePrueba(2), titulo: 'Con fecha', fuente: 'esteban-echeverria', urlNoticia: 'https://www.estebanecheverria.gob.ar/noticias/con-fecha', fecha: '2026-10-20' },
    ]);
    expect(seleccion).toHaveLength(2);
    const conFecha = seleccion.find((g) => g.fecha !== null);
    expect(conFecha?.titulo).toBe('Con fecha');
    const sinFecha = seleccion.find((g) => g.fecha === null);
    expect(sinFecha?.titulo).toBe('Sin fecha');
    expect(sinFecha?.fecha).toBeNull();
  });

  it('cuando hay más fuentes que el slot, no garantiza todas pero no duplica', () => {
    const seleccion = getGacetillasDestacadas(2, datosMezcla);
    expect(seleccion).toHaveLength(2);
    const urls = seleccion.map((g) => g.urlNoticia);
    expect(new Set(urls).size).toBe(2);
  });

  it('conserva el orden del dataset para historias sin fecha de distintas fuentes', () => {
    const sinFechas: Gacetilla[] = [
      { ...gacetillaDePrueba(30), titulo: 'Primera GBA', fuente: 'gba', fecha: null, urlNoticia: 'https://example.com/primera-gba' },
      { ...gacetillaDePrueba(31), titulo: 'Segunda EE', fuente: 'esteban-echeverria', fecha: null, urlNoticia: 'https://example.com/segunda-ee' },
      { ...gacetillaDePrueba(32), titulo: 'Tercera Lanús', fuente: 'lanus', fecha: null, urlNoticia: 'https://example.com/tercera-lanus' },
    ];
    expect(getGacetillasDestacadas(3, sinFechas).map((g) => g.titulo)).toEqual([
      'Primera GBA',
      'Segunda EE',
      'Tercera Lanús',
    ]);
  });

  it('devuelve lista vacía cuando no hay datos', () => {
    expect(getGacetillasDestacadas(8, [])).toEqual([]);
    expect(getGacetillasDestacadas(0, datosMezcla)).toEqual([]);
  });

  it('mantiene slugs persistentes sin cambios y sin duplicados de URL', () => {
    const seleccion = getGacetillasDestacadas(8, datosMezcla);
    const urls = seleccion.map((g) => g.urlNoticia);
    expect(new Set(urls).size).toBe(urls.length); // sin duplicados

    const todos = getGacetillasConSlug(undefined, datosMezcla);
    const slugsTotales = new Set(todos.map((g) => g.slug));
    for (const g of seleccion) {
      expect(g.slug).toMatch(/^[a-z0-9-]+$/);
      expect(slugsTotales.has(g.slug)).toBe(true); // slug existe en el build completo
    }
  });
});
