# Diagnóstico Fase 0 — Integración del motor editorial TypeScript

## Repositorio y rama

- Repositorio: `AxelQuiroga/QSK-Noticias`
- Rama de trabajo: `feat/qsk-editorial-llm-engine`
- Commit actual: `06f205d5327ecd8232a9f81146e50f5817b33768`
- Rama base conceptual: `master` (`de75efa...`)

## Motor editorial existente (reutilizable)

Ubicación: `src/editorial/`

- `engine.ts` — `rewriteDescription(input, options)` reescribe únicamente `descripcion`/`description`, preserva el resto (`assertPreserved`), reintentos acotados, manejo de errores.
- `provider.ts` — interfaz `LlmProvider` + `CloudflareWorkersAiProvider` (Cloudflare Workers AI / GLM), timeout explícito, errores retryable/permanent.
- `prompt.ts` — `QSK_EDITORIAL_SYSTEM_PROMPT` + `buildUserContent` (solo título y descripción).
- `validation.ts` — validación de entrada/salida, detección de campo, `isRewritable`, `assertPreserved`.
- `errors.ts` — `EditorialEngineError`, `ProviderError` con `retryable`.

Pruebas: `tests/editorial/engine.test.ts` (24 tests, todos pasan). Typecheck `tsc --noEmit` sin errores.

## Workflow receptor actual

Archivo: `.github/workflows/agente-editorial.yml`

- Evento: `pull_request` (opened/synchronize/reopened) con paths a `borradores/**/*.md` y scripts.
- Patrón seguro ya establecido: checkout de la rama base confiable, worktree aislado del PR head, no ejecutar código del PR, commit con bot, guard contra loops por autor del último commit.
- Secrets usados: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- Permisos: `contents: write`, `pull-requests: read`.

No existe workflow receptor para `src/data/gacetillas.json`.

## Estructura de `src/data/gacetillas.json`

- Array de objetos (`Gacetilla`).
- Campos: `titulo`, `descripcion` (string | null), `imagenUrl`, `urlNoticia`, `fecha`, `volanta`, `fuente?`, `slug?`, `cuerpo?`.
- Identificador confiable: `urlNoticia` (URL absoluta única por noticia).
- 121 entradas actualmente.

## Cómo se generan los PR externos

Según `qsk-breves-automaticas` (repo externo):

- Crea/actualiza PR en QSK-Noticias sobre rama `automation/gacetillas-oficiales` modificando `src/data/gacetillas.json`.
- El PR permanece abierto para revisión humana.
- El extractor no conoce el proveedor de IA.

## Componentes reutilizables

- Motor TypeScript (`src/editorial/*`) — no duplicar.
- Patrón de workflow seguro de `agente-editorial.yml` (checkout base + worktree + guard de loop).
- `isRewritable()` para omitir descripciones nulas/vacías.
- Validaciones existentes del motor.

## Bloqueos técnicos y riesgos

1. **Loop de reprocesamiento**: si el motor commitea al PR, un evento `synchronize` podría volver a procesar. Mitigación: guard por autor del último commit (bot) + procesar solo items que difieren respecto a `master` (base).
2. **Detección de cambios**: comparar por `urlNoticia`. Procesar si el item no existe en base o si algún campo difiere. No reprocesar items idénticos.
3. **Secrets en PR externos**: usar `pull_request` (no `pull_request_target`) y verificar `head.repo.full_name == github.repository` para PRs del mismo repo; los PR del extractor son same-repo. No ejecutar código del PR.
4. **Concurrencia**: group por número de PR, `cancel-in-progress: false`.
5. **Node**: este repo usa Node 22 en CI; el motor se desarrolló con Node 24 pero usa APIs estándar (fetch, AbortController). Verificar compatibilidad en CI.
6. **Typecheck**: `astro check` vs `tsc`. El módulo editorial pasa `tsc --noEmit`.
7. **Escritura segura**: escribir JSON con formato estable (2 espacios + newline), validar antes de commitear, manejar conflictos de push.

## Archivos que requerirán cambios (Fase 2, no implementados aún)

- Nuevo workflow: `.github/workflows/gacetillas-editorial.yml` (o integración controlada).
- Nuevo módulo: `src/editorial/integration/` (detector de cambios, procesador por lote, actualizador seguro) — solo si se justifica; preferir funciones pequeñas.
- Pruebas: `tests/editorial/integration.test.ts`.
- Documentación: actualizar `docs/contrato-editorial-llm.md`.

## Estrategia de integración propuesta

1. Evento `pull_request` con paths `src/data/gacetillas.json`.
2. Guard: solo PRs del mismo repositorio.
3. Checkout base confiable + worktree PR head (solo datos).
4. Cargar y validar estrictamente ambos JSON (array, campos requeridos, tipos).
5. Detectar items a procesar por `urlNoticia` (nuevos o modificados vs base).
6. Para cada item reescribible, llamar `rewriteDescription` con proveedor Cloudflare. Omitir nulos/vacíos. Un fallo individual no corrompe el lote.
7. Construir el nuevo array preservando orden y campos; solo actualizar `descripcion` en items procesados.
8. Escribir JSON, commitear en la rama del PR con autor bot y mensaje identificable.
9. Guard contra loops: si el último commit es del bot, no procesar.

## Riesgos pendientes

- Confirmar disponibilidad de secrets en este repo (en `qsk-breves-automaticas` estaban vacíos; verificar aquí).
- Confirmar que `pull_request` (no `pull_request_target`) dispone de secrets para PRs same-repo.
- Definir manejo de conflictos de push (reintentar fetch + rebase o fallar explícitamente).

## Estado de criterios de aceptación

Fase 0 completada (diagnóstico). Pendiente autorización para Fase 1 (diseño) e implementación.
