import { describe, expect, it } from 'vitest';
import { getNoticiasOle, validarNoticiasOle, type OleNews } from '../src/lib/ole';

const noticiaValida: OleNews = {
  id: 'ole-123',
  title: 'Un título de prueba',
  url: 'https://www.ole.com.ar/futbol-primera/noticia-de-prueba.html',
  publishedAt: '2026-10-28T12:30:00.000Z',
  imageUrl: 'https://www.ole.com.ar/images/noticia.jpg',
  source: 'Olé',
};

describe('validarNoticiasOle', () => {
  it('acepta el contrato completo', () => {
    expect(validarNoticiasOle([noticiaValida])).toEqual([noticiaValida]);
  });

  it('acepta fecha e imagen opcionales nulas', () => {
    expect(
      validarNoticiasOle([{ ...noticiaValida, publishedAt: null, imageUrl: null }]),
    ).toEqual([{ ...noticiaValida, publishedAt: null, imageUrl: null }]);
  });

  it('acepta un dataset vacío mientras el productor todavía no publica datos', () => {
    expect(validarNoticiasOle([])).toEqual([]);
    expect(getNoticiasOle()).toEqual([]);
  });

  it('rechaza un valor que no sea una lista', () => {
    expect(() => validarNoticiasOle({ items: [noticiaValida] })).toThrow();
  });

  it('rechaza título vacío', () => {
    expect(() => validarNoticiasOle([{ ...noticiaValida, title: '  ' }])).toThrow();
  });

  it('rechaza URLs de artículos fuera del dominio permitido', () => {
    expect(() =>
      validarNoticiasOle([{ ...noticiaValida, url: 'https://example.com/noticia' }]),
    ).toThrow(/ole\.com\.ar/);
  });

  it('rechaza enlaces de artículos que no usen HTTPS', () => {
    expect(() =>
      validarNoticiasOle([{ ...noticiaValida, url: 'http://www.ole.com.ar/noticia' }]),
    ).toThrow();
  });

  it('rechaza URLs de imágenes que no usen HTTPS', () => {
    expect(() =>
      validarNoticiasOle([{ ...noticiaValida, imageUrl: 'http://www.ole.com.ar/imagen.jpg' }]),
    ).toThrow(/HTTPS/);
  });

  it('rechaza fechas inválidas', () => {
    expect(() =>
      validarNoticiasOle([{ ...noticiaValida, publishedAt: 'ayer' }]),
    ).toThrow(/ISO/);
  });

  it('rechaza una fuente distinta de Olé', () => {
    expect(() =>
      validarNoticiasOle([{ ...noticiaValida, source: 'Otro medio' }]),
    ).toThrow();
  });

  it('rechaza IDs duplicados', () => {
    expect(() =>
      validarNoticiasOle([noticiaValida, { ...noticiaValida, url: 'https://ole.com.ar/otra' }]),
    ).toThrow(/id duplicado/);
  });

  it('rechaza URLs repetidas aunque difieran por tracking o fragmento', () => {
    expect(() =>
      validarNoticiasOle([
        noticiaValida,
        {
          ...noticiaValida,
          id: 'ole-124',
          url: 'https://www.ole.com.ar/futbol-primera/noticia-de-prueba.html?utm_source=qsk#nota',
        },
      ]),
    ).toThrow(/URL de noticia duplicada/);
  });

  it('rechaza IDs vacíos', () => {
    expect(() => validarNoticiasOle([{ ...noticiaValida, id: ' ' }])).toThrow();
  });
});
