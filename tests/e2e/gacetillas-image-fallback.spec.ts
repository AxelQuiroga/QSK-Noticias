import { test, expect } from '@playwright/test';

test.describe('Fallback de imágenes de gacetillas', () => {
  test.beforeEach(async ({ page }) => {
    // Simula el servidor de imágenes externo caído (timeout / 5xx / DNS).
    await page.route('https://www.gba.gob.ar/**', (route) => route.abort());
    await page.goto('/');
  });

  test('muestra un marcador 16:9 cuando la imagen externa falla', async ({ page }) => {
    const firstCard = page.locator('section[aria-labelledby="gacetillas-heading"] article').first();
    const imageLink = firstCard.locator('a').first();

    // Forzar el inicio de la carga lazy de la imagen.
    await imageLink.scrollIntoViewIfNeeded();

    const image = firstCard.locator('img');
    const fallback = firstCard.locator('[data-gacetilla-img-fallback]');

    await expect(fallback).toBeVisible();
    await expect(fallback).toContainText('Imagen no disponible');
    await expect(image).toBeHidden();

    // El contenedor conserva la proporción 16:9.
    const box = await imageLink.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(Math.abs(box!.width / box!.height - 16 / 9)).toBeLessThan(0.05);

    await firstCard.screenshot({ path: 'test-results/gacetillas-fallback.png' });
  });

  test('las tarjetas siguen siendo navegables con la imagen caída', async ({ page }) => {
    const firstCard = page.locator('section[aria-labelledby="gacetillas-heading"] article').first();
    await firstCard.scrollIntoViewIfNeeded();

    const titleLink = firstCard.locator('h3 a');
    await expect(titleLink).toBeVisible();
    await expect(titleLink).toHaveAttribute('href', /^https:\/\/www\.gba\.gob\.ar\//);
  });
});
