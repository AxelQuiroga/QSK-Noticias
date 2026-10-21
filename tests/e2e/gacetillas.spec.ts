import { test, expect } from '@playwright/test';

const SECTION = 'section[aria-labelledby="gacetillas-heading"]';

test.describe('Gacetillas oficiales', () => {
  test('la portada muestra hasta 4 gacetillas después de las noticias editoriales', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator(`${SECTION} article`)).toHaveCount(4);

    // Las noticias editoriales conservan su prioridad en el orden de la portada.
    const editorialPrimero = await page.evaluate(() => {
      const ultimas = document.getElementById('latest-heading');
      const gacetillas = document.getElementById('gacetillas-heading');
      if (!ultimas || !gacetillas) return false;
      return Boolean(ultimas.compareDocumentPosition(gacetillas) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(editorialPrimero).toBe(true);
  });

  test('la página dedicada muestra hasta 12 gacetillas', async ({ page }) => {
    await page.goto('/gacetillas-oficiales/');

    await expect(page.getByRole('heading', { level: 1, name: 'Gacetillas oficiales' })).toBeVisible();
    await expect(page.locator(`${SECTION} article`)).toHaveCount(12);
  });

  test('cada tarjeta muestra título, descripción, atribución y enlace a la publicación original', async ({ page }) => {
    await page.goto('/gacetillas-oficiales/');

    const card = page.locator(`${SECTION} article`).first();
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

  test('muestra la imagen y la volanta cuando la fuente los incluye', async ({ page }) => {
    await page.goto('/gacetillas-oficiales/');

    const card = page.locator(`${SECTION} article`).first();
    await expect(card.locator('a img')).toHaveAttribute('src', /^https:\/\/www\.gba\.gob\.ar\//);

    // La volanta es el párrafo inmediatamente anterior al título.
    const volanta = card.locator('p:has(+ h3)');
    await expect(volanta).toBeVisible();
    expect((await volanta.innerText()).trim()).not.toBe('');
  });
});
