import { describe, it, expect } from 'vitest';
import { SECTIONS, isKnownSection } from '../src/data/sections';
import { slugify } from '../src/lib/utils';

/**
 * Secciones que ya existían antes de ampliar el catálogo. Deben conservarse:
 * renombrarlas o quitarlas rompería las URLs `/secciones/*` ya publicadas.
 */
const PREEXISTING = [
  'Actualidad',
  'Deportes',
  'Economía',
  'Educación',
  'Obras públicas',
  'Salud',
  'Tránsito',
];

/** Secciones incorporadas para clasificar noticias locales con más precisión. */
const ADDED = ['Política', 'Servicios', 'Seguridad', 'Sociedad'];

describe('catálogo de secciones', () => {
  it('conserva todas las secciones preexistentes', () => {
    for (const section of PREEXISTING) {
      expect(SECTIONS).toContain(section);
    }
  });

  it('incorpora las secciones nuevas', () => {
    for (const section of ADDED) {
      expect(SECTIONS).toContain(section);
    }
  });

  it('no repite secciones', () => {
    expect(new Set(SECTIONS).size).toBe(SECTIONS.length);
  });

  it('genera slugs únicos y URL-friendly para cada sección', () => {
    const slugs = SECTIONS.map(slugify);
    expect(new Set(slugs).size).toBe(SECTIONS.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it('genera las rutas /secciones/* esperadas para las secciones nuevas', () => {
    // Si alguno de estos slugs cambia, cambia la URL pública de la sección.
    expect(slugify('Política')).toBe('politica');
    expect(slugify('Seguridad')).toBe('seguridad');
    expect(slugify('Servicios')).toBe('servicios');
    expect(slugify('Sociedad')).toBe('sociedad');
  });
});

describe('isKnownSection', () => {
  it('acepta todas las secciones del catálogo', () => {
    for (const section of SECTIONS) {
      expect(isKnownSection(section)).toBe(true);
    }
  });

  it('rechaza valores que no pertenecen al catálogo', () => {
    expect(isKnownSection('Cocina')).toBe(false);
    // El catálogo distingue mayúsculas y tildes: el slug no es el nombre.
    expect(isKnownSection('servicios')).toBe(false);
    expect(isKnownSection('Obras Publicas')).toBe(false);
    expect(isKnownSection('')).toBe(false);
  });
});
