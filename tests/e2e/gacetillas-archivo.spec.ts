import { test, expect } from '@playwright/test';

const SECTION = 'section[aria-labelledby="archivo-heading"]';

test.describe('Archivo de gacetillas oficiales', () => {
  test('la página de archivo responde con su encabezado propio', async ({ page }) => {
    await page.goto('/gacetillas-oficiales/archivo/');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Archivo de gacetillas oficiales' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Gacetillas anteriores' })).toBeVisible();
  });

  test('es consistente con el dataset: estado vacío o tarjetas con detalle interno', async ({ page }) => {
    await page.goto('/gacetillas-oficiales/archivo/');

    const tarjetas = page.locator(`${SECTION} article`);
    const cantidad = await tarjetas.count();

    if (cantidad === 0) {
      await expect(page.getByText(/Todavía no hay gacetillas en el archivo/)).toBeVisible();
      return;
    }

    // Cada tarjeta del archivo enlaza a la página de detalle interna
    // (la URL persistente) y conserva el enlace a la publicación original.
    const titulos = tarjetas.locator('h3 a');
    await expect(titulos).toHaveCount(cantidad);

    const hrefs = await titulos.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('href') ?? ''),
    );
    for (const href of hrefs) {
      expect(href).toMatch(/^\/gacetillas-oficiales\/[a-z0-9-]+\/$/);
    }
    await expect(page.locator(`${SECTION} article h3 a[href^="http"]`)).toHaveCount(0);

    const originales = tarjetas.getByRole('link', { name: 'Publicación original' });
    await expect(originales).toHaveCount(cantidad);
    for (const original of await originales.all()) {
      await expect(original).toHaveAttribute('target', '_blank');
      await expect(original).toHaveAttribute('rel', /noopener/);
    }
  });
});
