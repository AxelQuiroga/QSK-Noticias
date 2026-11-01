import { test, expect, type Page, type Request } from '@playwright/test';

async function trackWeatherIntervals(page: Page): Promise<() => number> {
  const activeIntervals = new Set<number>();

  await page.exposeFunction('__weatherIntervalStarted', (id: number) => {
    activeIntervals.add(id);
  });

  await page.exposeFunction('__weatherIntervalCleared', (id: number) => {
    activeIntervals.delete(id);
  });

  await page.addInitScript(() => {
    const originalSetInterval = window.setInterval;
    const originalClearInterval = window.clearInterval;

    window.setInterval = new Proxy(originalSetInterval, {
      apply(target, thisArg, args) {
        const id = Reflect.apply(target, thisArg, args) as number;

        if (args[1] === 30 * 60 * 1000) {
          const notifyStarted = Reflect.get(
            window,
            '__weatherIntervalStarted',
          ) as ((intervalId: number) => Promise<void>) | undefined;

          if (notifyStarted) {
            void notifyStarted(id);
          }
        }

        return id;
      },
    });

    window.clearInterval = new Proxy(originalClearInterval, {
      apply(target, thisArg, args) {
        const id = args[0] as number;
        const result = Reflect.apply(target, thisArg, args);
        const notifyCleared = Reflect.get(
          window,
          '__weatherIntervalCleared',
        ) as ((intervalId: number) => Promise<void>) | undefined;

        if (notifyCleared) {
          void notifyCleared(id);
        }

        return result;
      },
    });
  });

  return () => activeIntervals.size;
}

test.describe('Ciclo de vida del widget del clima', () => {
  test('cancela el intervalo al abandonar la portada', async ({ page }) => {
    const getActiveWeatherIntervals = await trackWeatherIntervals(page);
    await page.goto('/');

    await expect.poll(getActiveWeatherIntervals).toBe(1);

    await page.locator('footer')
      .getByRole('link', { name: 'Quiénes somos' })
      .click();

    await expect(page).toHaveURL(/\/quienes-somos\/$/);
    await expect.poll(getActiveWeatherIntervals).toBe(0);
  });

  test('no acumula intervalos al navegar repetidamente', async ({ page }) => {
    const getActiveWeatherIntervals = await trackWeatherIntervals(page);
    await page.goto('/');

    await expect.poll(getActiveWeatherIntervals).toBe(1);

    for (let iteration = 0; iteration < 3; iteration++) {
      await page.locator('footer')
        .getByRole('link', { name: 'Quiénes somos' })
        .click();

      await expect(page).toHaveURL(/\/quienes-somos\/$/);
      await expect.poll(getActiveWeatherIntervals).toBe(0);

      await page.locator('header')
        .getByRole('link', { name: /QSK Noticias/i })
        .click();

      await expect(page).toHaveURL(/\/$/);
      await expect.poll(getActiveWeatherIntervals).toBe(1);
    }
  });
});

test('aborta la solicitud pendiente al abandonar la portada', async ({ page }) => {
  let abortCount = 0;

  await page.exposeFunction('__weatherRequestAborted', () => {
    abortCount++;
  });

  await page.addInitScript(() => {
    const originalFetch = window.fetch;

    window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
      const requestUrl =
        input instanceof Request ? input.url : String(input);
      const url = new URL(requestUrl, window.location.href);

      if (url.pathname === '/api/weather') {
        const signal = init?.signal ??
          (input instanceof Request ? input.signal : undefined);

        signal?.addEventListener(
          'abort',
          () => {
            const notifyAbort = Reflect.get(
              window,
              '__weatherRequestAborted',
            ) as (() => Promise<void>) | undefined;

            if (notifyAbort) {
              void notifyAbort();
            }
          },
          { once: true },
        );
      }

      return originalFetch.call(window, input, init);
    };
  });

  let releaseRoute!: () => void;
  const routeGate = new Promise<void>((resolve) => {
    releaseRoute = resolve;
  });

  let markRequestStarted!: (request: Request) => void;
  const requestStarted = new Promise<Request>((resolve) => {
    markRequestStarted = resolve;
  });

  await page.route('**/api/weather*', async (route) => {
    markRequestStarted(route.request());
    await routeGate;

    try {
      await route.continue();
    } catch {
      // El navegador ya pudo haber cancelado la solicitud mediante AbortSignal.
    }
  });

  try {
    await page.goto('/');

    const weatherRequest = await requestStarted;
    const requestUrl = new URL(weatherRequest.url());

    expect(requestUrl.pathname).toBe('/api/weather');
    expect(requestUrl.searchParams.get('location')).toBe('lanus');

    await page.locator('footer')
      .getByRole('link', { name: 'Quiénes somos' })
      .click();

    await expect(page).toHaveURL(/\/quienes-somos\/$/);
    await expect.poll(() => abortCount).toBe(1);
  } finally {
    releaseRoute();
  }
});
