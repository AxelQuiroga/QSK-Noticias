import { test, expect } from '@playwright/test';

test.describe('Búsqueda', () => {
  test('carga la página de búsqueda', async ({ page }) => {
    await page.goto('/buscar/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Buscar');
  });

  test('muestra resultados al buscar', async ({ page }) => {
    await page.goto('/buscar/');
    await page.getByLabel('Buscar noticias').fill('tránsito');
    await expect(page.locator('#search-list li:not(.hidden)').first()).toBeVisible({ timeout: 10000 });
  });

  test('muestra mensaje sin resultados', async ({ page }) => {
    await page.goto('/buscar/');
    await page.getByLabel('Buscar noticias').fill('inexistente12345');
    await expect(page.getByText('No se encontraron resultados')).toBeVisible({ timeout: 10000 });
  });

  test('muestra placeholder con input vacío', async ({ page }) => {
    await page.goto('/buscar/');
    await expect(page.getByText('Escribí un término para buscar')).toBeVisible();
  });

  test('búsqueda case-insensitive', async ({ page }) => {
    await page.goto('/buscar/');
    await page.getByLabel('Buscar noticias').fill('TRÁNSITO');
    await expect(page.locator('#search-list li:not(.hidden)').first()).toBeVisible({ timeout: 10000 });
  });
});
