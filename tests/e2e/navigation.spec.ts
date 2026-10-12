import { test, expect } from '@playwright/test';

test.describe('Navegación', () => {
  test('navega a una sección', async ({ page }) => {
    await page.goto('/');
    const viewport = page.viewportSize();
    const isMobile = viewport !== null && viewport.width < 768;

    if (isMobile) {
      await page.locator('#menu-toggle').click();
      await page.locator('#mobile-menu a', { hasText: 'Tránsito' }).click();
    } else {
      await page.locator('nav[aria-label="Navegación principal"] a', { hasText: 'Tránsito' }).click();
    }

    await expect(page).toHaveURL(/\/secciones\/transito/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Tránsito');
  });

  test('navega a un municipio', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Lomas de Zamora' }).first().click();
    await expect(page).toHaveURL(/\/municipios\/lomas-de-zamora/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Lomas de Zamora');
  });

  test('muestra 404 en página no encontrada', async ({ page }) => {
    const response = await page.goto('/pagina-inexistente/');
    expect(response?.status()).toBe(404);
  });

  test('página institucional: quiénes somos', async ({ page }) => {
    await page.goto('/quienes-somos/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Quiénes somos');
  });

  test('página institucional: contacto', async ({ page }) => {
    await page.goto('/contacto/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Contacto');
  });

  test('página institucional: criterios editoriales', async ({ page }) => {
    await page.goto('/criterios-editoriales/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Criterios editoriales');
  });

  test('página institucional: correcciones', async ({ page }) => {
    await page.goto('/correcciones/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Correcciones');
  });
});
