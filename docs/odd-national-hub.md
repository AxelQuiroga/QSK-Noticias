# ODD — Hub Nacional

**Estado:** propuesta de implementación  
**Rama:** `feat/national-hub`  
**Base:** `master`  
**Alcance:** servir en QSK Noticias las noticias nacionales generadas por Extracción Ultimate y adaptar la navegación principal para exponer el nuevo hub.

## 1. Observations

1. El schema de noticias ya admite `scope: nacional`, pero el campo es opcional.
2. El schema exige actualmente `section` para todo artículo publicado. Esa regla impide publicar noticias nacionales sin tema editorial.
3. `section` y `primaryTopic` representan clasificación temática; `scope` representa alcance geográfico. No deben confundirse.
4. No existe actualmente una consulta dedicada `getNationalArticles()` en `src/lib/articles.ts`.
5. Existe un hub independiente `/internacional/` que filtra artículos publicados por alcance internacional.
6. El header se construye desde `NAV_ITEMS` en `src/data/sections.ts`. Hoy ofrece Portada, grupos temáticos, enlaces directos e Internacional.
7. El enlace Buscar existe tanto en navegación desktop como móvil y debe conservarse.
8. `ArticleCard.astro` presupone que cada artículo tiene `section` y construye un enlace `/secciones/<slug>/`. Una noticia nacional sin sección produciría una etiqueta/enlace incorrectos.
9. La portada utiliza `getLatestArticles()` sin filtrar por alcance. Cambiar ese comportamiento podría desplazar noticias locales y queda fuera del objetivo mínimo.
10. La política del sitemap y la verificación de build deben revisarse al incorporar `/nacional/`.
11. Extracción Ultimate ya no emite frontmatter Markdown: el contrato vigente de `src/borrador.ts` es JSON con `title`, `description`, `content`, `publishedAt`, `url` e `image`.
12. El JSON no contiene `scope`, `section`, `status`, `slug`, `author` ni `sources`. Tampoco contiene una marca explícita que permita clasificar automáticamente cada historia como nacional.
13. El flujo de GitHub de Extracción Ultimate sube esos JSON a la carpeta raíz `borradores/` de QSK. El propio PR declara que esa carpeta está fuera de `src/content/noticias` y que no agrega noticias al sitio.
14. QSK carga únicamente archivos `.md` desde `src/content/noticias`. Por lo tanto, fusionar el PR del extractor no hace que una noticia aparezca en el sitio: hace falta un paso editorial/de importación que transforme el JSON aprobado al formato de contenido de QSK.
15. Extracción Ultimate descarga imágenes localmente en su propio workspace y coloca en `image.src` una ruta como `/images/noticias/<archivo>`. El plan de envío a QSK incluye los JSON de `borradores/`, pero no se encontró evidencia de que también copie esos binarios a `public/images/noticias/`. La ruta puede quedar apuntando a un archivo inexistente en QSK.
16. El contrato permite `image: null` y `image.alt: null`; el schema de QSK, cuando incluye imagen, exige archivo local existente y texto alternativo no vacío.
17. El contrato permite `title`, `description` y `content` nulos. El schema de QSK exige titular y bajada no vacíos; el cuerpo de la noticia debe estar presente para crear un artículo útil.
18. La navegación actual no tiene una página `/locales/`. Los destinos geográficos existentes son `/regiones/<slug>/`, `/municipios/<slug>/` y `/localidades/<slug>/`. El catálogo contiene las regiones Zona Sur y AMBA; once municipios; y las localidades Banfield y Ezpeleta. La portada enlaza actualmente a regiones y municipios, pero no a un índice general de Locales.
19. `src/data/sections.ts` define grupos temáticos y enlaces directos. `src/components/Header.astro` los representa con un único nivel de desplegable; para que Locales agrupe rutas geográficas arbitrarias se necesitará ampliar el modelo de navegación o crear un hub local directo.

## 2. Decisions

### D1 — Nacional es un hub geográfico independiente

`Nacional` no se agrega al catálogo de temas `TOPICS/SECTIONS`. Su identidad se expresa mediante `scope: nacional` y su ruta propia es `/nacional/`.

### D2 — Tema y alcance son dimensiones independientes

- `scope`: alcance geográfico (`local`, `regional`, `provincial`, `nacional`, `internacional`).
- `section` / `primaryTopic`: tema editorial.
- `country`: reservado a noticias con `scope: internacional`; no se asigna `AR` a noticias nacionales.

Una noticia nacional puede tener tema editorial o no tenerlo. Si tiene un tema válido, conserva su clasificación temática y puede seguir apareciendo en el feed temático correspondiente.

### D3 — Compatibilidad editorial de artículos nacionales sin tema

Se permitirá que un artículo publicado sin `section` únicamente cuando su `scope` sea `nacional`. Las noticias publicadas de otros alcances seguirán requiriendo sección hasta que exista una decisión editorial distinta.

### D4 — Tarjetas con fallback contextual

- Si existe `section`, la tarjeta muestra el tema y enlaza a su ruta temática actual.
- Si falta `section` y el artículo es nacional, muestra `Nacional` y enlaza a `/nacional/`.
- No se generan enlaces vacíos ni rutas `/secciones//`.

### D5 — Navegación principal

La navegación visible se simplifica a:

`Inicio | Locales | Nacional | Internacional | Buscar`

- `Inicio` apunta a `/`.
- `Locales` conserva acceso a la cobertura local/AMBA y sus destinos actuales, reorganizados como agrupación si corresponde.
- `Nacional` apunta a `/nacional/`.
- `Internacional` apunta a `/internacional/`.
- `Buscar` sigue visible y funcional en desktop y móvil.

El detalle de cómo se despliega `Locales` debe preservar el acceso actual a los destinos locales relevantes, sin convertir los grupos de navegación en secciones editoriales.

### D6 — Alcance acotado de portada

No se modifica el criterio de `getLatestArticles()` ni el orden editorial de la portada en esta etapa. Las noticias nacionales no deben desplazar automáticamente el protagonismo local de QSK.

### D7 — Extracción Ultimate sigue siendo un generador de borradores JSON

No se modifica Extracción Ultimate ni se incorpora LLM, reescritura, workflow remoto o publicación automática en esta tarea. El PR del extractor continúa dejando JSON en `borradores/`, fuera de la colección publicada. QSK necesitará un paso de importación/promoción editorial explícito para convertir una historia revisada en un archivo Markdown de `src/content/noticias/`. El artículo importado debe quedar como borrador/revisión hasta que una persona lo apruebe para publicación.

## 3. Specifications

### S1 — Validación del contenido

- Aceptar noticia `published` con `scope: nacional` y sin `section`.
- Aceptar noticia nacional con `section` válida.
- Rechazar noticia publicada de alcance no nacional sin `section`.
- Rechazar valores de `section` fuera del catálogo.
- Mantener la regla: `scope: internacional` requiere `country`.
- Mantener la regla: `country` no puede aparecer en noticias que no sean internacionales.
- No exigir `country: AR` para noticias nacionales.

### S2 — Consulta de noticias nacionales

Agregar `getNationalArticles()` o equivalente en `src/lib/articles.ts`:
- parte de los artículos publicados mediante la función compartida existente;
- filtra exclusivamente `scope === 'nacional'`;
- conserva el orden descendente por fecha y el desempate estable por slug;
- no duplica artículos que también tengan un tema editorial.

### S3 — Página `/nacional/`

Crear una página estática con:
- título y descripción editoriales propios;
- listado de artículos nacionales;
- tarjetas existentes;
- estado vacío claro cuando todavía no haya noticias;
- canonical correcto;
- inclusión en sitemap si la política de indexación lo permite.

La presentación puede tomar como referencia el hub Internacional, pero sin copiar su clasificación por países.

### S4 — ArticleCard

Agregar el fallback para noticias nacionales sin `section`, preservando exactamente el comportamiento de artículos que sí tienen sección. Revisar usos existentes para evitar regresiones en portada, búsqueda, municipios, regiones y feeds.

### S5 — Header responsive

Actualizar la fuente de configuración y el componente Header para reflejar la navegación acordada en escritorio y móvil. Mantener:
- el botón Buscar;
- accesibilidad por teclado;
- atributos ARIA y comportamiento de disclosure;
- apertura/cierre del menú móvil;
- navegación a los destinos locales existentes.

### S6 — Adaptación del JSON de Extracción Ultimate a contenido QSK

Contrato verificado en `src/borrador.ts` de Extracción Ultimate:

```ts
type Borrador = {
  title: string | null;
  description: string | null;
  content: string | null;
  publishedAt: string | null;
  url: string;
  image: { src: string; alt: string | null } | null;
};
```

El flujo de envío coloca archivos `.json` en `borradores/` del repositorio QSK. Esa carpeta no forma parte de la colección de Astro; fusionar el PR no publica ni muestra la noticia.

La adaptación QSK debe:
- validar el JSON antes de importarlo;
- preservar `url` como fuente original en `sources[]`;
- convertir `content` en cuerpo Markdown sin reescribir ni inventar información;
- derivar un `slug` URL-friendly del titular, sujeto a revisión de colisiones;
- completar `author` con la atribución editorial acordada;
- dejar `status: draft` o `review`, nunca publicar automáticamente;
- asignar `scope` solo según la regla editorial que se acuerde (el JSON actual no lo trae);
- no crear `image` si no existe una imagen utilizable con archivo copiado y `alt` válido;
- resolver el significado de `publishedAt`: el JSON lo define como fecha original de la fuente, mientras que QSK lo usa como fecha de publicación/orden del artículo;
- no inventar `section` cuando no haya clasificación temática.

La promoción/importación debe contemplar copiar la imagen real al repositorio QSK si se conserva una ruta local, porque el extractor solo garantiza la descarga en su propio workspace.

### S7 — Pruebas

Agregar pruebas unitarias para:
- schema nacional sin sección válida;
- nacional con sección válida;
- local/provincial sin sección inválido;
- internacional sin país inválido;
- país en noticia no internacional inválido;
- sección desconocida inválida;
- consulta nacional filtrada y ordenada;
- fallback de ArticleCard sin sección;
- conservación de enlaces temáticos cuando sí hay sección.

Agregar pruebas E2E para:
- ruta `/nacional/`;
- listado y estado vacío;
- exclusión de noticias de otros alcances;
- navegación desktop y móvil;
- acceso a Buscar;
- preservación de rutas locales e Internacional.

### S8 — Verificación de calidad

Ejecutar, según disponibilidad del entorno:
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build` (incluye generación del índice de búsqueda y verificación del sitemap mediante los hooks configurados)
- `npm run test:e2e`

No declarar una verificación como exitosa si no fue ejecutada. Revisar el diff final y comprobar que no se modificó `master`.

## 4. Fuera de alcance

- Rehacer el diseño completo de la portada.
- Cambiar el criterio de selección de noticias destacadas o últimas noticias.
- Rediseñar el hub Internacional.
- Crear una sección temática llamada Nacional.
- Añadir filtros nacionales a la búsqueda en esta primera etapa, salvo que una dependencia técnica lo vuelva imprescindible.
- Cambiar el extractor, incorporar LLM o automatizar la ejecución del extractor.
- Publicar directamente en producción o fusionar el PR.

## 5. Criterios de aceptación

1. Una noticia nacional válida generada por el flujo de Extracción Ultimate aparece en `/nacional/`.
2. La página no mezcla noticias locales, regionales, provinciales o internacionales.
3. Las noticias nacionales sin tema se renderizan con etiqueta y enlace Nacional correctos.
4. Las noticias nacionales con tema conservan el acceso a su sección temática.
5. La navegación queda como Inicio, Locales, Nacional, Internacional y Buscar, en escritorio y móvil.
6. Las rutas y funciones existentes de Locales, Internacional y Buscar siguen operativas.
7. El build y las pruebas aplicables pasan, o las fallas preexistentes/nuevas quedan identificadas con evidencia.
8. Todo el trabajo queda aislado en `feat/national-hub`, sin cambios en `master`.

## 6. Riesgos y pendientes de auditoría

- Definir si todas las historias recibidas de Argentina.gob.ar se clasifican por defecto como `scope: nacional`, o si la persona editora asigna el alcance durante la revisión. El JSON actual no incluye `scope`.
- Definir si `Locales` será un enlace a un nuevo hub `/locales/` o un desplegable que agrupe regiones y municipios. No existe hoy una ruta `/locales/`.
- Resolver el tratamiento de `publishedAt` al importar: fecha original de la fuente o fecha de publicación en QSK.
- Resolver cómo se transfieren las imágenes descargadas por Extracción Ultimate al repositorio QSK.
- Inspeccionar en detalle la política de sitemap y las pruebas existentes antes de modificarla.
- Verificar si el repositorio tiene cambios recientes en `master` que requieran sincronizar la rama antes de implementar.
