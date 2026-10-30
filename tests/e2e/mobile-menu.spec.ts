import { test, expect, type Locator } from '@playwright/test';
import { NAV_GROUPS } from '../../src/data/sections';

/**
 * Regresión: el menú hamburguesa dejaba de responder después de navegar.
 * Causa: el listener quedaba pegado al nodo original y el ClientRouter
 * reemplazaba el header en cada navegación.
 *
 * Los grupos ahora arrancan colapsados, así que navegar a una sección agrupada
 * requiere expandir su grupo primero (como haría una persona con el pulgar).
 */
async function navegarDesdeMenu(menu: Locator, seccion: string) {
  const link = menu.locator('a', { hasText: seccion });
  if (!(await link.isVisible())) {
    const grupo = NAV_GROUPS.find((group) => group.sections.includes(seccion));
    if (!grupo) throw new Error(`"${seccion}" no está en ningún grupo del menú móvil`);
    await menu.getByRole('button', { name: grupo.label, exact: true }).click();
  }
  await link.click();
}

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
    await navegarDesdeMenu(menu, 'Política');
    await expect(page).toHaveURL(/\/secciones\/politica/);

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
      { texto: 'Política', url: /\/secciones\/politica/ },
      { texto: 'Deportes', url: /\/secciones\/deportes/ },
      { texto: 'Economía', url: /\/secciones\/economia/ },
    ];

    for (const seccion of secciones) {
      await toggle.click();
      await expect(menu).toBeVisible();
      await navegarDesdeMenu(menu, seccion.texto);
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
    await navegarDesdeMenu(menu, 'Política');
    await expect(page).toHaveURL(/\/secciones\/politica/);

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

    // Navegar por la nav de escritorio (grupo "Locales") y seguir funcionando
    await nav.getByRole('button', { name: 'Locales', exact: true }).click();
    await nav.locator('a', { hasText: 'Tránsito' }).click();
    await expect(page).toHaveURL(/\/secciones\/transito/);
    await expect(nav).toBeVisible();
    await expect(toggle).toBeHidden();
  });
});
