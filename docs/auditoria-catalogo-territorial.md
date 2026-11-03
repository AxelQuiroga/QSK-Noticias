# Auditoría Fase 1 — Catálogo territorial nacional y filtros dinámicos

## Repositorio y rama

- Repositorio: `AxelQuiroga/QSK-Noticias`
- Rama: `feat/catalogo-territorial-nacional`
- Commit base: `2bdce5f` (master actualizado)

## 1. Catálogo actual (`src/data/locations.ts`)

- Total de ubicaciones: 19.
- Provincias cargadas: **2** únicamente:
  - `provincia-buenos-aires` → Buenos Aires
  - `provincia-santa-fe` → Santa Fe
- Municipios: 14 (conurbano bonaerense).
- Localidades: 2 (Banfield, Ezpeleta).
- Regiones editoriales: 2 (Zona Sur, AMBA).
- País: 1 (Argentina).

Identificadores estables y relaciones administrativas (`parentId`) correctas para las existentes. CABA no está modelada. Las demás 22 jurisdicciones faltan.

## 2. Resolución de provincia

- `getProvinciaOf(name)` busca la ubicación por nombre y retorna el ancestro de tipo `provincia`.
- **Limitación detectada:** si `name` es el nombre de una provincia, `getAncestorOfType(location, 'provincia')` es `undefined` (la provincia es ella misma, no un ancestro), por lo que retorna `''`. Esto impide contabilizar noticias provinciales sin municipio.
- Para municipios y localidades funciona correctamente (vía `parentId`).

## 3. Índice de búsqueda (`scripts/generate-search.mjs`)

- `SearchIndexEntry` no incluye campo `provincia`.
- `buildSearchIndex` serializa: slug, title, description, section, municipality, localidad, region, scope, publishedAt, content.
- No serializa `data.provincia` aunque el frontmatter lo permita.
- Filtra solo artículos `status === 'published'` (correcto para no contar borradores/revisión/despublicados).

## 4. Resolución en runtime (`src/lib/search.ts`)

- `provinciaOf(entry)` resuelve la provincia a partir de `entry.municipality` o `entry.localidad` usando el catálogo. Si ninguno pertenece al catálogo, retorna `''`.
- No considera `entry.provincia` (porque no existe en el índice).
- Resultado: una noticia provincial sin municipio no puede atribuirse a su provincia en el buscador.

## 5. Interfaz (`src/pages/buscar.astro`)

- Pestaña "Provincias" renderiza **todas** las ubicaciones de tipo `provincia` (`getLocationsByType('provincia')`), sin filtrar por cantidad de artículos.
- Cuenta artículos con `countOf((doc) => doc.location.provincia === location.name)`.
- Con solo 2 provincias en el catálogo, el problema no es visible; con 24, las 22 sin noticias aparecerían como filtros vacíos.
- Municipios y localidades también se renderizan todos (comportamiento a conservar según el ODD).

## 6. Schema (`src/schemas/news.ts`)

- `provincia` es un campo opcional validado contra el catálogo (`isKnownLocationName(value, 'provincia')`).
- No existe validación de consistencia entre `provincia` y `municipality`/`localidad` (ej. un municipio de Buenos Aires declarado con provincia Córdoba pasaría).
- `scope` es independiente (correcto).

## 7. Tests existentes

- `tests/search-index.test.ts`: valida que ubicaciones del índice pertenezcan al catálogo (municipality, localidad, region). No valida provincia (no existe en el índice).
- `tests/search.test.ts`: construye entradas sin campo provincia. `provinciaOf` se resuelve por municipio/localidad.
- `tests/content-validation.test.ts`: valida schema de todos los artículos publicados. No hay tests específicos de consistencia geográfica.

## 8. Limitaciones identificadas

1. `getProvinciaOf` no retorna el nombre cuando la ubicación ya es una provincia.
2. El índice no serializa `provincia`.
3. La interfaz no filtra provincias con cero artículos.
4. El schema no valida consistencia territorial.
5. Solo 2 de 24 jurisdicciones están cargadas.

## Propuesta técnica (para Fase 2)

1. Completar `LOCATIONS` con las 24 jurisdicciones (ids estables `provincia-<slug>`).
2. Corregir `getProvinciaOf` para retornar el nombre si la ubicación es provincia.
3. Agregar `provincia` a `SearchIndexEntry` y a `buildSearchIndex` (usar `data.provincia` si existe, o resolver por jerarquía).
4. Actualizar `provinciaOf` en `search.ts` para preferir `entry.provincia`.
5. Filtrar en `buscar.astro` las provincias con `count === 0`.
6. Agregar validación de consistencia en `newsSchema` (provincia vs municipio/localidad).
7. Actualizar tests de search-index y search para el nuevo campo.

No se modificó código en esta fase.
