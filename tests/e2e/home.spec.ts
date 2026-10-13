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
    await expect(featured).toContainText(/tránsito/i);
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
    const logo = page.getByRole('link', { name: /QSK Noticias.*Inicio/ });
    await expect(logo).toBeVisible();
  });

  test('el footer tiene enlaces institucionales', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Quiénes somos' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Contacto' })).toBeVisible();
  });
});
