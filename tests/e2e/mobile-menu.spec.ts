import { test, expect } from '@playwright/test';

/**
 * Regresión: el menú hamburguesa dejaba de responder después de navegar.
 * Causa: el listener quedaba pegado al nodo original y el ClientRouter
 * reemplazaba el header en cada navegación.
 */
test.describe('Menú móvil hamburguesa (regresión)', () => {
  test('abre, cierra y vuelve a abrir después de navegar a otra sección', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const toggle = page.locator('#menu-toggle');
    const menu = page.getByRole('navigation', { name: 'Navegación móvil' });

    // Abrir / cerrar en la primera página
    await toggle.click();
    await expect(menu).toBeVisible();
    await toggle.click();
    await expect(menu).toBeHidden();

    // Abrir y navegar a una sección
    await toggle.click();
    await expect(menu).toBeVisible();
    await menu.locator('a', { hasText: 'Actualidad' }).click();
    await expect(page).toHaveURL(/\/secciones\/actualidad/);

    // Volver a abrir en la página de destino ← acá fallaba el bug
    await toggle.click();
    await expect(menu).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    // Cerrar de nuevo
    await toggle.click();
    await expect(menu).toBeHidden();
  });

  test('navega por tres secciones consecutivas reabriendo el menú en cada una', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const toggle = page.locator('#menu-toggle');
    const menu = page.getByRole('navigation', { name: 'Navegación móvil' });

    const secciones = [
      { texto: 'Actualidad', url: /\/secciones\/actualidad/ },
      { texto: 'Deportes', url: /\/secciones\/deportes/ },
      { texto: 'Economía', url: /\/secciones\/economia/ },
    ];

    for (const seccion of secciones) {
      await toggle.click();
      await expect(menu).toBeVisible();
      await menu.locator('a', { hasText: seccion.texto }).click();
      await expect(page).toHaveURL(seccion.url);
      // Tras navegar el menú debe quedar cerrado, sin overlay visible
      await expect(menu).toBeHidden();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    }
  });

  test('el menú sigue respondiendo tras navegar hacia atrás', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const toggle = page.locator('#menu-toggle');
    const menu = page.getByRole('navigation', { name: 'Navegación móvil' });

    await toggle.click();
    await menu.locator('a', { hasText: 'Actualidad' }).click();
    await expect(page).toHaveURL(/\/secciones\/actualidad/);

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);

    await toggle.click();
    await expect(menu).toBeVisible();
  });
});

test.describe('Escritorio: el menú hamburguesa no debe interferir', () => {
  test('nav horizontal visible y botón hamburguesa oculto', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const nav = page.locator('nav[aria-label="Navegación principal"]');
    const toggle = page.locator('#menu-toggle');

    await expect(nav).toBeVisible();
    await expect(toggle).toBeHidden();

    // Navegar por la nav de escritorio y seguir funcionando
    await nav.locator('a', { hasText: 'Tránsito' }).click();
    await expect(page).toHaveURL(/\/secciones\/transito/);
    await expect(nav).toBeVisible();
    await expect(toggle).toBeHidden();
  });
});
