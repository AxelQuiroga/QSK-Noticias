import { test, expect } from '@playwright/test';

const CAROUSEL_SECTION = 'section[aria-labelledby="gacetillas-gba-heading"]';
const GACETILLAS_SECTION = 'section[aria-labelledby="gacetillas-heading"]';

test.describe('Fallback de imágenes oficiales', () => {
  test.beforeEach(async ({ page }) => {
    // Simula el servidor de imágenes externo caído (timeout / 5xx / DNS).
    await page.route('**/*', (route) => {
      if (route.request().resourceType() === 'image') return route.abort();
      return route.continue();
    });
  });

  test('el carrusel de portada muestra el marcador 16:9 cuando la imagen falla', async ({ page }) => {
    await page.goto('/');

    const firstCard = page.locator(`${CAROUSEL_SECTION} [data-carousel-track] > li`).first();
    // Forzar el inicio de la carga lazy de la imagen.
    await firstCard.scrollIntoViewIfNeeded();

    const image = firstCard.locator('img');
    const fallback = firstCard.locator('[data-carousel-img-fallback]');

    await expect(fallback).toBeVisible();
    await expect(fallback).toContainText('Imagen no disponible');
    await expect(image).toBeHidden();

    // El contenedor conserva la proporción 16:9.
    const box = await firstCard.locator('a:has([data-carousel-img-fallback])').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(Math.abs(box!.width / box!.height - 16 / 9)).toBeLessThan(0.05);

    await firstCard.screenshot({ path: 'test-results/novedades-oficiales-fallback.png' });
  });

  test('la página de detalle también muestra el marcador cuando la imagen falla', async ({ page }) => {
    await page.goto('/');
    // El enlace a la imagen está dentro de article; el li no tiene un <a> directo.
    const href = await page
      .locator(`${CAROUSEL_SECTION} [data-carousel-track] > li article > a[href^="/gacetillas-oficiales/"]`)
      .first()
      .getAttribute('href');
    await page.goto(href!);

    await expect(page.locator('[data-gacetilla-detail-img-fallback]')).toBeVisible();
    await expect(page.locator('[data-gacetilla-detail-img]')).toBeHidden();
  });

  test('la página dedicada también muestra el marcador cuando la imagen falla', async ({ page }) => {
    await page.goto('/gacetillas-oficiales/');

    const firstCard = page.locator(`${GACETILLAS_SECTION} article`).first();
    await firstCard.scrollIntoViewIfNeeded();

    await expect(firstCard.locator('[data-gacetilla-img-fallback]')).toBeVisible();
    await expect(firstCard.locator('img')).toBeHidden();
  });
});
