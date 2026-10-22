import { test, expect } from '@playwright/test';

test.describe('Rutas de gacetillas de GBA', () => {
  test('la página de la fuente GBA responde y muestra solo sus gacetillas', async ({ page }) => {
    const response = await page.goto('/gacetillas-oficiales/fuente/gba/');

    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: /Gacetillas de Gobierno de la Provincia de Buenos Aires/ })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Últimas gacetillas' })).toBeVisible();

    const tarjetas = page.locator('article');
    expect(await tarjetas.count()).toBeGreaterThan(0);
    for (const tarjeta of await tarjetas.all()) {
      await expect(tarjeta).toContainText('Gobierno de la Provincia de Buenos Aires');
    }
  });

  test('el archivo de GBA responde aunque todavía no tenga gacetillas anteriores', async ({ page }) => {
    const response = await page.goto('/gacetillas-oficiales/fuente/gba/archivo/');

    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: /Archivo de gacetillas de Gobierno de la Provincia de Buenos Aires/ })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Gacetillas anteriores' })).toBeVisible();

    const mensajeVacio = page.getByText('Todavía no hay gacetillas en el archivo de esta fuente: las últimas doce siguen en su sección principal.');
    const tarjetas = page.locator('article');
    if (await tarjetas.count() === 0) {
      await expect(mensajeVacio).toBeVisible();
    } else {
      for (const tarjeta of await tarjetas.all()) {
        await expect(tarjeta).toContainText('Gobierno de la Provincia de Buenos Aires');
      }
    }
  });
});
