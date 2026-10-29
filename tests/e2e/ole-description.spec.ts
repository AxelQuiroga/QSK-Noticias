import { test, expect } from '@playwright/test';

const descripcionPalermo =
  'Antes del inicio del partido entre A. Tucumán y Platense, el Loco y el Emperador se saludaron afectuosamente.';
const descripcionSudamericana =
  'Un ex delantero del Millonario se refirió a la chance que tiene el Xeneize ante Atlético Mineiro en Barranquilla.';

test.describe('Descripciones del feed de Olé', () => {
  test('muestra la descripción en las tarjetas cuando hay contenido', async ({ page }) => {
    await page.goto('/');
    const carrusel = page.locator('#deportes-ole-carousel-track');
    await expect(carrusel.locator('[data-ole-description]').filter({ hasText: descripcionPalermo }))
      .toBeVisible();
    await expect(carrusel.locator('[data-ole-description]').filter({ hasText: descripcionSudamericana }))
      .toBeVisible();
  });

  test('muestra la descripción en la página individual de Olé', async ({ page }) => {
    await page.goto('/');
    await page.locator('#deportes-ole-carousel-track').getByRole('link', {
      name: 'Palermo y Falcioni: del recuerdo en Boca al abrazo en Salta por Copa Argentina',
    }).click();

    await expect(page.locator('[data-ole-description]')).toHaveText(descripcionPalermo);
  });

  test('los registros históricos sin descripción conservan tarjeta y página funcionales', async ({ page }) => {
    await page.goto('/');
    const carrusel = page.locator('#deportes-ole-carousel-track');
    await expect(carrusel.getByRole('link', {
      name: 'Palermo: otra final con Platense y un posible mano a mano con Boca',
    })).toBeVisible();

    await carrusel.getByRole('link', {
      name: 'Palermo: otra final con Platense y un posible mano a mano con Boca',
    }).click();
    await expect(page.getByRole('heading', {
      level: 1,
      name: 'Palermo: otra final con Platense y un posible mano a mano con Boca',
    })).toBeVisible();
    await expect(page.locator('[data-ole-description]')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Leer la noticia en Olé/ })).toBeVisible();
  });
});
