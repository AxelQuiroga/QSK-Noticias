import { describe, it, expect } from 'vitest';
import {
  ACTUALIDAD_SECTION,
  LEGACY_SECTIONS,
  NAV_DIRECT,
  NAV_GROUPS,
  SECTIONS,
  TOPICS,
  isKnownSection,
  isKnownTopic,
  isLegacySection,
} from '../src/data/sections';
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

/**
 * La agrupación del header no es una taxonomía paralela: referencia NOMBRES de
 * `SECTIONS` para que la ruta siga saliendo de `slugify()`. Estos tests fijan
 * la estructura acordada y evitan que se desincronice del catálogo.
 */
describe('agrupación de la navegación principal', () => {
  const NAV_SECTIONS = [...NAV_GROUPS.flatMap((group) => group.sections), ...NAV_DIRECT];

  it('respeta la estructura acordada del header', () => {
    expect(NAV_GROUPS.map((group) => group.label)).toEqual(['Actualidad', 'Comunidad', 'Ciudad']);
    expect(NAV_GROUPS.map((group) => group.sections)).toEqual([
      ['Política', 'Sociedad'],
      ['Seguridad', 'Servicios', 'Salud', 'Educación'],
      ['Obras públicas', 'Tránsito'],
    ]);
    expect(NAV_DIRECT).toEqual(['Economía', 'Deportes']);
  });

  it('solo referencia secciones del catálogo', () => {
    for (const section of NAV_SECTIONS) {
      expect(isKnownSection(section), `"${section}" no pertenece a SECTIONS`).toBe(true);
    }
  });

  it('no repite una sección en dos lugares del nav', () => {
    expect(new Set(NAV_SECTIONS).size).toBe(NAV_SECTIONS.length);
  });

  it('no usa como grupo el nombre de una sección con ruta, salvo "Actualidad"', () => {
    // "Comunidad" y "Ciudad" son agrupaciones visuales: no deben existir como
    // sección, porque entonces el header estaría escondiendo una ruta real.
    for (const label of NAV_GROUPS.map((group) => group.label)) {
      if (label === 'Actualidad') continue;
      expect(isKnownSection(label), `"${label}" no debe ser una sección del catálogo`).toBe(false);
    }
  });

  it('expone todas las secciones del catálogo salvo "Actualidad"', () => {
    // "Actualidad" es sección y nombre de grupo a la vez: se llega desde el
    // sidebar de la portada y desde la etiqueta de cada tarjeta, no desde el
    // header. Es una decisión editorial documentada en `sections.ts`.
    const sinEntradaEnElHeader = SECTIONS.filter(
      (section) => section !== 'Actualidad' && !NAV_SECTIONS.includes(section),
    );
    expect(sinEntradaEnElHeader).toEqual([]);
  });

  it('genera ids URL-friendly para los grupos del header', () => {
    const ids = NAV_GROUPS.map((group) => slugify(group.label));
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });
});

/**
 * `Actualidad` dejó de ser un tema editorial: su página es el listado de las
 * noticias publicadas en los últimos días (`src/lib/actualidad.ts`). Estos
 * tests fijan la separación entre el catálogo de topics asignables y la
 * sección de compatibilidad que sostiene la URL publicada.
 */
describe('topics oficiales vs. sección de compatibilidad', () => {
  it('mantiene exactamente los diez topics oficiales', () => {
    expect(TOPICS).toEqual([
      'Deportes',
      'Economía',
      'Educación',
      'Obras públicas',
      'Política',
      'Salud',
      'Seguridad',
      'Servicios',
      'Sociedad',
      'Tránsito',
    ]);
  });

  it('no permite clasificar un artículo como "Actualidad"', () => {
    expect(TOPICS).not.toContain('Actualidad');
    expect(isKnownTopic('Actualidad')).toBe(false);
    expect(isKnownTopic(ACTUALIDAD_SECTION)).toBe(false);
  });

  it('conserva "Actualidad" solo como sección de compatibilidad y ruta publicada', () => {
    expect(ACTUALIDAD_SECTION).toBe('Actualidad');
    expect(LEGACY_SECTIONS).toEqual([ACTUALIDAD_SECTION]);
    expect(isLegacySection(ACTUALIDAD_SECTION)).toBe(true);
    // La URL sigue existiendo: la página cambió de sentido, no de dirección.
    expect(isKnownSection(ACTUALIDAD_SECTION)).toBe(true);
    expect(SECTIONS).toEqual([...LEGACY_SECTIONS, ...TOPICS]);
  });

  it('no marca como compatibilidad a ningún topic del catálogo', () => {
    for (const topic of TOPICS) {
      expect(isLegacySection(topic), `"${topic}" no es una sección legacy`).toBe(false);
    }
    expect(isLegacySection('Cocina')).toBe(false);
  });
});
