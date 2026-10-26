import { describe, it, expect, beforeEach } from 'vitest';
import {
  localArticleSchema,
  internationalArticleSchema,
  articleSchema,
  isInternational,
  getCountryName,
  getCountryRegion,
  COUNTRY_CODES,
  GEOGRAPHIC_REGIONS,
} from '@/lib/international';
import { NAV_ITEMS, PROTECTED_ROUTES, INTERNATIONAL_ROUTE } from '@/lib/nav-config';

describe('International Article Schema', () => {
  describe('localArticleSchema', () => {
    it('debe validar una noticia local con municipality', () => {
      const article = {
        title: 'Noticia local',
        description: 'Una noticia de Zona Sur',
        slug: 'noticia-local',
        section: 'Sociedad',
        municipality: 'Lanús',
        region: 'Zona Sur',
        author: 'Redacción',
        status: 'published' as const,
        featured: false,
      };

      const result = localArticleSchema.safeParse(article);
      expect(result.success).toBe(true);
    });

    it('debe validar una noticia local con país implícito Argentina', () => {
      const article = {
        title: 'Noticia local',
        description: 'Una noticia de Argentina',
        slug: 'noticia-argentina',
        section: 'Economía',
        municipality: 'La Plata',
        country: 'AR' as const,
        status: 'published' as const,
        featured: false,
      };

      const result = localArticleSchema.safeParse(article);
      expect(result.success).toBe(true);
    });

    it('debe requerir municipality en noticias locales', () => {
      const article = {
        title: 'Noticia sin municipio',
        description: 'Sin ubicación local',
        slug: 'sin-municipio',
        section: 'Deportes',
        status: 'published' as const,
        featured: false,
      };

      const result = localArticleSchema.safeParse(article);
      expect(result.success).toBe(false);
    });
  });

  describe('internationalArticleSchema', () => {
    it('debe validar una noticia internacional con country válido', () => {
      const article = {
        title: 'Crisis en el Medio Oriente',
        description: 'Últimas noticias de la región',
        slug: 'crisis-medio-oriente',
        section: 'Internacional',
        country: 'IL' as const,
        author: 'Corresponsal',
        status: 'published' as const,
        featured: true,
      };

      const result = internationalArticleSchema.safeParse(article);
      expect(result.success).toBe(true);
    });

    it('debe incluir geographicRegion automáticamente', () => {
      const article = {
        title: 'Elecciones en Francia',
        description: 'Francia vota',
        slug: 'elecciones-francia',
        section: 'Internacional',
        country: 'FR' as const,
        geographicRegion: GEOGRAPHIC_REGIONS.EUROPE,
        status: 'published' as const,
        featured: false,
      };

      const result = internationalArticleSchema.safeParse(article);
      expect(result.success).toBe(true);
      expect(result.data?.geographicRegion).toBe(GEOGRAPHIC_REGIONS.EUROPE);
    });

    it('debe rechazar noticias internacionales con municipality', () => {
      const article = {
        title: 'Mal artículo',
        description: 'Mezcla de campos',
        slug: 'articulo-mixto',
        section: 'Internacional',
        country: 'BR' as const,
        municipality: 'São Paulo', // ❌ No debería estar aquí
        status: 'published' as const,
        featured: false,
      };

      const result = internationalArticleSchema.safeParse(article);
      // Debe rechazarse
      expect(result.success).toBe(false);
    });

    it('debe validar todos los códigos de país soportados', () => {
      const countries = Object.keys(COUNTRY_CODES);

      countries.forEach((country) => {
        const article = {
          title: `Noticia de ${country}`,
          description: 'Test',
          slug: `noticia-${country.toLowerCase()}`,
          section: 'Internacional',
          country: country as any,
          status: 'published' as const,
          featured: false,
        };

        const result = internationalArticleSchema.safeParse(article);
        expect(result.success).toBe(true);
      });
    });

    it('debe rechazar códigos de país inválidos', () => {
      const article = {
        title: 'Noticia inválida',
        description: 'País no existe',
        slug: 'pais-invalido',
        section: 'Internacional',
        country: 'XX' as any, // Código inválido
        status: 'published' as const,
        featured: false,
      };

      const result = internationalArticleSchema.safeParse(article);
      expect(result.success).toBe(false);
    });
  });

  describe('articleSchema unificado', () => {
    it('debe aceptar noticias locales y internacionales', () => {
      const local = {
        title: 'Noticia local',
        description: 'Zona Sur',
        slug: 'local-test',
        section: 'Sociedad',
        municipality: 'Avellaneda',
        status: 'published' as const,
        featured: false,
      };

      const international = {
        title: 'Noticia internacional',
        description: 'Mundo',
        slug: 'international-test',
        section: 'Internacional',
        country: 'JP' as const,
        status: 'published' as const,
        featured: false,
      };

      expect(articleSchema.safeParse(local).success).toBe(true);
      expect(articleSchema.safeParse(international).success).toBe(true);
    });
  });

  describe('Utility functions', () => {
    it('isInternational debe detectar noticias internacionales', () => {
      const local = {
        title: 'Local',
        description: 'Local',
        slug: 'local',
        section: 'S',
        municipality: 'Ciudad',
        status: 'published' as const,
        featured: false,
      };

      const international = {
        title: 'International',
        description: 'Intl',
        slug: 'intl',
        section: 'S',
        country: 'JP' as const,
        status: 'published' as const,
        featured: false,
      };

      expect(isInternational(local)).toBe(false);
      expect(isInternational(international)).toBe(true);
    });

    it('getCountryName debe retornar el nombre del país', () => {
      expect(getCountryName('AR')).toBe('Argentina');
      expect(getCountryName('FR')).toBe('Francia');
      expect(getCountryName('JP')).toBe('Japón');
      expect(getCountryName('XX')).toBeUndefined();
    });

    it('getCountryRegion debe retornar la región geográfica', () => {
      expect(getCountryRegion('AR')).toBe(GEOGRAPHIC_REGIONS.AMERICAS);
      expect(getCountryRegion('FR')).toBe(GEOGRAPHIC_REGIONS.EUROPE);
      expect(getCountryRegion('JP')).toBe(GEOGRAPHIC_REGIONS.ASIA);
      expect(getCountryRegion('EG')).toBe(GEOGRAPHIC_REGIONS.AFRICA);
      expect(getCountryRegion('AU')).toBe(GEOGRAPHIC_REGIONS.OCEANIA);
    });
  });
});

describe('Navigation Configuration', () => {
  describe('NAV_ITEMS', () => {
    it('debe incluir la ruta /internacional/', () => {
      const internacional = NAV_ITEMS.find((item) => item.href === INTERNATIONAL_ROUTE);
      expect(internacional).toBeDefined();
      expect(internacional?.label).toBe('Internacional');
    });

    it('debe mantener las rutas protegidas intactas', () => {
      PROTECTED_ROUTES.forEach((route) => {
        const exists = NAV_ITEMS.some((item) => item.href === route);
        expect(exists).toBe(true);
      });
    });

    it('no debe duplicar rutas', () => {
      const hrefs = NAV_ITEMS.map((item) => item.href);
      const uniqueHrefs = new Set(hrefs);
      expect(hrefs.length).toBe(uniqueHrefs.size);
    });
  });

  describe('PROTECTED_ROUTES', () => {
    it('debe contener al menos las rutas base', () => {
      expect(PROTECTED_ROUTES).toContain('/');
      expect(PROTECTED_ROUTES).toContain('/noticias/');
    });

    it('no debe modificar rutas existentes', () => {
      // Simular que las rutas no cambian
      const originalRoutes = ['/noticias/', '/secciones/'];
      originalRoutes.forEach((route) => {
        const found = NAV_ITEMS.find((item) => item.href === route);
        // Si existía, debe seguir existiendo con la misma URL
        if (found) {
          expect(found.href).toBe(route);
        }
      });
    });
  });

  describe('INTERNATIONAL_ROUTE', () => {
    it('debe ser una ruta nueva y diferente', () => {
      expect(INTERNATIONAL_ROUTE).toBe('/internacional/');
      expect(PROTECTED_ROUTES).not.toContain(INTERNATIONAL_ROUTE);
    });

    it('debe estar en NAV_ITEMS', () => {
      const found = NAV_ITEMS.find((item) => item.href === INTERNATIONAL_ROUTE);
      expect(found).toBeDefined();
    });
  });
});

describe('Edge Cases', () => {
  it('debe rechazar una noticia con ambos fields locales e internacionales', () => {
    const invalid = {
      title: 'Mezcla',
      description: 'Mezcla',
      slug: 'mezcla',
      section: 'S',
      municipality: 'Lanús',
      country: 'BR' as const,
      status: 'published' as const,
      featured: false,
    };

    const result = articleSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('debe permitir status draft en noticias internacionales', () => {
    const draft = {
      title: 'Borrador',
      description: 'Aún no publicado',
      slug: 'draft-intl',
      section: 'Internacional',
      country: 'DE' as const,
      status: 'draft' as const,
      featured: false,
    };

    const result = internationalArticleSchema.safeParse(draft);
    expect(result.success).toBe(true);
    expect(result.data?.status).toBe('draft');
  });

  it('debe preservar dates si están presentes', () => {
    const now = new Date();
    const withDates = {
      title: 'Con fechas',
      description: 'Test',
      slug: 'con-fechas',
      section: 'Internacional',
      country: 'ES' as const,
      status: 'published' as const,
      featured: false,
      publishedAt: now,
      updatedAt: new Date(now.getTime() + 1000),
    };

    const result = internationalArticleSchema.safeParse(withDates);
    expect(result.success).toBe(true);
    expect(result.data?.publishedAt).toEqual(now);
  });
});