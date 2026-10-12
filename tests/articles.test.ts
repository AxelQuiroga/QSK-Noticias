import { describe, it, expect } from 'vitest';
import { slugify } from '../src/lib/utils';
import { searchArticles } from '../src/lib/search';

describe('slugify', () => {
  it('convierte texto a slug válido', () => {
    expect(slugify('Lomas de Zamora')).toBe('lomas-de-zamora');
    expect(slugify('Tránsito')).toBe('transito');
    expect(slugify('  Espacios   múltiples  ')).toBe('espacios-multiples');
  });

  it('remueve caracteres especiales', () => {
    expect(slugify('¡Hola, mundo!')).toBe('hola-mundo');
  });

  it('maneja string vacío', () => {
    expect(slugify('')).toBe('');
  });
});

describe('searchArticles', () => {
  const mockArticles = [
    {
      id: '1',
      data: {
        slug: 'noticia-transito',
        title: 'Noticia de tránsito en Lomas',
        description: 'Congestionamiento vehicular',
        section: 'Tránsito',
        municipality: 'Lomas de Zamora',
        publishedAt: new Date('2026-10-10'),
      },
      body: 'contenido del artículo sobre tránsito',
    },
    {
      id: '2',
      data: {
        slug: 'escuela-banfield',
        title: 'Escuela pública en Banfield',
        description: 'Nuevo programa educativo',
        section: 'Educación',
        municipality: 'Banfield',
        publishedAt: new Date('2026-10-05'),
      },
      body: 'contenido sobre educación',
    },
  ];

  it('encuentra artículos por título', () => {
    const results = searchArticles(mockArticles, 'tránsito');
    expect(results).toHaveLength(1);
    expect(results[0]?.data.slug).toBe('noticia-transito');
  });

  it('encuentra artículos por municipio', () => {
    const results = searchArticles(mockArticles, 'banfield');
    expect(results).toHaveLength(1);
    expect(results[0]?.data.slug).toBe('escuela-banfield');
  });

  it('retorna array vacío cuando no hay resultados', () => {
    const results = searchArticles(mockArticles, 'inexistente');
    expect(results).toHaveLength(0);
  });

  it('retorna array vacío con query vacía', () => {
    const results = searchArticles(mockArticles, '');
    expect(results).toHaveLength(0);
  });

  it('búsqueda con múltiples términos (AND lógico)', () => {
    const results = searchArticles(mockArticles, 'escuela banfield');
    expect(results).toHaveLength(1);
  });

  it('es case-insensitive', () => {
    const results = searchArticles(mockArticles, 'TRÁNSITO');
    expect(results).toHaveLength(1);
  });

  it('busca en el cuerpo del artículo', () => {
    const results = searchArticles(mockArticles, 'educación');
    expect(results.length).toBeGreaterThan(0);
  });
});
