import { describe, it, expect } from 'vitest';
import { slugify } from '../src/lib/utils';
import { filterByMunicipality, searchArticles } from '../src/lib/search';

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

describe('filterByMunicipality', () => {
  const mockArticles = [
    {
      id: '1',
      data: {
        slug: 'noticia-lanus',
        title: 'Noticia de Lanús',
        description: 'Noticia de prueba',
        section: 'Actualidad',
        municipality: 'Lanús',
        publishedAt: new Date('2026-10-01'),
      },
      body: 'contenido',
    },
    {
      id: '2',
      data: {
        slug: 'noticia-quilmes',
        title: 'Noticia de Quilmes',
        description: 'Noticia de prueba',
        section: 'Salud',
        municipality: 'Quilmes',
        publishedAt: new Date('2026-10-02'),
      },
      body: 'contenido',
    },
    {
      id: '3',
      data: {
        slug: 'noticia-lanus-2',
        title: 'Otra noticia de Lanús',
        description: 'Noticia de prueba',
        section: 'Deportes',
        municipality: 'Lanús',
        publishedAt: new Date('2026-10-03'),
      },
      body: 'contenido',
    },
  ];

  it('devuelve solo los artículos del municipio seleccionado', () => {
    const results = filterByMunicipality(mockArticles, 'Lanús');
    expect(results.map((a) => a.id)).toEqual(['1', '3']);
  });

  it('devuelve todos cuando no se selecciona municipio', () => {
    expect(filterByMunicipality(mockArticles, '')).toHaveLength(3);
    expect(filterByMunicipality(mockArticles, null)).toHaveLength(3);
  });

  it('devuelve vacío si ningún artículo coincide', () => {
    expect(filterByMunicipality(mockArticles, 'Avellaneda')).toHaveLength(0);
  });
});
