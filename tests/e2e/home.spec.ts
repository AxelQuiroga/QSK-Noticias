import { test, expect } from '@playwright/test';

test.describe('Portada', () => {
  test('carga correctamente con título y descripción', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/QSK Noticias/);
  });

  test('muestra la noticia principal destacada', async ({ page }) => {
    await page.goto('/');
    const featured = page.locator('article').first();
    await expect(featured).toBeVisible();
    await expect(featured.locator('h3 a')).toBeVisible();
  });

  test('muestra las últimas noticias', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Últimas noticias' })).toBeVisible();
    const cards = page.locator('main article');
    await expect(cards.first()).toBeVisible();
  });

  test('tiene navegación por secciones', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Secciones' })).toBeVisible();
  });

  test('tiene navegación por municipios', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#municipalities-heading')).toBeVisible();
  });

  test('el header tiene el logo QSK', async ({ page }) => {
    await page.goto('/');
    // El header tiene dos enlaces a "/": el logo y "Portada" (nav principal).
    // Se acota por el nombre accesible del logo para no caer en strict mode.
    const logo = page.locator('header').getByRole('link', { name: /QSK Noticias/i });
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute('aria-label', /QSK Noticias/i);
  });

  test('el footer tiene enlaces institucionales', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Quiénes somos' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Contacto' })).toBeVisible();
  });
});
