import { test, expect } from '@playwright/test';

const ARTICLE_URL = '/noticias/corte-transito-avenida-smith-ezpeleta-octubre-2026/';

test.describe('Compartir contenido editorial', () => {
  test('las noticias ofrecen compartir nativo y accesos directos a WhatsApp y Telegram', async ({ page }) => {
    await page.goto(ARTICLE_URL);

    await expect(page.getByRole('button', { name: /compartir noticia/i })).toBeVisible();

    const whatsapp = page.getByRole('link', { name: /whatsapp/i });
    await expect(whatsapp).toBeVisible();
    await expect(whatsapp).toHaveAttribute('href', /wa\.me|api\.whatsapp\.com/);

    const telegram = page.getByRole('link', { name: /telegram/i });
    await expect(telegram).toBeVisible();
    await expect(telegram).toHaveAttribute('href', /t\.me\/share\/url/);

    await expect(whatsapp).toHaveAttribute('href', /qsknoticias\.site/);
    await expect(telegram).toHaveAttribute('href', /qsknoticias\.site/);
  });

  test('el compartir nativo recibe el título y la URL canónica de la noticia', async ({ page }) => {
    await page.addInitScript(() => {
      (window as Window & { __shareCalls?: ShareData[] }).__shareCalls = [];
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async (data: ShareData) => {
          (window as Window & { __shareCalls?: ShareData[] }).__shareCalls?.push(data);
        },
      });
    });

    await page.goto(ARTICLE_URL);
    await page.getByRole('button', { name: /compartir noticia/i }).click();

    const calls = await page.evaluate(
      () => (window as Window & { __shareCalls?: ShareData[] }).__shareCalls ?? [],
    );
    expect(calls).toHaveLength(1);
    expect(calls[0].title).toContain('QSK Noticias');
    expect(calls[0].url).toBe('https://qsknoticias.site/noticias/corte-transito-avenida-smith-ezpeleta-octubre-2026/');
  });

  test('las gacetillas oficiales también ofrecen compartir su detalle propio', async ({ page }) => {
    await page.goto('/');
    await page.locator('section[aria-labelledby="gacetillas-gba-heading"] article h3 a').first().click();

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: /compartir noticia/i })).toBeVisible();

    const whatsapp = page.getByRole('link', { name: /whatsapp/i });
    const telegram = page.getByRole('link', { name: /telegram/i });
    await expect(whatsapp).toHaveAttribute('href', /qsknoticias\.site(%2F|\/)gacetillas-oficiales(%2F|\/)/i);
    await expect(telegram).toHaveAttribute('href', /qsknoticias\.site(%2F|\/)gacetillas-oficiales(%2F|\/)/i);
  });
});
