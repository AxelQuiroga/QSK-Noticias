import { describe, it, expect } from 'vitest';
import { slugify } from '../src/lib/utils';
import { filterByMunicipality } from '../src/lib/search';

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
