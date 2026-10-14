import { describe, it, expect } from 'vitest';
import { isIndexablePath, slugifyLite, collectReferencedLocalidadSlugs } from '../src/lib/sitemap-policy.mjs';
import { slugify } from '../src/lib/utils';
import { SECTIONS } from '../src/data/sections';
import { LOCATIONS } from '../src/data/locations';

const NO_REFERENCED = { referencedLocalidades: new Set<string>() };

describe('isIndexablePath', () => {
  it('excluye rutas de utilidad', () => {
    expect(isIndexablePath('/404/')).toBe(false);
    expect(isIndexablePath('/404')).toBe(false);
    expect(isIndexablePath('/buscar/')).toBe(false);
    expect(isIndexablePath('/buscar')).toBe(false);
  });

  it('incluye portada, institucionales, noticias, secciones y taxonomía', () => {
    expect(isIndexablePath('/')).toBe(true);
    expect(isIndexablePath('/quienes-somos/')).toBe(true);
    expect(isIndexablePath('/politica-de-privacidad/')).toBe(true);
    expect(isIndexablePath('/noticias/adoquines-banfield-obras-municipales-2026/')).toBe(true);
    expect(isIndexablePath('/secciones/obras-publicas/')).toBe(true);
    expect(isIndexablePath('/municipios/quilmes/')).toBe(true);
    expect(isIndexablePath('/regiones/amba/')).toBe(true);
  });

  it('excluye localidades sin artículos etiquetados (thin content)', () => {
    expect(isIndexablePath('/localidades/banfield/', NO_REFERENCED)).toBe(false);
    expect(isIndexablePath('/localidades/ezpeleta', NO_REFERENCED)).toBe(false);
  });

  it('incluye solo las localidades referenciadas por artículos publicados', () => {
    const ctx = { referencedLocalidades: new Set(['banfield']) };
    expect(isIndexablePath('/localidades/banfield/', ctx)).toBe(true);
    expect(isIndexablePath('/localidades/ezpeleta/', ctx)).toBe(false);
  });

  it('excluye también subrutas de las rutas de utilidad (exclusión por prefijo)', () => {
    expect(isIndexablePath('/buscar/resultados/')).toBe(false);
    expect(isIndexablePath('/buscarx/')).toBe(true);
  });
});

describe('slugifyLite', () => {
  it('produce el mismo slug que src/lib/utils.ts para todo el catálogo editorial', () => {
    const names = [...SECTIONS, ...LOCATIONS.map((l) => l.name)];
    for (const name of names) {
      expect(slugifyLite(name)).toBe(slugify(name));
    }
  });

  it('normaliza acentos, espacios y mayúsculas', () => {
    expect(slugifyLite('Zona Sur')).toBe('zona-sur');
    expect(slugifyLite('Obras públicas')).toBe('obras-publicas');
    expect(slugifyLite('Lanús')).toBe('lanus');
  });
});

describe('collectReferencedLocalidadSlugs', () => {
  it('detecta las localidades etiquetadas en artículos publicados', () => {
    const slugs = collectReferencedLocalidadSlugs('src/content/noticias');
    expect(slugs.has('banfield')).toBe(true);
    expect(slugs.has('ezpeleta')).toBe(true);
  });

  it('sólo detecta localidades que existen en el catálogo', () => {
    const catalogSlugs = new Set(
      LOCATIONS.filter((location) => location.type === 'localidad').map((location) =>
        slugify(location.name),
      ),
    );
    for (const referenced of collectReferencedLocalidadSlugs('src/content/noticias')) {
      expect(catalogSlugs).toContain(referenced);
    }
  });
});
