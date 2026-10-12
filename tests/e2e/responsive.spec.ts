import { test, expect } from '@playwright/test';

test.describe('Responsive', () => {
  test('sin scroll horizontal en móvil (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('sin scroll horizontal en tablet (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('sin scroll horizontal en escritorio (1440px)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('menú móvil se abre con click', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    const toggle = page.getByRole('button', { name: /menú de navegación/ });
    await expect(toggle).toBeVisible();
    await toggle.click();
    const menu = page.getByRole('navigation', { name: 'Navegación móvil' });
    await expect(menu).toBeVisible();
  });

  test('noticia principal aparece antes que últimas noticias en móvil', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    const featured = page.locator('article').first();
    const latestHeading = page.getByRole('heading', { name: 'Últimas noticias' });
    const featuredBox = await featured.boundingBox();
    const latestBox = await latestHeading.boundingBox();
    expect(featuredBox!.y).toBeLessThan(latestBox!.y);
  });
});
