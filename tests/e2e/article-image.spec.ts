import { test, expect } from '@playwright/test';

const ARTICLE_WITH_IMAGE = 'corte-transito-avenida-smith-ezpeleta-octubre-2026';

test.describe('Imágenes de noticias', () => {
  test('muestra la imagen del artículo con texto alternativo y crédito', async ({ page }) => {
    await page.goto(`/noticias/${ARTICLE_WITH_IMAGE}/`);

    const figure = page.locator('article figure');
    const image = figure.locator('img');

    await expect(figure).toBeVisible();
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute('src', /^\/images\/noticias\//);
    await expect(image).toHaveAttribute('alt', /\S+/);
    await expect(image).toHaveAttribute('width');
    await expect(image).toHaveAttribute('height');
    await expect(image).toHaveAttribute('srcset');
    await expect(image).toHaveAttribute('sizes');
    await expect(image).toHaveAttribute('loading', 'eager');
    await expect(image).toHaveAttribute('fetchpriority', 'high');
    await expect(figure.locator('figcaption')).toContainText('Foto: Municipio de Quilmes');

    await expect
      .poll(() =>
        image.evaluate((element: HTMLImageElement) => ({
          complete: element.complete,
          naturalWidth: element.naturalWidth,
        })),
      )
      .toMatchObject({ complete: true, naturalWidth: expect.any(Number) });

    const naturalWidth = await image.evaluate((element: HTMLImageElement) => element.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);
  });

  test('la imagen no provoca desbordamiento horizontal en móvil', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/noticias/${ARTICLE_WITH_IMAGE}/`);

    const image = page.locator('article figure img');
    await expect(image).toBeVisible();

    const imageBox = await image.boundingBox();
    expect(imageBox).not.toBeNull();
    expect(imageBox!.x).toBeGreaterThanOrEqual(0);
    expect(imageBox!.x + imageBox!.width).toBeLessThanOrEqual(375);

    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(documentWidth).toBeLessThanOrEqual(375);
  });
});
