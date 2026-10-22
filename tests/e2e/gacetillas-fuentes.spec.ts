import { expect, test } from '@playwright/test';

/**
 * Secciones por fuente municipal (/gacetillas-oficiales/fuente/<id>/).
 *
 * CON EL DATASET ACTUAL (solo GBA, en su forma legada sin campo `fuente`)
 * estas rutas todavía NO existen: se generan solas cuando la automatización
 * de qsk-breves-automaticas aporte registros municipales. Por eso el test
 * es tolerante: acepta 404 (todavía sin datos) o 200 con el contenido
 * correcto. La única falla real es un 5xx (ruta rota en el build) o un 200
 * que no corresponda a la fuente pedida.
 */

const MUNICIPIOS = [
  { id: 'lanus', nombre: 'Municipalidad de Lanús' },
  { id: 'avellaneda', nombre: 'Municipalidad de Avellaneda' },
  { id: 'esteban-echeverria', nombre: 'Municipalidad de Esteban Echeverría' },
] as const;

test.describe('Secciones por fuente municipal', () => {
  for (const { id, nombre } of MUNICIPIOS) {
    test(`la sección de ${nombre} siempre responde de forma consistente`, async ({ request }) => {
      const respuesta = await request.get(`/gacetillas-oficiales/fuente/${id}/`);

      expect(respuesta.status(), 'la ruta no debe romper el servidor').toBeLessThan(500);

      if (respuesta.status() === 200) {
        const html = await respuesta.text();
        expect(html).toContain(`Gacetillas de ${nombre}`);
        // El texto duro de GBA nunca puede aparecer en una sección municipal:
        expect(html).not.toContain('Gacetillas de Gobierno de la Provincia');
      }
    });

    test(`el archivo de ${nombre} siempre responde de forma consistente`, async ({ request }) => {
      const respuesta = await request.get(`/gacetillas-oficiales/fuente/${id}/archivo/`);

      expect(respuesta.status(), 'la ruta no debe romper el servidor').toBeLessThan(500);

      if (respuesta.status() === 200) {
        const html = await respuesta.text();
        expect(html).toContain(`Archivo de gacetillas de ${nombre}`);
      }
    });
  }

  test('la portada de gacetillas nunca tiene chips de fuentes sin datos', async ({ page }) => {
    await page.goto('/gacetillas-oficiales/');
    const navFuente = page.locator('nav[aria-label="Fuentes locales"]');
    const chipsPresentes = await navFuente.count();

    if (chipsPresentes > 0) {
      // Solo puede haber chips si la fuente tiene registros (página propia):
      for (const chip of await navFuente.locator('a').all()) {
        const href = await chip.getAttribute('href');
        expect(href, 'chip de fuente sin página propia').toMatch(
          /^\/gacetillas-oficiales\/fuente\/[a-z0-9-]+\/$/,
        );
      }
    }
  });
});
