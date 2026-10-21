import { test, expect } from '@playwright/test';

const SECTION = 'section[aria-labelledby="novedades-oficiales-heading"]';
const TRACK = `${SECTION} [data-carousel-track]`;
const CARD_LINKS = `${TRACK} > li > a`;
const FUENTE_OFICIAL = 'https://www.gba.gob.ar/comunicacion_publica/gacetillas';

test.describe('Novedades oficiales — portada', () => {
  test('la portada muestra la sección con su título e introducción', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 2, name: 'Novedades oficiales' })).toBeVisible();
    await expect(
      page.getByText('Anuncios e información difundidos por el Gobierno de la Provincia de Buenos Aires.'),
    ).toBeVisible();
  });

  test('muestra hasta 8 tarjetas en el carrusel', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(`${TRACK} > li`)).toHaveCount(8);
  });

  test('las noticias editoriales conservan su prioridad en la portada', async ({ page }) => {
    await page.goto('/');

    const editorialPrimero = await page.evaluate(() => {
      const ultimas = document.getElementById('latest-heading');
      const novedades = document.getElementById('novedades-oficiales-heading');
      if (!ultimas || !novedades) return false;
      return Boolean(ultimas.compareDocumentPosition(novedades) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(editorialPrimero).toBe(true);
  });

  test('cada tarjeta muestra imagen, título y descripción', async ({ page }) => {
    await page.goto('/');

    const card = page.locator(`${TRACK} > li`).first();
    await expect(card.locator('img')).toHaveAttribute('src', /^https:\/\/www\.gba\.gob\.ar\//);
    await expect(card.locator('h3')).toBeVisible();
    await expect(card.locator('h3 + p')).toBeVisible();
  });

  test('cada tarjeta abre una página propia dentro de QSK', async ({ page }) => {
    await page.goto('/');

    const links = page.locator(CARD_LINKS);
    await expect(links).toHaveCount(8);

    const hrefs = await links.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('href') ?? ''),
    );
    for (const href of hrefs) {
      expect(href).toMatch(/^\/gacetillas-oficiales\/[a-z0-9-]+\/$/);
    }

    // Ninguna tarjeta manda al lector fuera del sitio.
    await expect(page.locator(`${TRACK} a[href^="http"]`)).toHaveCount(0);
  });

  test('hay exactamente un enlace general a la fuente oficial', async ({ page }) => {
    await page.goto('/');

    const fuente = page.locator(`${SECTION} a[href="${FUENTE_OFICIAL}"]`);
    await expect(fuente).toHaveCount(1);
    await expect(fuente).toHaveAttribute('target', '_blank');
    await expect(fuente).toHaveAttribute('rel', /noopener/);
    await expect(page.getByRole('link', { name: /Consultar todas las gacetillas oficiales/ })).toBeVisible();

    // El enlace general vive fuera del track de tarjetas.
    await expect(page.locator(`${TRACK} a[href="${FUENTE_OFICIAL}"]`)).toHaveCount(0);
  });

  test('un clic en una tarjeta entra al detalle dentro de QSK', async ({ page }) => {
    await page.goto('/');

    await page.locator(CARD_LINKS).first().click();
    await expect(page).toHaveURL(/\/gacetillas-oficiales\/[a-z0-9-]+\/$/);
    await expect(page.getByRole('heading', { level: 1 })).not.toBeEmpty();
  });

  test('los controles del carrusel son accesibles y desplazan el contenido', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');

    const prev = page.getByRole('button', { name: 'Ver novedades anteriores' });
    const next = page.getByRole('button', { name: 'Ver más novedades' });
    await expect(prev).toBeVisible();
    await expect(next).toBeVisible();
    await expect(prev).toBeDisabled();
    await expect(next).toBeEnabled();

    await next.click();
    await expect
      .poll(() => page.locator(TRACK).evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);

    await expect(prev).toBeEnabled();
    await prev.click();
    await expect
      .poll(() => page.locator(TRACK).evaluate((element) => element.scrollLeft))
      .toBeLessThanOrEqual(1);
  });

  test('el carrusel se navega con teclado', async ({ page }) => {
    await page.goto('/');

    const track = page.locator(TRACK);
    await track.focus();
    await page.keyboard.press('ArrowRight');

    await expect
      .poll(() => track.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);
  });

  test('en móvil se desliza horizontalmente sin desbordar la página', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(page.getByRole('button', { name: 'Ver novedades anteriores' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Ver más novedades' })).toBeHidden();

    const track = page.locator(TRACK);
    const scrollable = await track.evaluate((element) => element.scrollWidth > element.clientWidth);
    expect(scrollable).toBe(true);

    await track.evaluate((element) => element.scrollBy({ left: 300, behavior: 'instant' }));
    await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('Página de detalle de una gacetilla', () => {
  test('muestra título, imagen, bajada y fuente de forma explícita', async ({ page }) => {
    await page.goto('/');
    const href = await page.locator(CARD_LINKS).first().getAttribute('href');
    await page.goto(href!);

    await expect(page.getByRole('heading', { level: 1 })).not.toBeEmpty();
    const figure = page.locator('article figure');
    await expect(figure).toBeVisible();
    await expect(figure.locator('img')).toHaveAttribute('src', /^https:\/\/www\.gba\.gob\.ar\//);
    await expect(page.locator('[data-gacetilla-bajada]')).toBeVisible();
    await expect(page.locator('article')).toContainText('Gobierno de la Provincia de Buenos Aires');
    await expect(page.getByRole('link', { name: /Volver a Novedades oficiales/ })).toBeVisible();
  });

  test('ofrece el enlace a la publicación original solo dentro del detalle', async ({ page }) => {
    await page.goto('/');
    const href = await page.locator(CARD_LINKS).first().getAttribute('href');
    await page.goto(href!);

    const original = page.getByRole('link', { name: /Ver publicación original/ });
    await expect(original).toBeVisible();
    await expect(original).toHaveAttribute('href', /^https:\/\/www\.gba\.gob\.ar\/comunicacion_publica\/gacetillas\//);
    await expect(original).toHaveAttribute('target', '_blank');
    await expect(original).toHaveAttribute('rel', /noopener/);
  });

  test('todas las tarjetas del carrusel llevan a un detalle que responde', async ({ page }) => {
    await page.goto('/');
    const hrefs = await page.locator(CARD_LINKS).evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('href') ?? ''),
    );
    expect(hrefs).toHaveLength(8);

    for (const href of hrefs) {
      const response = await page.goto(href);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).not.toBeEmpty();
      await expect(page.getByRole('link', { name: /Ver publicación original/ })).toBeVisible();
    }
  });
});

test.describe('Página dedicada de gacetillas', () => {
  const GACETILLAS_SECTION = 'section[aria-labelledby="gacetillas-heading"]';

  test('la página dedicada muestra hasta 12 gacetillas', async ({ page }) => {
    await page.goto('/gacetillas-oficiales/');

    await expect(page.getByRole('heading', { level: 1, name: 'Gacetillas oficiales' })).toBeVisible();
    await expect(page.locator(`${GACETILLAS_SECTION} article`)).toHaveCount(12);
  });

  test('cada tarjeta muestra título, descripción, atribución y enlace a la publicación original', async ({ page }) => {
    await page.goto('/gacetillas-oficiales/');

    const card = page.locator(`${GACETILLAS_SECTION} article`).first();
    await expect(card.locator('h3 a')).toBeVisible();
    await expect(card.locator('h3 a')).toHaveAttribute('href', /^https:\/\/www\.gba\.gob\.ar\//);
    await expect(card.locator('h3 + p')).toBeVisible();
    await expect(card).toContainText('Gobierno de la Provincia de Buenos Aires');

    const original = card.getByRole('link', { name: 'Publicación original' });
    await expect(original).toBeVisible();
    await expect(original).toHaveAttribute('href', /^https:\/\/www\.gba\.gob\.ar\//);
    await expect(original).toHaveAttribute('target', '_blank');
    await expect(original).toHaveAttribute('rel', /noopener/);
  });
});
