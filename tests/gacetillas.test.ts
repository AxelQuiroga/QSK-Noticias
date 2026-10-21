import { describe, expect, it } from 'vitest';
import { getGacetillas, type Gacetilla } from '../src/lib/gacetillas';

const gacetillaSinOpcionales: Gacetilla = {
  titulo: 'Gacetilla sin imagen ni volanta',
  descripcion: null,
  imagenUrl: null,
  urlNoticia: 'https://www.gba.gob.ar/comunicacion_publica/gacetillas/ejemplo',
  fecha: null,
  volanta: null,
};

describe('getGacetillas', () => {
  it('respeta el límite de 4 de la portada', () => {
    expect(getGacetillas(4)).toHaveLength(4);
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
