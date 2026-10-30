import { test, expect } from '@playwright/test';

test.describe('Carrusel Nacional', () => {
  test('muestra hasta seis noticias y permite abrir el detalle desde el titular', async ({ page }) => {
    await page.goto('/');
    const carousel = page.locator('[data-national-carousel]');
    test.skip(await carousel.count() === 0, 'El dataset Nacional todavía está vacío.');

    const cards = carousel.locator('[data-national-card]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(6);

    const href = await cards.first().locator('h3 a').getAttribute('href');
    expect(href).toMatch(/^\/nacional\/[^/]+\/$/);

    await cards.first().locator('h3 a').click();
    await expect(page).toHaveURL(new RegExp(href!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
    await expect(page.locator('main h1')).toBeVisible();
  });

  test('mantiene todas las tarjetas con la misma altura', async ({ page }) => {
    await page.goto('/');
    const carousel = page.locator('[data-national-carousel]');
    test.skip(await carousel.count() === 0, 'El dataset Nacional todavía está vacío.');

    const cards = carousel.locator('[data-national-card]');
    const heights = await cards.evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().height),
    );

    expect(heights.length).toBeGreaterThan(0);
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
  });

  test('recorta los textos y ofrece un enlace explícito para leer la noticia', async ({ page }) => {
    await page.goto('/');
    const carousel = page.locator('[data-national-carousel]');
    test.skip(await carousel.count() === 0, 'El dataset Nacional todavía está vacío.');

    const firstCard = carousel.locator('[data-national-card]').first();
    const title = firstCard.locator('h3');
    await expect(title.locator('a')).toHaveAttribute('href', /^\/nacional\//);
    await expect(firstCard.getByRole('link', { name: /Leer noticia/ })).toHaveAttribute('href', /^\/nacional\//);
    await expect(title).toHaveCSS('-webkit-line-clamp', '3');

    const description = firstCard.locator('[data-national-card-description]');
    if (await description.count()) {
      await expect(description).toHaveCSS('-webkit-line-clamp', '3');
    }
  });

  test('los controles avanzan y retroceden por el carrusel', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const carousel = page.locator('[data-national-carousel]');
    test.skip(await carousel.count() === 0, 'El dataset Nacional todavía está vacío.');

    const track = carousel.locator('[data-national-track]');
    const previous = carousel.getByRole('button', { name: 'Ver noticias nacionales anteriores' });
    const next = carousel.getByRole('button', { name: 'Ver más noticias nacionales' });

    await expect(previous).toBeDisabled();
    await expect(next).toBeEnabled();
    await next.click();
    await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    await previous.click();
    await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBe(0);
  });

  test('el enlace Ver todas lleva al índice Nacional', async ({ page }) => {
    await page.goto('/');
    const carousel = page.locator('[data-national-carousel]');
    test.skip(await carousel.count() === 0, 'El dataset Nacional todavía está vacío.');

    await expect(carousel.getByRole('link', { name: /Ver todas/ })).toHaveAttribute('href', '/nacional/');
  });
});
