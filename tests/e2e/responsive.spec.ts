import { test, expect } from '@playwright/test';

/**
 * Prueba de regresión responsive.
 *
 * Verifica que `document.documentElement.scrollWidth` no supere
 * `window.innerWidth` (sin desbordamiento horizontal accidental) en las
 * páginas y viewports críticos.
 *
 * Viewports probados: 320, 360, 390, 430, 768, 1024, 1440 px.
 *
 * Excepción documentada: los carruseles horizontales intencionales
 * (data-carousel-track) tienen scrollWidth > clientWidth por diseño, pero
 * no provocan desbordamiento del documento (documentElement). Esta prueba
 * mide el documento completo, no el track del carrusel.
 */
const VIEWPORTS = [320, 360, 390, 430, 768, 1024, 1440];

const PAGES = [
  '/',
  '/gacetillas-oficiales/',
  '/gacetillas-oficiales/archivo/',
  '/gacetillas-oficiales/fuente/gba/',
  '/gacetillas-oficiales/fuente/esteban-echeverria/',
];

test.describe('responsive: sin desbordamiento horizontal', () => {
  for (const viewport of VIEWPORTS) {
    for (const page of PAGES) {
      test(`${page} @ ${viewport}px no desborda horizontalmente`, async ({
        page: pwPage,
      }) => {
        await pwPage.setViewportSize({ width: viewport, height: 900 });
        await pwPage.goto(page, { waitUntil: 'networkidle' });

        const dims = await pwPage.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          clientWidth: document.documentElement.clientWidth,
        }));

        // El documento no debe exceder el ancho del viewport.
        expect(dims.scrollWidth).toBeLessThanOrEqual(dims.innerWidth);
      });
    }
  }
});

test.describe('encabezados de gacetillas en portada', () => {
  test('muestra "Ver más" en lugar del enlace largo, en móvil y escritorio', async ({
    page: pwPage,
  }) => {
    for (const viewport of [320, 390, 768, 1440]) {
      await pwPage.setViewportSize({ width: viewport, height: 900 });
      await pwPage.goto('/', { waitUntil: 'networkidle' });

      // Ambas fuentes deben tener el enlace corto "Ver más".
      for (const fuente of ['gba', 'esteban-echeverria']) {
        const heading = pwPage.locator(
          `#gacetillas-${fuente}-heading`
        );
        await expect(heading).toBeVisible();

        const enlace = pwPage.locator(
          `section[aria-labelledby="gacetillas-${fuente}-heading"] a:has-text("Ver más")`
        );
        await expect(enlace).toHaveText('Ver más ↗');
        await expect(enlace).not.toContainText('Ver todas las publicaciones de');
      }

      // El documento no debe desbordarse en ningún viewport.
      const { scrollWidth, innerWidth } = await pwPage.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    }
  });

  test('el carrusel oficial conserva desplazamiento horizontal funcional', async ({
    page: pwPage,
  }) => {
    await pwPage.setViewportSize({ width: 390, height: 900 });
    await pwPage.goto('/', { waitUntil: 'networkidle' });

    const track = pwPage.locator('section[aria-labelledby="gacetillas-gba-heading"] [data-carousel-track]');
    if ((await track.count()) > 0) {
      await expect(track).toBeVisible();
      const scrollable = await track.evaluate(
        (el) => el.scrollWidth > el.clientWidth
      );
      // Cuando hay carrusel, debe poder desplazarse (scrollWidth > clientWidth).
      expect(scrollable).toBeTruthy();
    }
  });
});
