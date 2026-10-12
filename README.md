# SAQL Noticias

Medio digital independiente con cobertura de actualidad en Zona Sur del conurbano bonaerense.

## Stack

- **Astro 7** — Framework principal con renderizado estático
- **TypeScript** — Tipado estricto
- **Astro Content Collections** — Gestión de contenido editorial
- **Markdown** — Formato de artículos
- **Tailwind CSS 4** — Estilos con tokens de diseño
- **Vitest** — Tests unitarios
- **Playwright** — Tests e2e con navegador real

## Requisitos

- Node.js 20+ (probado con v24.11.0)
- npm 10+ (probado con 11.9.0)

## Instalación

```bash
npm install
```

## Comandos

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build

# Preview del build
npm run preview

# Tests unitarios
npm test

# Tests e2e
npm run test:e2e

# Instalar navegadores de Playwright
npm run test:e2e:install

# Typecheck
npm run typecheck
```

## Estructura

```
src/
  content/
    news/          # Artículos en Markdown
  components/      # Componentes reutilizables
  layouts/         # Layouts base
  lib/             # Lógica compartida
  pages/           # Rutas del sitio
  styles/          # Estilos globales y tokens
tests/
  e2e/             # Tests de Playwright
  *.test.ts        # Tests unitarios
scripts/
  generate-search.mjs  # Genera índice de búsqueda
```

## Cómo escribir un artículo

1. Creá un archivo `.md` en `src/content/news/`
2. Agregá el frontmatter obligatorio:

```markdown
---
title: 'Titular del artículo'
description: 'Bajada del artículo'
slug: 'titulo-del-articulo'
section: 'Sección'
municipality: 'Municipio'
author: 'Autor o redacción'
status: 'review'  # draft | review | published
featured: false
sources: []
---

Contenido del artículo en Markdown.
```

3. Solo los artículos con `status: 'published'` aparecen en producción

## Flujo editorial

1. **Crear**: escribí el artículo con `status: 'draft'` o `status: 'review'`
2. **Revisar**: control editorial humano del contenido
3. **Publicar**: cambiá a `status: 'published'` y ejecutá `npm run build`
   - El script `publish.mjs` asigna `publishedAt` automáticamente (solo la primera vez)
   - Si el artículo ya tiene `publishedAt`, no se modifica
4. **Actualizar**: para actualizaciones sustanciales, agregá `updatedAt` manualmente
   - La fecha original de publicación se conserva siempre

## Cómo cambiar el artículo destacado

1. Abrí el artículo que quieras destacar en `src/content/news/`
2. Cambiá `featured: true`
3. Asegurate de que solo UN artículo tenga `featured: true`

## Despliegue en Cloudflare Pages

1. Instalá Wrangler: `npm install -g wrangler`
2. Creá el archivo `wrangler.json`:

```json
{
  "name": "saql-noticias",
  "compatibility_date": "2026-10-12",
  "assets": {
    "directory": "./dist"
  }
}
```

3. Conectá el repositorio en Cloudflare Dashboard (Compute > Workers & Pages)
4. Configurá: Build command `npx astro build`, Output directory `dist`
5. El subdominio gratuito `*.pages.dev` se asigna automáticamente

## Contenido de demostración

Todos los artículos incluidos son ficticios. No representan hechos reales.
Antes del lanzamiento público, reemplazar por contenido real que cumpla el contrato editorial.

## Licencia

Proyecto privado.
