import { test, expect } from '@playwright/test';
import { getNationalArticles } from '../../src/lib/nacional';

const nationalArticles = getNationalArticles();
const completeArticle = nationalArticles.find((article) => Boolean(article.content?.trim()));
const partialArticle = nationalArticles.find((article) => !article.content?.trim());
const articleWithoutImage = nationalArticles.find((article) => !article.image);
const articleWithImage = nationalArticles.find((article) => Boolean(article.image));

test.describe('Hub Nacional', () => {
  test('responde con título y canonical propios', async ({ page }) => {
    const response = await page.goto('/nacional/');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: 'Nacional' })).toBeVisible();
    if (nationalArticles.length === 0) {
      await expect(page.getByRole('heading', { level: 2, name: 'Todavía no hay noticias nacionales' })).toBeVisible();
    }
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/nacional\/$/);
  });

  test('lista los registros del dataset solo dentro del hub Nacional', async ({ page }) => {
    test.skip(nationalArticles.length === 0, 'Se ejecuta cuando el dataset Nacional ya tiene registros.');
    await page.goto('/nacional/');
    await expect(page.locator('main article')).toHaveCount(nationalArticles.length);

    for (const article of nationalArticles) {
      await expect(page.locator('main article').getByRole('link', { name: article.title!, exact: true }))
        .toHaveAttribute('href', '/nacional/' + article.slug + '/');
    }
    await expect(page.locator('main a[href^="/noticias/"]')).toHaveCount(0);
  });

  test('muestra fallback en la tarjeta cuando falta la imagen', async ({ page }) => {
    test.skip(!articleWithoutImage, 'Se ejecuta cuando el dataset Nacional contiene un artículo sin imagen.');
    const article = articleWithoutImage!;
    await page.goto('/nacional/');
    const card = page.locator('main article').filter({ hasText: article.title! });
    await expect(card.getByText('Imagen no disponible')).toBeVisible();
  });

  test('muestra fallback en la tarjeta cuando falla la imagen remota', async ({ page }) => {
    test.skip(!articleWithImage, 'Se ejecuta cuando el dataset Nacional contiene una imagen remota.');
    const article = articleWithImage!;
    await page.route(article.image!.src, (route) => route.abort());
    await page.goto('/nacional/');
    const card = page.locator('main article').filter({ hasText: article.title! });
    await expect(card.locator('[data-national-card-fallback]')).toBeVisible();
  });
  test('conserva el navbar de master sin agregar Nacional como enlace en escritorio', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const nav = page.locator('header nav').first();

    await expect(nav.getByRole('link', { name: 'Portada', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Internacional', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Nacional', exact: true })).toHaveCount(0);
  });

  test('conserva el menú móvil de master sin agregar Nacional como enlace', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.locator('#menu-toggle').click();
    const menu = page.locator('#mobile-menu');

    await expect(menu.getByRole('link', { name: 'Portada', exact: true })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Internacional', exact: true })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Nacional', exact: true })).toHaveCount(0);
  });
});

test.describe('Detalle Nacional con datos', () => {
  test('muestra un artículo completo y su fuente original', async ({ page }) => {
    test.skip(!completeArticle, 'Se ejecuta cuando el dataset Nacional contiene un artículo con cuerpo.');
    const article = completeArticle!;
    await page.goto('/nacional/' + article.slug + '/');

    await expect(page.getByRole('heading', { level: 1, name: article.title! })).toBeVisible();
    await expect(page.getByText(article.content!, { exact: false })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Leer publicación original en Argentina.gob.ar' }))
      .toHaveAttribute('href', article.url);
  });

  test('muestra un artículo parcial y enlaza la fuente cuando falta el cuerpo', async ({ page }) => {
    test.skip(!partialArticle, 'Se ejecuta cuando el dataset Nacional contiene un artículo sin cuerpo.');
    const article = partialArticle!;
    await page.goto('/nacional/' + article.slug + '/');

    await expect(page.getByRole('heading', { level: 1, name: article.title! })).toBeVisible();
    await expect(page.getByText('El contenido completo de esta noticia no está disponible en QSK Noticias.'))
      .toBeVisible();
    await expect(page.getByRole('link', { name: 'Leer publicación original en Argentina.gob.ar' }))
      .toHaveAttribute('href', article.url);
  });

  test('usa el fallback cuando una noticia no tiene imagen', async ({ page }) => {
    test.skip(!articleWithoutImage, 'Se ejecuta cuando el dataset Nacional contiene un artículo sin imagen.');
    await page.goto('/nacional/' + articleWithoutImage!.slug + '/');
    await expect(page.getByText('Imagen no disponible').first()).toBeVisible();
  });

  test('usa el fallback cuando falla la imagen remota', async ({ page }) => {
    test.skip(!articleWithImage, 'Se ejecuta cuando el dataset Nacional contiene una imagen remota.');
    const article = articleWithImage!;
    await page.route(article.image!.src, (route) => route.abort());
    await page.goto('/nacional/' + article.slug + '/');
    await expect(page.locator('[data-national-image-fallback]')).toBeVisible();
  });
});
