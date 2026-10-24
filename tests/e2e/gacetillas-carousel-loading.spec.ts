import { test, expect } from '@playwright/test';

const SECTION = 'section[aria-labelledby="gacetillas-gba-heading"]';
const TRACK = `${SECTION} [data-carousel-track]`;

test('el carrusel difiere las imágenes fuera del área visible y las carga al acercarse', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');

  const track = page.locator(TRACK);
  const images = track.locator('img[data-carousel-img]');
  await expect(images).toHaveCount(12);

  const firstImage = images.first();
  await expect(firstImage).toHaveAttribute('src', /^https:\/\/www\.gba\.gob\.ar\//);

  const lastImage = images.last();
  await expect(lastImage).not.toHaveAttribute('src', /.+/);
  await expect(lastImage).toHaveAttribute('data-src', /^https:\/\/www\.gba\.gob\.ar\//);

  await track.evaluate((element) => {
    element.scrollTo({ left: element.scrollWidth, behavior: 'instant' });
  });

  await expect(lastImage).toHaveAttribute('src', /^https:\/\/www\.gba\.gob\.ar\//);
  await expect(lastImage).not.toHaveAttribute('data-src', /.+/);
});
