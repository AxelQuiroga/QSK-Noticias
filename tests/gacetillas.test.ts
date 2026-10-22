import { describe, expect, it } from 'vitest';
import {
  buildGacetillasConSlug,
  CANTIDAD_RECIENTES,
  getGacetillas,
  getGacetillasArchivo,
  getGacetillasConSlug,
  getGacetillasRecientes,
  type Gacetilla,
} from '../src/lib/gacetillas';
import { slugify } from '../src/lib/utils';

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

  it('el dataset actual tiene slug persistente válido, sin duplicados e igual al derivado (migración sin cambios de URL)', () => {
    const todas = getGacetillasConSlug();
    expect(todas.length).toBeGreaterThanOrEqual(CANTIDAD_RECIENTES);

    const slugs = todas.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    for (const g of todas) {
      expect(g.slug).toMatch(/^[a-z0-9-]+$/);
      expect(g.slug).toBe(slugify(g.titulo) || 'gacetilla');
    }
  });

  it('el archivo es exactamente el resto del historial excluyendo las recientes', () => {
    const todas = buildGacetillasConSlug(fuente15);
    expect(getGacetillasArchivo(fuente15)).toEqual(todas.slice(CANTIDAD_RECIENTES));
    expect(todas).toEqual([...getGacetillasRecientes(CANTIDAD_RECIENTES, fuente15), ...getGacetillasArchivo(fuente15)]);
  });
});
