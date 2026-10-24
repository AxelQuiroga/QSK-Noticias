import { test, expect } from '@playwright/test';
import { NAV_DIRECT, NAV_GROUPS, SECTIONS } from '../../src/data/sections';
import { slugify } from '../../src/lib/utils';

/**
 * Las expectativas se derivan del catálogo editorial y de la agrupación del
 * header, que son la fuente de verdad de las rutas `/secciones/*`. Si alguien
 * agrega o quita una sección, estos tests lo reflejan sin listas duplicadas.
 */
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

  test('mantiene alcanzable cada sección del catálogo (sin regresiones)', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav[aria-label="Navegación principal"]');

    // Todas las rutas siguen enlazadas desde el header: las agrupadas viven
    // dentro de su desplegable (ocultas hasta abrirlo), no como enlaces sueltos.
    const agrupadas = NAV_GROUPS.flatMap((group) => group.sections);
    await expect(nav.locator('a[href^="/secciones/"]')).toHaveCount(
      agrupadas.length + NAV_DIRECT.length,
    );

    for (const group of NAV_GROUPS) {
      await nav.getByRole('button', { name: group.label, exact: true }).click();
      for (const section of group.sections) {
        await expect(nav.locator(`a[href="/secciones/${slugify(section)}/"]`)).toBeVisible();
      }
    }

    for (const section of NAV_DIRECT) {
      await expect(nav.locator(`a[href="/secciones/${slugify(section)}/"]`)).toBeVisible();
    }

    // Ninguna sección del catálogo queda sin entrada en el header: los temas
    // viven en su desplegable y "Actualidad" (el feed de últimos días) es un
    // acceso directo, no una categoría.
    const enNav = new Set([...agrupadas, ...NAV_DIRECT]);
    expect(SECTIONS.filter((section) => !enNav.has(section))).toEqual([]);
  });

  test('el header no desborda horizontalmente', async ({ page }) => {
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

  test('agrupa las secciones y navega a una nueva', async ({ page }) => {
    await page.goto('/');
    await page.locator('#menu-toggle').click();

    const menu = page.getByRole('navigation', { name: 'Navegación móvil' });
    await expect(menu).toBeVisible();

    // "Servicios" ahora vive dentro del grupo "Comunidad".
    await menu.getByRole('button', { name: 'Comunidad', exact: true }).click();
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

test.describe('Estado de las secciones', () => {
  test('una sección publicada muestra artículos o un estado vacío útil', async ({ page }) => {
    // Política puede tener artículos publicados; no asumir que la sección sigue vacía.
    await page.goto('/secciones/politica/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Política');

    const cards = page.locator('.container-editorial article');
    const emptyState = page.getByText('No hay artículos publicados en esta sección todavía.');
    if (await cards.count()) {
      await expect(cards.first()).toBeVisible();
      await expect(emptyState).toHaveCount(0);
    } else {
      await expect(emptyState).toBeVisible();
    }
  });
});
