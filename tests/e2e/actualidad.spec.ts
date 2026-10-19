import { test, expect, type Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { TOPICS } from '../../src/data/sections';
import { slugify } from '../../src/lib/utils';

/**
 * Verificación de la página Actualidad contra la build real: Playwright corre
 * sobre `npm run preview`, o sea el `dist/` que dejó `npm run build`.
 *
 * La expectativa se recalcula acá con una réplica independiente de la regla
 * (Intl + lectura directa del frontmatter) en vez de importar
 * `src/lib/actualidad.ts`: el test compara la página contra la ventana
 * acordada, no contra el módulo que la implementa.
 *
 * La ventana depende del día del build, así que estos tests asumen que se
 * corren sobre un `dist/` construido el mismo día calendario argentino.
 */

const CONTENT_DIR = 'src/content/noticias';
const TIME_ZONE = 'America/Argentina/Buenos_Aires';
const WINDOW_DAYS = 7;

/** Artículos que todavía declaran la sección de compatibilidad (sin reclasificar). */
const LEGACY_PENDIENTES = [
  'prefectura-renovo-la-certificacion-de-su-sistema-de-gestion-de-la-calidad',
  'regimiento-infanteria-montana-10-aniversario-89-anos-neuquen',
];

interface RawArticle {
  slug?: string;
  status?: string;
  publishedAt?: string;
  section?: string;
  primaryTopic?: string;
  secondaryTopics?: string[];
}

function readRawArticles(): RawArticle[] {
  return readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const raw = readFileSync(join(CONTENT_DIR, file), 'utf-8');
      const frontmatter = raw.split('---')[1] ?? '';
      return (yaml.load(frontmatter) ?? {}) as RawArticle;
    });
}

function calendarDateIn(instant: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const valueOf = (type: string): string => parts.find((part) => part.type === type)?.value ?? '';

  return `${valueOf('year')}-${valueOf('month')}-${valueOf('day')}`;
}

function addDays(isoDate: string, days: number): string {
  const [year = 1970, month = 1, day = 1] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function windowFor(reference: Date): { start: string; end: string } {
  const end = calendarDateIn(reference);
  return { start: addDays(end, -WINDOW_DAYS), end };
}

/**
 * Fecha calendario argentina de publicación. El frontmatter escribe una fecha
 * suelta (`publishedAt: "2026-10-17"`) que `z.coerce.date()` convierte en
 * medianoche UTC; la ventana compara ese instante en calendario argentino.
 */
function publicationDate(article: RawArticle): string {
  return calendarDateIn(new Date(article.publishedAt ?? ''));
}

function publishedArticles(): Array<RawArticle & { slug: string }> {
  return readRawArticles().filter(
    (article): article is RawArticle & { slug: string } =>
      article.status === 'published' && typeof article.slug === 'string',
  );
}

function byDateDesc(a: RawArticle, b: RawArticle): number {
  const diff = new Date(b.publishedAt ?? 0).valueOf() - new Date(a.publishedAt ?? 0).valueOf();
  return diff !== 0 ? diff : (a.slug ?? '').localeCompare(b.slug ?? '');
}

function expectedActualidad(reference: Date): string[] {
  const { start, end } = windowFor(reference);

  return publishedArticles()
    .filter((article) => {
      const date = publicationDate(article);
      return date >= start && date <= end;
    })
    .sort(byDateDesc)
    .map((article) => article.slug);
}

function expectedByTopic(topic: string): string[] {
  return publishedArticles()
    .filter(
      (article) =>
        article.primaryTopic === topic || (article.secondaryTopics ?? []).includes(topic),
    )
    .sort(byDateDesc)
    .map((article) => article.slug);
}

const toSlug = (href: string): string => href.replace(/^\/noticias\//, '').replace(/\/$/, '');

/** Slugs de los artículos listados por las tarjetas de la página, en orden. */
async function cardSlugs(page: Page): Promise<string[]> {
  const hrefs = await page
    .locator('article a[href^="/noticias/"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));

  return hrefs.map(toSlug);
}

test.describe('Actualidad — feed de la ventana temporal', () => {
  test('conserva la URL publicada y el título de la página', async ({ page }) => {
    const response = await page.goto('/secciones/actualidad/');
    expect(response?.status(), 'La URL de Actualidad dejó de responder').toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Actualidad');
  });

  test('comunica que lista los últimos 7 días', async ({ page }) => {
    await page.goto('/secciones/actualidad/');
    await expect(page.getByText(/últimos 7 días/).first()).toBeVisible();
  });

  test('lista solo artículos publicados dentro de la ventana, del más nuevo al más viejo', async ({
    page,
  }) => {
    await page.goto('/secciones/actualidad/');

    const slugs = await cardSlugs(page);
    expect(slugs).toEqual(expectedActualidad(new Date()));
    expect(new Set(slugs).size, 'La página repite artículos').toBe(slugs.length);
  });

  test('ninguna tarjeta muestra una fecha fuera de la ventana', async ({ page }) => {
    const { start, end } = windowFor(new Date());
    await page.goto('/secciones/actualidad/');

    const fechas = await page
      .locator('article time[datetime]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('datetime') ?? ''));
    const slugs = await cardSlugs(page);

    expect(fechas.length, 'Cada tarjeta debe exponer su fecha').toBe(slugs.length);
    for (const valor of fechas) {
      const fecha = calendarDateIn(new Date(valor));
      expect(fecha >= start && fecha <= end, `${valor} quedó fuera de [${start}, ${end}]`).toBe(
        true,
      );
    }
  });

  test('muestra un estado vacío claro cuando la ventana no tiene artículos', async ({ page }) => {
    test.skip(expectedActualidad(new Date()).length > 0, 'La ventana tiene artículos hoy');

    await page.goto('/secciones/actualidad/');
    await expect(
      page.getByText('No hay artículos publicados en los últimos 7 días.'),
    ).toBeVisible();
  });
});

test.describe('Listados por topic — sin ventana temporal', () => {
  for (const topic of TOPICS) {
    test(`"${topic}" lista todos sus artículos publicados, sin importar la fecha`, async ({
      page,
    }) => {
      const response = await page.goto(`/secciones/${slugify(topic)}/`);
      expect(response?.status(), `La ruta de "${topic}" no responde`).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(topic);

      const slugs = await cardSlugs(page);
      expect(slugs).toEqual(expectedByTopic(topic));
      expect(new Set(slugs).size, `"${topic}" repite artículos`).toBe(slugs.length);
    });
  }
});

test.describe('Artículo reclasificado desde Actualidad', () => {
  const MIGRADO = {
    slug: 'choque-fatal-yrigoyen-vieytes-banfield-octubre-2026',
    topic: 'Tránsito',
    secondary: 'Seguridad',
  };

  test('aparece en el listado de su topic primario y del secundario', async ({ page }) => {
    for (const topic of [MIGRADO.topic, MIGRADO.secondary]) {
      await page.goto(`/secciones/${slugify(topic)}/`);

      const card = page.locator('article', {
        has: page.locator(`a[href="/noticias/${MIGRADO.slug}/"]`),
      });

      await expect(card, `No aparece en "${topic}"`).toBeVisible();
    }
  });

  test('en el listado secundario la tarjeta sigue enlazando a su topic primario', async ({
    page,
  }) => {
    // La etiqueta de la tarjeta sale del campo `section` del artículo (su topic
    // primario), así que dentro de Seguridad sigue apuntando a Tránsito y nunca
    // a la página de Actualidad.
    await page.goto(`/secciones/${slugify(MIGRADO.secondary)}/`);

    const card = page.locator('article', {
      has: page.locator(`a[href="/noticias/${MIGRADO.slug}/"]`),
    });

    await expect(card.locator(`a[href="/secciones/${slugify(MIGRADO.topic)}/"]`)).toBeVisible();
    await expect(card.locator('a[href="/secciones/actualidad/"]')).toHaveCount(0);
  });

  test('conserva URL, fecha de publicación y clasificación temática', async ({ page }) => {
    const response = await page.goto(`/noticias/${MIGRADO.slug}/`);
    expect(response?.status(), 'La URL canónica dejó de responder').toBe(200);

    const jsonLd = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').first().textContent()) ?? '{}',
    ) as { articleSection?: string; datePublished?: string };
    expect(jsonLd.articleSection).toBe(MIGRADO.topic);

    const enDisco = publishedArticles().find((article) => article.slug === MIGRADO.slug);
    expect(new Date(jsonLd.datePublished ?? '').valueOf()).toBe(
      new Date(enDisco?.publishedAt ?? '').valueOf(),
    );
  });

  test('ya no se etiqueta como Actualidad en su tarjeta', async ({ page }) => {
    await page.goto(`/secciones/${slugify(MIGRADO.topic)}/`);

    const card = page.locator('article', {
      has: page.locator(`a[href="/noticias/${MIGRADO.slug}/"]`),
    });

    await expect(card.locator('a[href="/secciones/actualidad/"]')).toHaveCount(0);
  });
});

test.describe('Contenido legacy de Actualidad', () => {
  test('sigue accesible por su URL, enlazado desde su sección de compatibilidad', async ({
    page,
  }) => {
    for (const slug of LEGACY_PENDIENTES) {
      const response = await page.goto(`/noticias/${slug}/`);
      expect(response?.status(), `La noticia legacy ${slug} no responde`).toBe(200);
      await expect(
        page.locator('nav[aria-label="Miga de pan"] a[href="/secciones/actualidad/"]'),
      ).toBeVisible();
    }
  });

  test('es exactamente el que quedó pendiente de revisión editorial', () => {
    // Si editorial reclasifica alguno, este test obliga a actualizar la lista
    // y el reporte de la migración en vez de dejarlo pasar en silencio.
    const legacy = readRawArticles().filter((article) => article.section === 'Actualidad');

    expect(legacy.map((article) => article.slug).sort()).toEqual([...LEGACY_PENDIENTES].sort());
    for (const article of legacy) {
      expect(article.primaryTopic, `${article.slug} sigue sin topic asignado`).toBeUndefined();
    }
  });
});
