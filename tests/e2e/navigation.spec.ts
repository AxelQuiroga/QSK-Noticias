import { test, expect } from '@playwright/test';

test.describe('Navegación', () => {
  test('navega a una sección', async ({ page }) => {
    await page.goto('/');
    const viewport = page.viewportSize();
    const isMobile = viewport !== null && viewport.width < 768;

    if (isMobile) {
      await page.locator('#menu-toggle').click();
      const menu = page.getByRole('navigation', { name: 'Navegación móvil' });
      // "Tránsito" vive dentro del grupo "Ciudad": hay que expandirlo.
      await menu.getByRole('button', { name: 'Ciudad', exact: true }).click();
      await menu.locator('a', { hasText: 'Tránsito' }).click();
    } else {
      const nav = page.locator('nav[aria-label="Navegación principal"]');
      await nav.getByRole('button', { name: 'Ciudad', exact: true }).click();
      await nav.locator('a', { hasText: 'Tránsito' }).click();
    }

    await expect(page).toHaveURL(/\/secciones\/transito/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Tránsito');
  });

  test('navega al hub editorial Internacional', async ({ page }) => {
    await page.goto('/');
    const viewport = page.viewportSize();
    const isMobile = viewport !== null && viewport.width < 768;

    if (isMobile) {
      await page.locator('#menu-toggle').click();
      const menu = page.getByRole('navigation', { name: 'Navegación móvil' });
      await menu.getByRole('link', { name: 'Internacional', exact: true }).click();
    } else {
      const nav = page.locator('nav[aria-label="Navegación principal"]');
      await nav.getByRole('link', { name: 'Internacional', exact: true }).click();
    }

    await expect(page).toHaveURL(/\/internacional\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Internacional');
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

  test('página institucional: quiénes somos e intro audiovisual', async ({ page }) => {
    await page.goto('/quienes-somos/');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Quiénes somos');

    const introVideo = page.locator('[data-intro] video');
    await expect(introVideo).toHaveAttribute('data-mobile-src', '/videos/qsk-intro-vertical.mp4');
    await expect(introVideo).toHaveAttribute('data-desktop-src', '/videos/qsk-intro.mp4');

    const expectedVideo =
      (page.viewportSize()?.width ?? 1280) <= 640
        ? '/videos/qsk-intro-vertical.mp4'
        : '/videos/qsk-intro.mp4';
    await expect
      .poll(() =>
        introVideo.evaluate((video: HTMLVideoElement) =>
          video.currentSrc ? new URL(video.currentSrc).pathname : '',
        ),
      )
      .toBe(expectedVideo);

    await expect(introVideo).toHaveAttribute('muted', '');
    await expect(introVideo).toHaveAttribute('playsinline', '');
    await expect(introVideo).not.toHaveAttribute('controls');
    await expect(introVideo).toHaveAttribute('aria-hidden', 'true');
    await expect(introVideo).toHaveAttribute('tabindex', '-1');

    await expect(page.getByText('es un medio digital independiente en sus comienzos.')).toBeVisible();
    await expect(page.getByText('Nuestra misión es acercar información clara')).toBeVisible();
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
