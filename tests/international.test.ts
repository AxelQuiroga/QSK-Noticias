
import { describe, expect, it } from 'vitest';
import {
  isInternational,
  getCountryName,
  getCountryRegion,
  COUNTRY_CODES,
  GEOGRAPHIC_REGIONS,
} from '../src/lib/international';

describe('International utilities', () => {
  describe('isInternational', () => {
    it('identifica una noticia con alcance internacional', () => {
      expect(isInternational({ data: { scope: 'internacional' } } as never)).toBe(true);
    });

    it('no identifica una noticia local como internacional', () => {
      expect(isInternational({ data: { scope: 'local' } } as never)).toBe(false);
    });

    it('no identifica como internacional una noticia sin alcance internacional', () => {
      expect(isInternational({ data: { scope: undefined, country: 'JP' } } as never)).toBe(false);
    });
  });

  describe('getCountryName', () => {
    it.each([
      ['AR', 'Argentina'],
      ['FR', 'Francia'],
      ['JP', 'Japón'],
    ])('devuelve el nombre de %s', (code, expectedName) => {
      expect(getCountryName(code)).toBe(expectedName);
    });

    it('devuelve undefined para un código desconocido', () => {
      expect(getCountryName('XX')).toBeUndefined();
      expect(getCountryName('toString')).toBeUndefined();
    });
  });

  describe('getCountryRegion', () => {
    it.each([
      ['AR', GEOGRAPHIC_REGIONS.AMERICAS],
      ['FR', GEOGRAPHIC_REGIONS.EUROPE],
      ['JP', GEOGRAPHIC_REGIONS.ASIA],
      ['EG', GEOGRAPHIC_REGIONS.AFRICA],
      ['AU', GEOGRAPHIC_REGIONS.OCEANIA],
    ])('devuelve la región correspondiente a %s', (code, expectedRegion) => {
      expect(getCountryRegion(code)).toBe(expectedRegion);
    });

    it('devuelve undefined para un código desconocido', () => {
      expect(getCountryRegion('XX')).toBeUndefined();
      expect(getCountryRegion('toString')).toBeUndefined();
    });
  });

  describe('COUNTRY_CODES', () => {
    it('incluye los países utilizados en las pruebas', () => {
      expect(COUNTRY_CODES).toHaveProperty('AR');
      expect(COUNTRY_CODES).toHaveProperty('FR');
      expect(COUNTRY_CODES).toHaveProperty('JP');
      expect(COUNTRY_CODES).toHaveProperty('EG');
      expect(COUNTRY_CODES).toHaveProperty('AU');
      expect(COUNTRY_CODES).toHaveProperty('GB');
      expect(COUNTRY_CODES).not.toHaveProperty('UK');
    });

    it('contiene códigos con formato ISO alfa-2', () => {
      for (const code of Object.keys(COUNTRY_CODES)) {
        expect(code).toMatch(/^[A-Z]{2}$/);
      }
    });
  });
});
