import { test, expect } from '@playwright/test';

test.describe('Artículo', () => {
  test('abre un artículo desde la portada', async ({ page }) => {
    await page.goto('/');
    await page.locator('article h3 a').first().click();
    await expect(page).toHaveURL(/\/noticias\//);
  });

  test('muestra titular, bajada y metadatos', async ({ page }) => {
    await page.goto('/noticias/ejemplo-transito/');
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toContainText('Ejemplo de noticia');
    await expect(page.getByText('Redacción QSK')).toBeVisible();
    const breadcrumb = page.getByRole('navigation', { name: 'Miga de pan' });
    await expect(breadcrumb.getByText('Tránsito')).toBeVisible();
    await expect(breadcrumb.getByText('Lomas de Zamora')).toBeVisible();
  });

  test('muestra el cuerpo del artículo', async ({ page }) => {
    await page.goto('/noticias/ejemplo-transito/');
    const content = page.locator('.prose-content');
    await expect(content.locator('strong').filter({ hasText: 'contenido de demostración' })).toBeVisible();
  });

  test('tiene miga de pan para volver', async ({ page }) => {
    await page.goto('/noticias/ejemplo-transito/');
    await expect(page.getByRole('navigation', { name: 'Miga de pan' })).toBeVisible();
  });

  test('tiene enlace para volver a la portada', async ({ page }) => {
    await page.goto('/noticias/ejemplo-transito/');
    await page.getByRole('link', { name: /Volver a la portada/ }).click();
    await expect(page).toHaveURL('/');
  });

  test('tiene JSON-LD de NewsArticle', async ({ page }) => {
    await page.goto('/noticias/ejemplo-transito/');
    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toHaveCount(1);
    const content = await jsonLd.textContent();
    expect(content).toContain('NewsArticle');
    expect(content).toContain('schema.org');
  });
});
