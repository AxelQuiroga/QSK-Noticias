
import { test, expect } from '@playwright/test';

test.describe('E2E: rutas existentes', () => {
  test('la portada carga correctamente', async ({ page }) => {
    const response = await page.goto('/');

    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/QSK Noticias/);
  });

  test('la página de noticias carga correctamente', async ({ page }) => {
    const response = await page.goto('/noticias/');

    expect(response?.status()).toBe(200);
  });

  test('la navegación conserva el enlace a la portada', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('a[href="/"]').first()).toBeVisible();
  });
});

test.describe('E2E: página Internacional', () => {
  test('la ruta responde correctamente y muestra el título', async ({
    page,
  }) => {
    const response = await page.goto('/internacional/');

    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Internacional',
      }),
    ).toBeVisible();
  });

  test('muestra artículos internacionales o el estado vacío', async ({
    page,
  }) => {
    await page.goto('/internacional/');

    const articleCards = page.locator('main article');
    const emptyState = page.getByRole('heading', {
      level: 2,
      name: 'Todavía no hay noticias internacionales',
    });

    const articleCount = await articleCards.count();

    if (articleCount > 0) {
      await expect(articleCards.first()).toBeVisible();
    } else {
      await expect(emptyState).toBeVisible();
    }
  });

  test('los artículos mostrados pertenecen a la sección Internacional', async ({
    page,
  }) => {
    await page.goto('/internacional/');

    const articleCards = page.locator('main article');

    for (const article of await articleCards.all()) {
      await expect(article).toBeVisible();
    }
  });

  test('la navegación incluye el enlace a Internacional', async ({ page }) => {
    await page.goto('/');

    const internationalLink = page.getByRole('link', {
      name: 'Internacional',
      exact: true,
    });

    await expect(internationalLink).toBeVisible();
    await expect(internationalLink).toHaveAttribute(
      'href',
      '/internacional/',
    );
  });

  test('permite navegar de inicio a Internacional y volver', async ({
    page,
  }) => {
    await page.goto('/');

    await page.getByRole('link', {
      name: 'Internacional',
      exact: true,
    }).click();

    await expect(page).toHaveURL(/\/internacional\/$/);

    await page.locator('a[href="/"]').first().click();

    await expect(page).toHaveURL(/\/$/);
  });
});
