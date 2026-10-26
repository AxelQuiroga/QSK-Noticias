
import { describe, expect, it } from 'vitest';
import {
  isInternational,
  getCountryName,
  getCountryRegion,
  COUNTRY_CODES,
  GEOGRAPHIC_REGIONS,
} from '@/lib/international';

describe('International utilities', () => {
  describe('isInternational', () => {
    it('identifica una noticia de la sección Internacional', () => {
      const article = {
        section: 'Internacional',
      };

      expect(isInternational(article)).toBe(true);
    });

    it('no identifica una noticia local como internacional', () => {
      const article = {
        section: 'Sociedad',
        municipality: 'Lanús',
        country: 'AR',
      };

      expect(isInternational(article)).toBe(false);
    });

    it('no identifica como internacional una noticia sin sección', () => {
      const article = {
        country: 'JP',
      };

      expect(isInternational(article)).toBe(false);
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
    });
  });

  describe('COUNTRY_CODES', () => {
    it('incluye los países utilizados en las pruebas', () => {
      expect(COUNTRY_CODES).toHaveProperty('AR');
      expect(COUNTRY_CODES).toHaveProperty('FR');
      expect(COUNTRY_CODES).toHaveProperty('JP');
      expect(COUNTRY_CODES).toHaveProperty('EG');
      expect(COUNTRY_CODES).toHaveProperty('AU');
    });

    it('contiene códigos con formato ISO alfa-2', () => {
      for (const code of Object.keys(COUNTRY_CODES)) {
        expect(code).toMatch(/^[A-Z]{2}$/);
      }
    });
  });
});
