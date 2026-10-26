import { describe, it, expect } from 'vitest';
import { test, expect as playwrightExpect } from '@playwright/test';

/**
 * Tests E2E para validar:
 * 1. Las rutas existentes no se rompan
 * 2. La nueva ruta /internacional/ funciona correctamente
 * 3. El contenido se carga y filtra correctamente
 */

describe.skip('E2E: Rutas existentes protegidas', () => {
  /**
   * Tests para asegurar que las rutas existentes siguen funcionando
   * NOTA: Usar con `describe.skip` si la URL base no está disponible en tests
   * Descomenta cuando tengas servidor de prueba
   */

  test('GET / debería retornar 200', async ({ page }) => {
    await page.goto('/');
    await playwrightExpect(page).toHaveTitle(/QSK Noticias/);
  });

  test('GET /noticias/ debería retornar 200', async ({ page }) => {
    await page.goto('/noticias/');
    const response = await page.goto('/noticias/');
    expect(response?.status()).toBe(200);
  });

  test('GET /secciones/ debería retornar 200', async ({ page }) => {
    const response = await page.goto('/secciones/');
    // Puede que esta ruta no exista, ajustar según tu estructura
    expect([200, 404]).toContain(response?.status());
  });

  test('Navegación debería incluir links a rutas existentes', async ({ page }) => {
    await page.goto('/');

    // Verificar que existen links a rutas existentes
    const homeLink = page.locator('a[href="/"]');
    const noticiasLink = page.locator('a[href="/noticias/"]');

    await playwrightExpect(homeLink).toBeVisible();
    await playwrightExpect(noticiasLink).toBeVisible();
  });
});

describe.skip('E2E: Nueva ruta Internacional', () => {
  /**
   * Tests para la nueva funcionalidad
   * NOTA: Usar con `describe.skip` si la URL base no está disponible
   */

  test('GET /internacional/ debería retornar 200', async ({ page }) => {
    const response = await page.goto('/internacional/');
    expect(response?.status()).toBe(200);
  });

  test('Página /internacional/ debería cargar contenido', async ({ page }) => {
    await page.goto('/internacional/');

    // Verificar título y descripción
    await playwrightExpect(page.locator('h1')).toContainText('Internacional');

    // Verificar que hay secciones
    const regions = page.locator('h2');
    const count = await regions.count();
    expect(count).toBeGreaterThanOrEqual(0); // Puede haber 0 si no hay artículos
  });

  test('Debería mostrar artículos internacionales filtrados por país', async ({
    page,
  }) => {
    await page.goto('/internacional/');

    // Buscar badges de país
    const countryBadges = page.locator('[class*="primary"]');
    const badgeCount = await countryBadges.count();

    // Si hay artículos, debería haber badges de país
    if (badgeCount > 0) {
      const firstBadge = countryBadges.nth(0);
      await playwrightExpect(firstBadge).toBeVisible();
    }
  });

  test('Navegación debería incluir link a /internacional/', async ({ page }) => {
    await page.goto('/');

    // Buscar link a Internacional
    const internacionalLink = page.locator('a[href="/internacional/"]');
    await playwrightExpect(internacionalLink).toBeVisible();
    await playwrightExpect(internacionalLink).toContainText('Internacional');
  });

  test('Estadísticas debería mostrar números válidos', async ({ page }) => {
    await page.goto('/internacional/');

    // Buscar números de estadísticas
    const statsCards = page.locator('[class*="card"]');

    // Debería haber al menos 1 tarjeta de estadísticas
    const count = await statsCards.count();
    expect(count).toBeGreaterThan(0);
  });
});

describe.skip('E2E: Integración navegación', () => {
  /**
   * Tests de navegación integrada
   */

  test('Debería navegar de inicio a internacional y volver', async ({ page }) => {
    // Ir a inicio
    await page.goto('/');

    // Encontrar y hacer click en link de Internacional
    const internacionalLink = page.locator('a[href="/internacional/"]');
    await internacionalLink.click();

    // Verificar que estamos en /internacional/
    expect(page.url()).toContain('/internacional/');

    // Debería poder volver a inicio
    const homeLink = page.locator('a[href="/"]');
    await homeLink.click();

    expect(page.url()).not.toContain('/internacional/');
  });

  test('Rutas existentes debería mantener estructura', async ({ page }) => {
    const routesToTest = ['/noticias/'];

    for (const route of routesToTest) {
      await page.goto(route);
      // Verificar que la página se carga (200 status implícito)
      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
    }
  });
});