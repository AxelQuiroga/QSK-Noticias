import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { NAV_GROUPS } from '../../src/data/sections';

test.describe('Accesibilidad', () => {
  test('portada no tiene violaciones críticas de axe', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(critical).toEqual([]);
  });

  test('artículo no tiene violaciones críticas de axe', async ({ page }) => {
    await page.goto('/noticias/ejemplo-transito/');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(critical).toEqual([]);
  });

  test('header con un desplegable abierto no tiene violaciones críticas de axe', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const nav = page.locator('nav[aria-label="Navegación principal"]');

    // Se auditan TODOS los grupos abiertos: el desplegable es el patrón que
    // más fácil se rompe (foco, nombres accesibles de los ítems, contraste).
    for (const label of NAV_GROUPS.map((group) => group.label)) {
      await nav.getByRole('button', { name: label, exact: true }).click();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const critical = results.violations.filter((v) => v.impact === 'critical');
      expect(critical, `Violaciones críticas con el grupo "${label}" abierto`).toEqual([]);

      await page.keyboard.press('Escape');
    }
  });

  test('navegación por teclado: tabReachMain', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).not.toBe('BODY');
  });
});
