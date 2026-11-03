import { describe, it, expect } from 'vitest';
import { LOCATIONS, getLocationsByType, getProvinciaOf, getPaisOf, findLocationByName } from '../src/data/locations';

describe('Catálogo territorial nacional', () => {
  it('contiene las 24 jurisdicciones argentinas', () => {
    const provincias = getLocationsByType('provincia');
    expect(provincias).toHaveLength(24);
  });

  it('incluye CABA como jurisdicción propia', () => {
    const caba = findLocationByName('Ciudad Autónoma de Buenos Aires');
    expect(caba).toBeDefined();
    expect(caba?.type).toBe('provincia');
    expect(caba?.parentId).toBe('pais-argentina');
  });

  it('resuelve la provincia cuando la ubicación ya es una provincia', () => {
    expect(getProvinciaOf('Córdoba')).toBe('Córdoba');
    expect(getProvinciaOf('Santa Fe')).toBe('Santa Fe');
  });

  it('resuelve la provincia de un municipio', () => {
    expect(getProvinciaOf('Lanús')).toBe('Buenos Aires');
  });

  it('resuelve el país de una provincia', () => {
    expect(getPaisOf('Córdoba')).toBe('Argentina');
  });

  it('no duplica identificadores', () => {
    const ids = LOCATIONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
