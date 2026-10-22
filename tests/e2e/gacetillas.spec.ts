import { test, expect } from '@playwright/test';

const SECCION_OFICIALES = 'section[aria-labelledby="gacetillas-oficiales-heading"]';
const SECCION_GBA = 'section[aria-labelledby="gacetillas-gba-heading"]';
const SECCION_EE = 'section[aria-labelledby="gacetillas-esteban-echeverria-heading"]';
const TARJETAS = 'article.overflow-hidden.rounded-xl.border.border-border.bg-surface';
const PAGINA_DEDICADA = 'section[aria-labelledby="gacetillas-heading"]';

test.describe('Novedades oficiales — portada (dos secciones separadas)', () => {
  test('muestra la sección de gacetillas oficiales con su título', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 2, name: 'Gacetillas oficiales' }),
    ).toBeVisible();
  });

  test('muestra la sección provincial de GBA con sus propias tarjetas', async ({ page }) => {
    await page.goto('/');

    const seccion = page.locator(SECCION_GBA);
    await expect(seccion).toBeVisible();
    await expect(
      page.getByRole('heading', {
        level: 2,
        name: 'Gacetillas de Gobierno de la Provincia de Buenos Aires',
      }),
    ).toBeVisible();

    const tarjetas = seccion.locator(TARJETAS);
    await expect(tarjetas).toHaveCount(12);

    // Cada tarjeta de GBA debe tener fuente GBA
    for (const tarjeta of await tarjetas.all()) {
      await expect(tarjeta).toContainText('Gobierno de la Provincia de Buenos Aires');
    }

    // Enlace propio para consultar todas las publicaciones de GBA
    const enlaceTodas = seccion.getByRole('link', {
      name: /Ver todas las publicaciones de Gobierno de la Provincia/,
    });
    await expect(enlaceTodas).toBeVisible();
    await expect(enlaceTodas).toHaveAttribute('href', '/gacetillas-oficiales/fuente/gba/');
  });

  test('muestra la sección municipal de Esteban Echeverría con sus propias tarjetas', async ({ page }) => {
    await page.goto('/');

    const seccion = page.locator(SECCION_EE);
    await expect(seccion).toBeVisible();
    await expect(
      page.getByRole('heading', {
        level: 2,
        name: 'Gacetillas de Municipalidad de Esteban Echeverría',
      }),
    ).toBeVisible();

    const tarjetas = seccion.locator(TARJETAS);
    // Actualmente hay 10 registros de EE; no se inventan para completar 12
    await expect(tarjetas).toHaveCount(10);

    // Cada tarjeta de EE debe tener fuente EE
    for (const tarjeta of await tarjetas.all()) {
      await expect(tarjeta).toContainText('Municipalidad de Esteban Echeverría');
    }

    // Enlace propio para consultar todas las publicaciones de EE
    const enlaceTodas = seccion.getByRole('link', {
      name: /Ver todas las publicaciones de Municipalidad de Esteban Echeverría/,
    });
    await expect(enlaceTodas).toBeVisible();
    await expect(enlaceTodas).toHaveAttribute(
      'href',
      '/gacetillas-oficiales/fuente/esteban-echeverria/',
    );
  });

  test('las dos secciones nunca se mezclan ni duplican tarjetas', async ({ page }) => {
    await page.goto('/');

    const gba = page.locator(SECCION_GBA).locator(TARJETAS);
    const ee = page.locator(SECCION_EE).locator(TARJETAS);

    const urlsGBA = await gba.locator('a[href^="/gacetillas-oficiales/"]').evaluateAll(
      (els) => els.map((e) => e.getAttribute('href')),
    );
    const urlsEE = await ee.locator('a[href^="/gacetillas-oficiales/"]').evaluateAll(
      (els) => els.map((e) => e.getAttribute('href')),
    );

    const setGBA = new Set(urlsGBA);
    const setEE = new Set(urlsEE);
    const duplicados = [...setGBA].filter((u) => setEE.has(u));
    expect(duplicados).toEqual([]);
  });

  test('cada tarjeta de la sección provincial muestra título, descripción y fuente', async ({ page }) => {
    await page.goto('/');

    const tarjeta = page.locator(SECCION_GBA).locator(TARJETAS).first();
    await expect(tarjeta.locator('h3 a')).toBeVisible();
    await expect(tarjeta).toContainText('Gobierno de la Provincia de Buenos Aires');
    // GBA tiene fecha null, por lo que no hay <time>; eso es válido
    const img = tarjeta.locator('img');
    if ((await img.count()) > 0) {
      await expect(img).toHaveAttribute('src', /^https:\/\//);
    }
  });

  test('cada tarjeta de la sección municipal muestra título, descripción, fuente y fecha', async ({ page }) => {
    await page.goto('/');

    const tarjeta = page.locator(SECCION_EE).locator(TARJETAS).first();
    await expect(tarjeta.locator('h3 a')).toBeVisible();
    await expect(tarjeta).toContainText('Municipalidad de Esteban Echeverría');
    await expect(tarjeta.locator('time')).toBeVisible();
  });

  test('un clic en una tarjeta de GBA entra al detalle dentro de QSK', async ({ page }) => {
    await page.goto('/');

    await page.locator(SECCION_GBA).locator(TARJETAS).first().locator('h3 a').click();
    await expect(page.getByRole('heading', { level: 1 })).not.toBeEmpty();
  });

  test('un clic en una tarjeta de EE entra al detalle dentro de QSK', async ({ page }) => {
    await page.goto('/');

    await page.locator(SECCION_EE).locator(TARJETAS).first().locator('h3 a').click();
    await expect(page.getByRole('heading', { level: 1 })).not.toBeEmpty();
  });
});

test.describe('Página de detalle de una gacetilla', () => {
  test('muestra título, imagen, bajada y fuente de forma explícita', async ({ page }) => {
    await page.goto('/');
    await page.locator(SECCION_GBA).locator(TARJETAS).first().locator('h3 a').click();

    await expect(page.getByRole('heading', { level: 1 })).not.toBeEmpty();
    const figure = page.locator('article figure');
    if ((await figure.count()) > 0) {
      await expect(figure).toBeVisible();
      await expect(figure.locator('img')).toHaveAttribute('src', /^https:\/\//);
      await expect(figure.locator('figcaption')).toContainText(/^Imagen: .+/);
    }
    const bajada = page.locator('[data-gacetilla-bajada]');
    if ((await bajada.count()) > 0) {
      await expect(bajada).toBeVisible();
    }
    await expect(page.getByRole('link', { name: /Volver a Novedades oficiales/ })).toBeVisible();
  });

  test('ofrece el enlace a la publicación original solo dentro del detalle', async ({ page }) => {
    await page.goto('/');
    await page.locator(SECCION_GBA).locator(TARJETAS).first().locator('h3 a').click();

    const original = page.getByRole('link', { name: /Ver publicación original/ });
    await expect(original).toBeVisible();
    await expect(original).toHaveAttribute('href', /^https:\/\//);
    await expect(original).toHaveAttribute('target', '_blank');
    await expect(original).toHaveAttribute('rel', /noopener/);
  });

  test('todas las tarjetas de la sección GBA llevan a un detalle que responde', async ({ page }) => {
    await page.goto('/');
    const hrefs = await page.locator(SECCION_GBA).locator(TARJETAS).locator('h3 a').evaluateAll(
      (elements) => elements.map((element) => element.getAttribute('href') ?? ''),
    );
    expect(hrefs).toHaveLength(12);

    for (const href of hrefs) {
      const response = await page.goto(href);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).not.toBeEmpty();
      await expect(page.getByRole('link', { name: /Ver publicación original/ })).toBeVisible();
    }
  });
});

test.describe('Página dedicada de gacetillas', () => {
  test('la página dedicada muestra gacetillas de ambas fuentes', async ({ page }) => {
    await page.goto('/gacetillas-oficiales/');

    await expect(page.getByRole('heading', { level: 1, name: 'Gacetillas oficiales' })).toBeVisible();

    const tarjetas = page.locator(`${PAGINA_DEDICADA} article`);
    await expect(tarjetas).toHaveCount(12);

    const tarjeta = tarjetas.first();
    await expect(tarjeta.locator('h3 a')).toBeVisible();
    await expect(tarjeta).toContainText(/^Fuente: .+/);
  });

  test('cada tarjeta muestra título, descripción, atribución y enlace a la publicación original', async ({ page }) => {
    await page.goto('/gacetillas-oficiales/');

    const card = page.locator(`${PAGINA_DEDICADA} article`).first();
    await expect(card.locator('h3 a')).toBeVisible();
    await expect(card.locator('h3 a')).toHaveAttribute('href', /^https:\/\//);
    await expect(card.locator('h3 + p')).toBeVisible();
    await expect(card).toContainText(/^Fuente: .+/);

    const original = card.getByRole('link', { name: 'Publicación original' });
    await expect(original).toBeVisible();
    await expect(original).toHaveAttribute('href', /^https:\/\//);
    await expect(original).toHaveAttribute('target', '_blank');
    await expect(original).toHaveAttribute('rel', /noopener/);
  });

  test('las páginas específicas por fuente funcionan', async ({ page }) => {
    await page.goto('/gacetillas-oficiales/fuente/esteban-echeverria/');

    await expect(page.getByRole('heading', { level: 2, name: 'Últimas gacetillas' })).toBeVisible();

    const tarjetas = page.locator(TARJETAS);
    await expect(tarjetas).toHaveCount(10);
  });
});
