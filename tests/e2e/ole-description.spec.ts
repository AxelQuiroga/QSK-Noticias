import { test, expect } from '@playwright/test';
import noticiasOle from '../../src/data/ole.json';

type NoticiaOle = (typeof noticiasOle)[number];

function getSlug(noticia: NoticiaOle): string {
  const pathname = new URL(noticia.url).pathname;
  return pathname.split('/').filter(Boolean).at(-1)!
    .replace(/\.html?$/i, '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const noticiaConDescripcion = noticiasOle.find(
  (noticia) => typeof noticia.description === 'string' && noticia.description.trim().length > 0,
);

const noticiaSinDescripcion = noticiasOle.find(
  (noticia) => typeof noticia.description !== 'string' || noticia.description.trim().length === 0,
);

test.describe('Descripciones del feed de Olé', () => {
  test('muestra la descripción actual en las tarjetas del carrusel', async ({ page }) => {
    test.skip(!noticiaConDescripcion, 'El feed actual no contiene noticias con descripción.');

    const noticia = noticiaConDescripcion!;
    await page.goto('/');

    const tarjeta = page.locator('#deportes-ole-carousel-track')
      .locator('article')
      .filter({ hasText: noticia.title });

    await expect(tarjeta).toBeVisible();
    await expect(tarjeta.locator('[data-ole-description]')).toHaveText(noticia.description!.trim());
    await expect(tarjeta.getByRole('link', { name: noticia.title })).toHaveAttribute(
      'href',
      `/deportes/${getSlug(noticia)}/`,
    );
  });

  test('muestra la descripción actual en la página individual de Olé', async ({ page }) => {
    test.skip(!noticiaConDescripcion, 'El feed actual no contiene noticias con descripción.');

    const noticia = noticiaConDescripcion!;
    await page.goto(`/deportes/${getSlug(noticia)}/`);

    await expect(page.getByRole('heading', { level: 1, name: noticia.title })).toBeVisible();
    await expect(page.locator('[data-ole-description]')).toHaveText(noticia.description!.trim());
    await expect(page.getByRole('link', { name: /Leer la noticia en Olé/ })).toHaveAttribute(
      'href',
      noticia.url,
    );
  });

  test('mantiene funcional la página individual cuando el registro no tiene descripción', async ({ page }) => {
    test.skip(!noticiaSinDescripcion, 'El feed actual contiene descripción en todos sus registros.');

    const noticia = noticiaSinDescripcion!;
    await page.goto(`/deportes/${getSlug(noticia)}/`);

    await expect(page.getByRole('heading', { level: 1, name: noticia.title })).toBeVisible();
    await expect(page.locator('[data-ole-description]')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Leer la noticia en Olé/ })).toHaveAttribute(
      'href',
      noticia.url,
    );
  });
});
