import { describe, expect, it, vi } from 'vitest';
import {
  getNoticiasOle,
  getOleSlug,
  ordenarNoticiasOle,
  validarNoticiasOle,
  type OleNews,
} from '../src/lib/ole';

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

  it('acepta un dataset vacío', () => {
    expect(validarNoticiasOle([])).toEqual([]);
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
    ).toThrow(/ole\\.com\\.ar/);
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

  it('rechaza imágenes de dominios externos al contrato de Olé', () => {
    expect(() =>
      validarNoticiasOle([{ ...noticiaValida, imageUrl: 'https://example.com/imagen.jpg' }]),
    ).toThrow(/ole\\.com\\.ar/);
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

  it('rechaza URLs repetidas aunque difieran por www, barra final, tracking o fragmento', () => {
    expect(() =>
      validarNoticiasOle([
        noticiaValida,
        {
          ...noticiaValida,
          id: 'ole-124',
          url: 'https://ole.com.ar/futbol-primera/noticia-de-prueba.html/?utm_source=qsk#nota',
        },
      ]),
    ).toThrow(/URL de noticia duplicada/);
  });

  it('rechaza IDs vacíos', () => {
    expect(() => validarNoticiasOle([{ ...noticiaValida, id: ' ' }])).toThrow();
  });
});

describe('getOleSlug', () => {
  it('deriva un slug estable desde la URL original de Olé', () => {
    expect(getOleSlug(noticiaValida)).toBe('noticia-de-prueba');
  });

  it('ignora query strings y fragmentos al derivar el slug', () => {
    expect(getOleSlug({
      ...noticiaValida,
      url: 'https://www.ole.com.ar/futbol-primera/una-nota_0_ABC123.html?utm_source=rss#nota',
    })).toBe('una-nota_0_abc123');
  });

  it('usa un fallback seguro si la URL no tiene un nombre de artículo reconocible', () => {
    expect(getOleSlug({ ...noticiaValida, url: 'https://www.ole.com.ar/' })).toBe('ole-123');
  });
});

describe('getNoticiasOle', () => {
  it('respeta el límite solicitado', () => {
    expect(getNoticiasOle(3)).toHaveLength(3);
    expect(getNoticiasOle(0)).toEqual([]);
    expect(getNoticiasOle(-2)).toEqual([]);
  });

  it('devuelve las noticias por fecha descendente', () => {
    const noticias = getNoticiasOle();
    const fechas = noticias
      .map((noticia) => noticia.publishedAt)
      .filter((fecha): fecha is string => fecha !== null)
      .map(Date.parse);

    expect(fechas).toEqual([...fechas].sort((a, b) => b - a));
  });

  it('coloca las fechas nulas al final', () => {
    const noticias = ordenarNoticiasOle([
      { ...noticiaValida, id: 'sin-fecha', publishedAt: null },
      { ...noticiaValida, id: 'anterior', publishedAt: '2026-10-27T12:00:00.000Z' },
      { ...noticiaValida, id: 'reciente', publishedAt: '2026-10-29T12:00:00.000Z' },
    ]);

    expect(noticias.map(({ id }) => id)).toEqual(['reciente', 'anterior', 'sin-fecha']);
  });

  it('devuelve una lista vacía cuando el dataset importado está vacío', async () => {
    vi.resetModules();
    vi.doMock('../src/data/ole.json', () => ({ default: [] }));

    try {
      const { getNoticiasOle: getNoticiasConDatasetVacio } = await import('../src/lib/ole');
      expect(getNoticiasConDatasetVacio()).toEqual([]);
    } finally {
      vi.doUnmock('../src/data/ole.json');
      vi.resetModules();
    }
  });
});
