import { describe, expect, it } from 'vitest';
import {
  buildGacetillasConSlug,
  getGacetillas,
  getGacetillasConSlug,
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
