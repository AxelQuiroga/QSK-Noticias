import { test, expect, type Page } from '@playwright/test';
import { NAV_DIRECT, NAV_GROUPS, NAV_ITEMS, type NavGroup } from '../../src/data/sections';
import { slugify } from '../../src/lib/utils';

/**
 * Comportamiento de los desplegables del header. La estructura se deriva de
 * `NAV_ITEMS` / `NAV_GROUPS` / `NAV_DIRECT`, así que estos tests acompañan
 * cualquier cambio del catálogo sin listas de secciones duplicadas.
 */
const sectionHref = (section: string) => `/secciones/${slugify(section)}/`;
const SECCIONES_AGRUPADAS = NAV_GROUPS.flatMap((group) => group.sections);

/** Etiquetas de las entradas del header, en el orden acordado (`NAV_ITEMS`). */
const ETIQUETAS_NAV = NAV_ITEMS.map((item) => (item.kind === 'group' ? item.label : item.section));

/** Grupo del nav en la posición `index` (noUncheckedIndexedAccess). */
function grupoDe(index: number): NavGroup {
  const grupo = NAV_GROUPS[index];
  if (!grupo) throw new Error(`El nav no tiene un grupo en la posición ${index}`);
  return grupo;
}

/** Primera sección del grupo `index`, con el tipo garantizado (noUncheckedIndexedAccess). */
function primeraSeccionDe(index: number): string {
  const seccion = grupoDe(index).sections[0];
  if (!seccion) throw new Error(`El grupo ${index} del nav no tiene secciones`);
  return seccion;
}

const navEscritorio = (page: Page) => page.locator('nav[aria-label="Navegación principal"]');
const menuMovil = (page: Page) => page.getByRole('navigation', { name: 'Navegación móvil' });

/** Abre el menú móvil (el header se reemplaza en cada navegación) y lo devuelve. */
async function abrirMenuMovil(page: Page) {
  await page.locator('#menu-toggle').click();
  const menu = menuMovil(page);
  await expect(menu).toBeVisible();
  return menu;
}

test.describe('Header de escritorio · grupos', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('muestra Portada, los grupos, los accesos directos y Buscar', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav[aria-label="Navegación principal"]');

    await expect(nav.getByRole('link', { name: 'Portada', exact: true })).toBeVisible();
    for (const group of NAV_GROUPS) {
      await expect(nav.getByRole('button', { name: group.label, exact: true })).toBeVisible();
    }
    for (const section of NAV_DIRECT) {
      await expect(nav.getByRole('link', { name: section, exact: true })).toBeVisible();
    }
    await expect(nav.getByRole('link', { name: 'Buscar', exact: true })).toBeVisible();

    // Las secciones de los grupos no son enlaces sueltos de primer nivel.
    await expect(nav.locator(':scope > a[href^="/secciones/"]')).toHaveCount(NAV_DIRECT.length);
  });

  test('ordena las entradas como lo acuerda el catálogo de navegación', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav[aria-label="Navegación principal"]');

    const entradas = await nav
      .locator(':scope > a, :scope > div[data-nav-group]')
      .evaluateAll((nodos) =>
        nodos.map((nodo) => {
          // Un grupo expone su etiqueta en el disparador: sus secciones viven
          // en el desplegable y no cuentan como entradas de primer nivel.
          const etiqueta = nodo.matches('[data-nav-group]')
            ? nodo.querySelector('[data-nav-trigger]')?.textContent
            : nodo.textContent;
          return etiqueta?.trim() ?? '';
        }),
      );

    expect(entradas).toEqual(['Portada', ...ETIQUETAS_NAV, 'Buscar']);
  });

  test('cada grupo abre con clic y deja visibles solo sus secciones', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav[aria-label="Navegación principal"]');

    for (const group of NAV_GROUPS) {
      const trigger = nav.getByRole('button', { name: group.label, exact: true });
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');

      await trigger.click();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');

      for (const section of group.sections) {
        await expect(nav.locator(`a[href="${sectionHref(section)}"]`)).toBeVisible();
      }

      // Las secciones de los otros grupos siguen ocultas.
      const otros = SECCIONES_AGRUPADAS.filter((section) => !group.sections.includes(section));
      for (const section of otros) {
        await expect(nav.locator(`a[href="${sectionHref(section)}"]`)).toBeHidden();
      }

      await trigger.click();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    }
  });

  test('mantiene un solo menú abierto a la vez', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav[aria-label="Navegación principal"]');
    const primerGrupo = nav.getByRole('button', { name: grupoDe(0).label, exact: true });
    const comunidad = nav.getByRole('button', { name: 'Comunidad', exact: true });

    await primerGrupo.click();
    await expect(primerGrupo).toHaveAttribute('aria-expanded', 'true');

    await comunidad.click();
    await expect(comunidad).toHaveAttribute('aria-expanded', 'true');
    await expect(primerGrupo).toHaveAttribute('aria-expanded', 'false');
    await expect(nav.locator(`a[href="${sectionHref(primeraSeccionDe(0))}"]`)).toBeHidden();
  });

  test('cierra con Escape y devuelve el foco al disparador', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav[aria-label="Navegación principal"]');
    const trigger = nav.getByRole('button', { name: 'Ciudad', exact: true });

    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(nav.locator('a[href="/secciones/transito/"]')).toBeHidden();

    const enfocado = await page.evaluate(() => document.activeElement?.textContent?.trim());
    expect(enfocado).toContain('Ciudad');
  });

  test('cierra al hacer clic fuera del menú', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav[aria-label="Navegación principal"]');
    const trigger = nav.getByRole('button', { name: 'Comunidad', exact: true });

    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    // Clic en un elemento no interactivo del contenido.
    await page.getByRole('heading', { name: 'Secciones' }).click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    // El cierre fue por el clic afuera, no por una navegación.
    await expect(page).toHaveURL(/\/$/);
  });

  test('se puede abrir y navegar solo con teclado', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav[aria-label="Navegación principal"]');
    const trigger = nav.getByRole('button', { name: grupoDe(0).label, exact: true });
    const primera = primeraSeccionDe(0);

    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    // Tab entra al menú: el primer destino es la primera sección del grupo.
    await page.keyboard.press('Tab');
    const enfocado = await page.evaluate(() => document.activeElement?.getAttribute('href'));
    expect(enfocado).toBe(sectionHref(primera));

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(sectionHref(primera)));
  });

  test('al elegir una sección navega y deja el header cerrado', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav[aria-label="Navegación principal"]');

    await nav.getByRole('button', { name: 'Ciudad', exact: true }).click();
    await nav.locator('a[href="/secciones/transito/"]').click();

    await expect(page).toHaveURL(/\/secciones\/transito/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tránsito');
    await expect(
      page.locator('nav[aria-label="Navegación principal"] [aria-expanded="true"]'),
    ).toHaveCount(0);
  });

  test('los grupos siguen abriendo y cerrando después de navegar', async ({ page }) => {
    // Regresión: los listeners de los grupos viven en `document` y se registran
    // una sola vez. Si se re-registraran en cada `astro:page-load`, un mismo clic
    // alternaría el grupo N veces y el desplegable dejaría de abrir después de
    // navegar (el usuario lo reporta como "no salen las opciones"). Por eso se
    // verifica en la página inicial y tras CADA navegación, no sólo una vez.
    const destinos = [
      '/secciones/economia/',
      '/secciones/deportes/',
      '/buscar/',
      '/secciones/economia/',
    ];

    const verificarGrupo = async (navegaciones: number) => {
      const trigger = navEscritorio(page).getByRole('button', { name: 'Ciudad', exact: true });

      await trigger.click();
      await expect(
        trigger,
        `El grupo no abrió tras ${navegaciones} navegación(es)`,
      ).toHaveAttribute('aria-expanded', 'true');
      await expect(
        navEscritorio(page).locator('a[href="/secciones/transito/"]'),
        `Las opciones no salieron tras ${navegaciones} navegación(es)`,
      ).toBeVisible();

      await trigger.click();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(navEscritorio(page).locator('a[href="/secciones/transito/"]')).toBeHidden();
    };

    await page.goto('/');
    await verificarGrupo(0);

    for (const [indice, destino] of destinos.entries()) {
      // Se navega con enlaces directos (fuera de desplegables) y vía ClientRouter,
      // que es justo el camino que reemplaza el header.
      await navEscritorio(page).locator(`a[href="${destino}"]`).click();
      await expect(page).toHaveURL(new RegExp(destino));
      await verificarGrupo(indice + 1);
    }
  });

  test('todos los enlaces de los grupos resuelven (sin enlaces rotos)', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav[aria-label="Navegación principal"]');

    const hrefs = await nav
      .locator('a[href^="/secciones/"]')
      .evaluateAll((links) => [...new Set(links.map((link) => link.getAttribute('href') ?? ''))]);

    expect(hrefs).toHaveLength(SECCIONES_AGRUPADAS.length + NAV_DIRECT.length);

    for (const href of hrefs) {
      const response = await page.request.get(new URL(href, page.url()).toString());
      expect(response.status(), `Enlace roto: ${href}`).toBe(200);
    }
  });

  test('no desborda el header en 1024px ni en 1280px', async ({ page }) => {
    for (const width of [1024, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth, `El header desborda a ${width}px`).toBeLessThanOrEqual(clientWidth);
    }
  });
});

test.describe('Menú móvil · grupos', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('muestra los grupos y esconde sus secciones hasta expandir', async ({ page }) => {
    await page.goto('/');
    await page.locator('#menu-toggle').click();

    const menu = page.getByRole('navigation', { name: 'Navegación móvil' });
    await expect(menu).toBeVisible();

    await expect(menu.getByRole('link', { name: 'Portada', exact: true })).toBeVisible();

    for (const group of NAV_GROUPS) {
      await expect(menu.getByRole('button', { name: group.label, exact: true })).toBeVisible();
      for (const section of group.sections) {
        await expect(menu.locator(`a[href="${sectionHref(section)}"]`)).toBeHidden();
      }
    }

    for (const section of NAV_DIRECT) {
      await expect(menu.locator(`a[href="${sectionHref(section)}"]`)).toBeVisible();
    }
    await expect(menu.getByRole('link', { name: 'Buscar', exact: true })).toBeVisible();
  });

  test('expande, contrae y navega al tocar una sección', async ({ page }) => {
    await page.goto('/');
    await page.locator('#menu-toggle').click();

    const menu = page.getByRole('navigation', { name: 'Navegación móvil' });
    const trigger = menu.getByRole('button', { name: 'Ciudad', exact: true });
    const transito = menu.locator('a[href="/secciones/transito/"]');

    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(transito).toBeVisible();

    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(transito).toBeHidden();

    await trigger.click();
    await transito.click();
    await expect(page).toHaveURL(/\/secciones\/transito/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tránsito');
  });

  test('las secciones de todos los grupos resuelven', async ({ page }) => {
    await page.goto('/');
    await page.locator('#menu-toggle').click();

    const menu = page.getByRole('navigation', { name: 'Navegación móvil' });

    for (const group of NAV_GROUPS) {
      await menu.getByRole('button', { name: group.label, exact: true }).click();
      for (const section of group.sections) {
        const href = sectionHref(section);
        await expect(menu.locator(`a[href="${href}"]`)).toBeVisible();
        const response = await page.request.get(new URL(href, page.url()).toString());
        expect(response.status(), `Enlace roto: ${href}`).toBe(200);
      }
    }
  });

  test('no desborda horizontalmente con ningún grupo expandido', async ({ page }) => {
    await page.goto('/');
    await page.locator('#menu-toggle').click();

    const menu = page.getByRole('navigation', { name: 'Navegación móvil' });

    for (const group of NAV_GROUPS) {
      await menu.getByRole('button', { name: group.label, exact: true }).click();
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(
        scrollWidth,
        `Desborda con el grupo "${group.label}" expandido`,
      ).toBeLessThanOrEqual(clientWidth);
    }
  });

  test('los grupos siguen expandiendo después de navegar (regresión)', async ({ page }) => {
    // Misma regresión que en escritorio, pero por el camino del menú móvil: el
    // usuario abre el hamburguesa, navega a otra sección, vuelve a abrirlo y
    // espera que las opciones salgan. Se verifica tras cada navegación.
    const expandirCiudad = async (navegaciones: number) => {
      const menu = await abrirMenuMovil(page);
      const trigger = menu.getByRole('button', { name: 'Ciudad', exact: true });

      await trigger.click();
      await expect(
        trigger,
        `El grupo no abrió tras ${navegaciones} navegación(es)`,
      ).toHaveAttribute('aria-expanded', 'true');
      await expect(
        menu.locator('a[href="/secciones/transito/"]'),
        `Las opciones no salieron tras ${navegaciones} navegación(es)`,
      ).toBeVisible();

      return trigger;
    };

    await page.goto('/');

    let trigger = await expandirCiudad(0);
    await trigger.click();
    await menuMovil(page).locator('a[href="/secciones/deportes/"]').click();
    await expect(page).toHaveURL(/\/secciones\/deportes/);

    trigger = await expandirCiudad(1);
    await trigger.click();
    await menuMovil(page).locator('a[href="/buscar/"]').click();
    await expect(page).toHaveURL(/\/buscar/);

    trigger = await expandirCiudad(2);
    await trigger.click();
    await menuMovil(page).locator('a[href="/secciones/economia/"]').click();
    await expect(page).toHaveURL(/\/secciones\/economia/);

    await expandirCiudad(3);
  });
});
