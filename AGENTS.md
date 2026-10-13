# QSK Noticias — Guía para agentes

## Descripción

Portal de noticias estático construido con Astro 7, TypeScript, Tailwind CSS 4.
Contenido gestionado mediante Astro Content Collections.

## Estructura clave

- `src/content/news/` — Artículos Markdown con frontmatter validado
- `src/lib/articles.ts` — Funciones de filtrado y ordenamiento de artículos
- `src/lib/utils.ts` — Funciones puras (slugify, formatDate)
- `src/components/` — Header, Footer, ArticleCard
- `src/pages/` — Rutas del sitio (estáticas y dinámicas)
- `tests/` — Tests unitarios (Vitest) y e2e (Playwright)

## Comandos esenciales

```bash
npm run dev       # Desarrollo
npm run build     # Build de producción
npm test          # Tests unitarios
npm run test:e2e  # Tests e2e
npm run typecheck # Verificación de tipos
```

## Convenciones

- Todo el contenido editorial pasa por validación de schema (Zod)
- Solo artículos con `status: 'published'` aparecen en producción
- Los slugs deben ser URL-friendly (minúsculas, guiones, sin acentos)
- Usar `slugify()` de `src/lib/utils.ts` para generar slugs consistentes
- El contenido de demostración es ficticio y no debe publicarse como real

## Tests

- Unitarios: `tests/*.test.ts` — lógica pura, sin dependencia de Astro
- E2E: `tests/e2e/*.spec.ts` — comportamiento real del navegador
- Para ejecutar e2e primero: `npm run test:e2e:install`

## Despliegue

Cloudflare Pages con salida estática. Ver README.md para instrucciones.
