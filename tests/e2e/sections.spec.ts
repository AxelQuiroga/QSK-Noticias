import { test, expect } from '@playwright/test';
import { SECTIONS } from '../../src/data/sections';
import { slugify } from '../../src/lib/utils';

/**
 * Las expectativas se derivan del catálogo editorial, que es la fuente de
 * verdad de las rutas `/secciones/*`. Si alguien agrega o quita una sección,
 * estos tests lo reflejan sin listas duplicadas.
 */
const SECTION_SLUGS = SECTIONS.map((section) => slugify(section));
const NEW_SECTIONS = ['Política', 'Servicios', 'Seguridad', 'Sociedad'];

test.describe('Secciones nuevas — rutas', () => {
  for (const section of NEW_SECTIONS) {
    test(`"${section}" tiene ruta propia y responde con su título`, async ({ page }) => {
      const response = await page.goto(`/secciones/${slugify(section)}/`);
      expect(response?.status(), `La ruta de "${section}" no responde`).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(section);
    });
  }
});

test.describe('Navegación principal de escritorio', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('lista todas las secciones del catálogo (sin regresiones)', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav[aria-label="Navegación principal"]');

    await expect(nav.locator('a[href^="/secciones/"]')).toHaveCount(SECTIONS.length);

    for (const slug of SECTION_SLUGS) {
      await expect(nav.locator(`a[href="/secciones/${slug}/"]`)).toBeVisible();
    }
  });

  test('el header no desborda horizontalmente con las 11 secciones', async ({ page }) => {
    await page.goto('/');
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth, 'La página desborda horizontalmente').toBeLessThanOrEqual(clientWidth);
  });
});

test.describe('Menú móvil', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('lista todas las secciones y navega a una nueva', async ({ page }) => {
    await page.goto('/');
    await page.locator('#menu-toggle').click();

    const menu = page.getByRole('navigation', { name: 'Navegación móvil' });
    await expect(menu).toBeVisible();

    for (const slug of SECTION_SLUGS) {
      await expect(menu.locator(`a[href="/secciones/${slug}/"]`)).toBeVisible();
    }

    await menu.locator('a', { hasText: 'Servicios' }).click();
    await expect(page).toHaveURL(/\/secciones\/servicios/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Servicios');
  });
});

test.describe('Enlaces a secciones', () => {
  test('todos los enlaces a secciones de la portada resuelven (sin enlaces rotos)', async ({
    page,
  }) => {
    await page.goto('/');

    const hrefs = await page
      .locator('a[href^="/secciones/"]')
      .evaluateAll((links) => [
        ...new Set(links.map((link) => link.getAttribute('href') ?? '')),
      ]);

    expect(hrefs.length).toBeGreaterThan(0);

    const origin = new URL(page.url()).origin;
    for (const href of hrefs) {
      const response = await page.request.get(new URL(href, origin).toString());
      expect(response.status(), `Enlace roto a sección: ${href}`).toBe(200);
    }
  });
});

test.describe('Tarjetas y metadatos del artículo reclasificado', () => {
  test('la tarjeta se lista en su sección y enlaza a esa misma sección', async ({ page }) => {
    await page.goto('/secciones/obras-publicas/');

    const card = page.locator('article', {
      has: page.locator('a[href="/noticias/rampa-accesible-estacion-lanus-obras-octubre-2026/"]'),
    });

    await expect(card).toBeVisible();
    await expect(card.locator('a[href="/secciones/obras-publicas/"]')).toBeVisible();
    await expect(card.locator('a[href="/secciones/actualidad/"]')).toHaveCount(0);
  });

  test('expone la sección en el breadcrumb y en los datos estructurados', async ({ page }) => {
    await page.goto('/noticias/rampa-accesible-estacion-lanus-obras-octubre-2026/');

    await expect(
      page.locator('nav[aria-label="Miga de pan"] a[href="/secciones/obras-publicas/"]'),
    ).toBeVisible();

    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    const structuredData = JSON.parse(jsonLd ?? '{}');
    expect(structuredData['@type']).toBe('NewsArticle');
    expect(structuredData.articleSection).toBe('Obras públicas');
  });
});

test.describe('Sección sin artículos', () => {
  test('muestra un estado vacío útil en vez de una página en blanco', async ({ page }) => {
    // "Política" todavía no tiene artículos publicados al momento de escribir
    // este test; lo que se verifica es que la ruta exista y sea informativa.
    await page.goto('/secciones/politica/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Política');
    await expect(
      page.getByText('No hay artículos publicados en esta sección todavía.'),
    ).toBeVisible();
  });
});
