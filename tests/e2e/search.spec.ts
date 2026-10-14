import { test, expect, type Page } from '@playwright/test';

/** Abre la búsqueda y espera a que el índice esté listo (evita falsos positivos). */
async function openSearch(page: Page): Promise<void> {
  await page.goto('/buscar/');
  await expect(page.locator('#search-results')).toHaveAttribute('data-index-state', 'ready');
}

const visibleResults = (page: Page) => page.locator('#search-list li:not(.hidden)');

test.describe('Búsqueda', () => {
  test('carga la página de búsqueda', async ({ page }) => {
    await page.goto('/buscar/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Buscar');
  });

  test('una sola entrada orienta con un ejemplo de tema y lugar', async ({ page }) => {
    await page.goto('/buscar/');
    await expect(page.getByLabel('Buscar noticias')).toHaveAttribute(
      'placeholder',
      /transporte en Lanús, educación en Buenos Aires/,
    );
  });

  test('muestra placeholder con input vacío', async ({ page }) => {
    await page.goto('/buscar/');
    await expect(page.getByText('Escribí un término para buscar')).toBeVisible();
  });

  test('muestra resultados al buscar por tema', async ({ page }) => {
    await openSearch(page);
    await page.getByLabel('Buscar noticias').fill('tránsito');
    await expect(visibleResults(page).first()).toBeVisible();
  });

  test('búsqueda case-insensitive', async ({ page }) => {
    await openSearch(page);
    await page.getByLabel('Buscar noticias').fill('TRÁNSITO');
    await expect(visibleResults(page).first()).toBeVisible();
  });

  test('búsqueda tolerante a tildes', async ({ page }) => {
    await openSearch(page);
    await page.getByLabel('Buscar noticias').fill('lanus');
    await expect(visibleResults(page).first()).toBeVisible();
    await expect(visibleResults(page).filter({ hasText: 'Lanús' }).first()).toBeVisible();
  });

  test('búsqueda por localidad', async ({ page }) => {
    await openSearch(page);
    await page.getByLabel('Buscar noticias').fill('ezpeleta');
    await expect(visibleResults(page).first()).toBeVisible();
    await expect(visibleResults(page).filter({ hasText: 'Ezpeleta' }).first()).toBeVisible();
  });

  test('combina tema y ubicación en una sola consulta', async ({ page }) => {
    await openSearch(page);
    await page.getByLabel('Buscar noticias').fill('obras en lanus');
    await expect(visibleResults(page).first()).toBeVisible();
    await expect(visibleResults(page).filter({ hasText: 'Lanús' }).first()).toBeVisible();
  });

  test('muestra mensaje sin resultados', async ({ page }) => {
    await openSearch(page);
    await page.getByLabel('Buscar noticias').fill('inexistente12345');
    await expect(page.getByText('No se encontraron resultados')).toBeVisible();
    await expect(visibleResults(page)).toHaveCount(0);
  });

  test('ofrece sugerencias de ubicaciones reconocidas al escribir', async ({ page }) => {
    await page.goto('/buscar/');
    const values = await page
      .locator('#location-suggestions option')
      .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
    expect(values).toContain('Lanús');
    expect(values).toContain('Banfield');
    expect(values).toContain('Buenos Aires');
  });

  test('la pestaña Municipios lista municipios con artículos', async ({ page }) => {
    await openSearch(page);
    await page.getByRole('tab', { name: 'Municipios' }).click();
    await expect(page.locator('#panel-municipios a[href="/municipios/lanus/"]')).toBeVisible();
    await expect(page.locator('#panel-noticias')).toBeHidden();
  });

  test('la pestaña Localidades lista localidades con artículos', async ({ page }) => {
    await openSearch(page);
    await page.getByRole('tab', { name: 'Localidades' }).click();
    await expect(page.locator('#panel-localidades a[href="/localidades/banfield/"]')).toBeVisible();
    await expect(page.locator('#panel-localidades a[href="/localidades/ezpeleta/"]')).toBeVisible();
  });

  test('la pestaña Provincias lista provincias y sus municipios', async ({ page }) => {
    await openSearch(page);
    await page.getByRole('tab', { name: 'Provincias' }).click();
    const panel = page.locator('#panel-provincias');
    await expect(panel).toContainText('Buenos Aires');
    await expect(panel.locator('a[href="/municipios/quilmes/"]')).toBeVisible();
  });

  test('la consulta filtra también la pestaña de ubicaciones', async ({ page }) => {
    await openSearch(page);
    await page.getByLabel('Buscar noticias').fill('quilmes');
    await page.getByRole('tab', { name: 'Municipios' }).click();
    const panel = page.locator('#panel-municipios');
    await expect(panel.locator('a[href="/municipios/quilmes/"]')).toBeVisible();
    await expect(panel.locator('a[href="/municipios/lanus/"]')).toHaveCount(0);
  });
});
