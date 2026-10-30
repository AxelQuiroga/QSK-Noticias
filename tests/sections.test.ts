import { describe, it, expect } from 'vitest';
import {
  ACTUALIDAD_SECTION,
  LEGACY_SECTIONS,
  NAV_DIRECT,
  NAV_GROUPS,
  NAV_ITEMS,
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
describe('navegación principal del header', () => {
  const NAV_SECTIONS = [...NAV_GROUPS.flatMap((group) => group.sections), ...NAV_DIRECT];

  it('agrupa toda la cobertura local y separa los hubs Nacional e Internacional', () => {
    expect(NAV_GROUPS.map((group) => group.label)).toEqual(['Locales']);
    expect(NAV_GROUPS[0]?.sections).toEqual([ACTUALIDAD_SECTION, ...TOPICS]);
    expect(NAV_DIRECT).toEqual(['Nacional', 'Internacional']);
  });

  it('respeta el orden acordado en pantalla', () => {
    expect(NAV_ITEMS.map((item) => (item.kind === 'group' ? item.label : item.section))).toEqual([
      'Locales',
      'Nacional',
      'Internacional',
    ]);
  });

  it('conserva Actualidad dentro de Locales con su ruta temática histórica', () => {
    expect(NAV_DIRECT).not.toContain(ACTUALIDAD_SECTION);
    expect(NAV_GROUPS[0]?.sections).toContain(ACTUALIDAD_SECTION);
    const international = NAV_ITEMS.find((item) => item.kind === 'link' && item.section === 'Internacional');
    const national = NAV_ITEMS.find((item) => item.kind === 'link' && item.section === 'Nacional');
    expect(international).toMatchObject({ kind: 'link', href: '/internacional/' });
    expect(national).toMatchObject({ kind: 'link', href: '/nacional/' });
    expect(TOPICS).not.toContain('Internacional');
    expect(SECTIONS).not.toContain('Nacional');
  });
  it('las secciones de los grupos y los enlaces convencionales pertenecen al catálogo', () => {
    for (const item of NAV_ITEMS) {
      if (item.kind === 'group') {
        for (const section of item.sections) {
          expect(isKnownSection(section), `"${section}" no pertenece a SECTIONS`).toBe(true);
        }
      } else if (!item.href) {
        expect(isKnownSection(item.section), `"${item.section}" no pertenece a SECTIONS`).toBe(true);
      }
    }
  });

  it('no repite una sección en dos lugares del nav', () => {
    expect(new Set(NAV_SECTIONS).size).toBe(NAV_SECTIONS.length);
  });

  it('no usa como grupo el nombre de una sección con ruta', () => {
    // "Locales" es una agrupación visual:
    // no deben existir como sección, porque entonces el desplegable estaría
    // escondiendo una ruta real del catálogo.
    for (const label of NAV_GROUPS.map((group) => group.label)) {
      expect(isKnownSection(label), `"${label}" no debe ser una sección del catálogo`).toBe(false);
    }
  });

  it('expone todas las secciones del catálogo en el header', () => {
    // Los temas van dentro de su desplegable y "Actualidad" como acceso
    // directo: no queda ninguna ruta del catálogo sin entrada en la navegación.
    const sinEntradaEnElHeader = SECTIONS.filter((section) => !NAV_SECTIONS.includes(section));
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
