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
    await expect(featured.locator('h3 a')).toBeVisible();
  });

  test('mantiene el navbar de main sin agregar Nacional como enlace principal', async ({ page }) => {
    await page.goto('/');
    const isMobile = (page.viewportSize()?.width ?? 1280) < 768;
    if (isMobile) await page.locator('#menu-toggle').click();
    const nav = isMobile ? page.locator('#mobile-menu') : page.locator('header nav').first();
    await expect(nav.getByRole('link', { name: 'Portada', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Nacional', exact: true })).toHaveCount(0);
    await expect(nav.getByRole('button', { name: 'Ciudad', exact: true })).toBeVisible();
  });

  test('no muestra el carrusel Nacional cuando el dataset esta vacio', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-national-carousel]')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Nacional', exact: true })).toHaveCount(0);
  });

  test('muestra las últimas noticias', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Últimas noticias' })).toBeVisible();
    const cards = page.locator('main article');
    await expect(cards.first()).toBeVisible();
  });


  test('muestra el carrusel de Deportes sin convertir a Olé en una sección del sitio', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#deportes-ole-carousel-heading')).toHaveText('Deportes');
    await expect(page.locator('section[aria-labelledby="deportes-ole-carousel-heading"]')).toBeVisible();
    await expect(page.locator('header').getByRole('link', { name: /Olé/i })).toHaveCount(0);
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
    // El header tiene dos enlaces a "/": el logo y "Portada" (nav principal).
    // Se acota por el nombre accesible del logo para no caer en strict mode.
    const logo = page.locator('header').getByRole('link', { name: /QSK Noticias/i });
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute('aria-label', /QSK Noticias/i);
  });

  test('el footer tiene enlaces institucionales', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Quiénes somos' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Contacto' })).toBeVisible();
  });
});

test.describe('Imágenes de la portada (rendimiento)', () => {
  test('la imagen destacada carga con prioridad alta y marcado responsivo', async ({ page }) => {
    await page.goto('/');
    const featured = page.locator('article').first().locator('img');
    await expect(featured).toBeVisible();
    await expect(featured).toHaveAttribute('loading', 'eager');
    await expect(featured).toHaveAttribute('fetchpriority', 'high');
    await expect(featured).toHaveAttribute('srcset');
    await expect(featured).toHaveAttribute('sizes');
    await expect(featured).toHaveAttribute('alt', '');
  });

  test('las tarjetas no destacadas cargan diferidas (lazy) sin prioridad alta', async ({ page }) => {
    await page.goto('/');
    const normal = page.locator('main article').nth(1).locator('img');
    await expect(normal).toBeVisible();
    await expect(normal).toHaveAttribute('loading', 'lazy');
    await expect(normal).not.toHaveAttribute('fetchpriority', 'high');
    await expect(normal).toHaveAttribute('srcset');
  });
});
