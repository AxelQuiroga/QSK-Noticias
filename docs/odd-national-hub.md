# ODD — Hub Nacional

**Estado:** especificación acordada para implementación  
**Rama:** `feat/national-hub`  
**Base:** `master`  
**Alcance:** incorporar y servir en QSK Noticias las noticias recolectadas desde Argentina.gob.ar, y adaptar la navegación principal para exponer el hub Nacional.

## 1. Observations

1. El modelo de artículos de QSK ya contempla `scope: nacional`, pero la validación actual exige `section` para todo artículo publicado. Debe admitir artículos nacionales sin clasificación temática.
2. `scope` representa alcance geográfico; `section` y `primaryTopic` representan clasificación temática. Son dimensiones independientes.
3. No existe actualmente una consulta dedicada para obtener artículos nacionales.
4. Existe un hub independiente `/internacional/` que sirve como referencia estructural, pero Nacional no necesita clasificación por países.
5. El header se construye desde `NAV_ITEMS` en `src/data/sections.ts`. El enlace Buscar debe conservarse visible y funcional en escritorio y móvil.
6. `ArticleCard.astro` presupone que cada artículo tiene `section` y construye enlaces temáticos. Debe contemplar noticias nacionales sin sección.
7. La portada utiliza `getLatestArticles()`. Su comportamiento y protagonismo local quedan fuera del alcance de esta tarea.
8. La política del sitemap y las pruebas existentes deben revisarse al incorporar las rutas nacionales.
9. Extracción Ultimate recolecta noticias de Argentina.gob.ar, aplica sus propios procesos de validación y selección, extrae los datos disponibles y entrega novedades a QSK mediante un PR.
10. El contrato actual de borrador de Extracción Ultimate contiene `title`, `description`, `content`, `publishedAt`, `url` e `image`. Algunos campos pueden ser nulos; el cuerpo puede no estar disponible por completo.
11. Las imágenes se utilizarán desde sus URL remotas originales. QSK no debe asumir que los archivos descargados en el workspace de Extracción Ultimate existen dentro de su repositorio.
12. La incorporación es incremental: cada entrega contiene novedades, mientras QSK conserva el historial completo. Los registros ya incorporados no deben duplicarse.
13. La ubicación y el mecanismo exactos con los que Extracción Ultimate entregará los archivos en QSK se coordinan en ese repositorio. QSK debe implementar el consumo del contrato acordado, sin mantener la carpeta `borradores/` como mecanismo de publicación de Nacional.

## 2. Decisions

### D1 — Nacional es un hub geográfico independiente

`Nacional` no se agrega al catálogo de temas `TOPICS/SECTIONS`. Su identidad se expresa mediante `scope: nacional` y su ruta propia es `/nacional/`.

### D2 — Tema y alcance son dimensiones independientes

- `scope`: alcance geográfico.
- `section` / `primaryTopic`: tema editorial.
- `country`: reservado a noticias con `scope: internacional`; no se asigna `AR` a noticias nacionales.

Todas las noticias seleccionadas por Extracción Ultimate desde Argentina.gob.ar se sirven exclusivamente en el hub Nacional. No se les asigna `section` ni `primaryTopic`, ni se distribuyen entre feeds temáticos. La procedencia determina el alcance.

### D3 — Artículos nacionales sin clasificación temática

Se permite publicar artículos con `scope: nacional` sin `section` ni `primaryTopic`. Los artículos de otros alcances mantienen las reglas de clasificación temática vigentes.

### D4 — Tarjetas nacionales

- Las noticias nacionales sin sección muestran la etiqueta `Nacional` y enlazan a su detalle dentro de `/nacional/`.
- Los artículos que sí tienen `section` conservan su etiqueta y enlace temático actuales.
- No se generan enlaces vacíos ni rutas `/secciones//`.

### D5 — Navegación principal

La navegación visible se organiza como:

`Inicio | Locales | Nacional | Internacional | Buscar`

- `Inicio` apunta a `/`.
- `Locales` conserva el acceso a la cobertura local y sus destinos actuales.
- `Nacional` apunta a `/nacional/`.
- `Internacional` apunta a `/internacional/`.
- `Buscar` sigue visible y funcional en escritorio y móvil.

La organización interna de Locales debe preservar los destinos geográficos existentes. No se crea una ruta `/locales/` sin una decisión específica.

### D6 — La portada conserva su criterio actual

No se modifica `getLatestArticles()` ni el orden editorial de la portada en esta etapa. Las noticias nacionales no deben desplazar automáticamente el protagonismo local de QSK.

### D7 — Responsabilidades separadas entre los repositorios

**Extracción Ultimate** es responsable de:
- recolectar noticias de Argentina.gob.ar;
- aplicar sus procesos de validación y selección;
- determinar qué registros nuevos incorpora;
- extraer los campos y recursos disponibles;
- entregar incrementalmente las novedades a QSK mediante PR.

**QSK Noticias** es responsable de:
- recibir y consumir los registros entregados;
- conservar el historial completo;
- evitar duplicados al incorporar nuevas entregas;
- asignar el alcance nacional por la procedencia del conjunto;
- presentar el listado y los detalles de las noticias.

QSK no replica el proceso de recolección ni vuelve a implementar los criterios editoriales de selección que pertenecen a Extracción Ultimate. Mantiene únicamente las comprobaciones técnicas necesarias para consumir los datos de forma segura y renderizarlos sin errores.

La aceptación manual del PR en QSK es el paso de aprobación previo a la publicación en producción. No hay auto-merge ni publicación directa desde el extractor.

### D8 — Contenido parcial y fuente original

Una noticia seleccionada puede servirse aunque el extractor no haya podido recuperar el cuerpo completo.

- El título y la URL original son necesarios para identificar y enlazar la noticia.
- La descripción, el cuerpo, la fecha y la imagen pueden no estar disponibles.
- Si el cuerpo no está disponible o está incompleto, la página muestra los datos existentes y un enlace visible a la publicación original en Argentina.gob.ar.
- No se inventa ni se completa contenido faltante.
- Las imágenes se muestran desde sus URL remotas originales; si no hay imagen o no puede cargarse, se utiliza un fallback visual.

La selección de qué noticias incorporar sigue siendo responsabilidad de Extracción Ultimate.

### D9 — Incorporación incremental e historial completo

Cada entrega contiene novedades. QSK las incorpora al conjunto histórico sin eliminar noticias anteriores y sin duplicar registros ya recibidos. La URL original identifica la noticia para la deduplicación. No se actualizan ni reemplazan automáticamente noticias existentes como parte de una entrega repetida.

## 3. Specifications

### S1 — Modelo y validación de artículos nacionales

- Admitir artículos publicados con `scope: nacional` sin `section` ni `primaryTopic`.
- No exigir `country: AR` para noticias nacionales.
- Mantener la regla de que `scope: internacional` requiere `country`.
- Mantener la prohibición de `country` en noticias que no sean internacionales.
- Mantener las validaciones vigentes de secciones para los demás alcances.
- La capa de consumo de Nacional no debe duplicar la validación editorial ni los criterios de selección de Extracción Ultimate. Solo debe comprobar la estructura y los datos mínimos necesarios para procesar y renderizar los registros.

### S2 — Consumo e historial Nacional

Implementar una capa de datos para consumir las noticias nacionales entregadas por Extracción Ultimate.

- Integrar únicamente los registros nuevos de cada entrega.
- Conservar los registros previamente incorporados.
- Deduplicar por URL original de forma determinista.
- No reemplazar automáticamente un registro histórico cuando vuelva a recibirse la misma URL.
- Asignar `scope: nacional` por procedencia, sin asignar `section`, `primaryTopic` ni `country`.
- Mantener desacoplada la capa de datos del componente visual.
- La ubicación final de los archivos de entrada se ajustará al contrato de entrega acordado con Extracción Ultimate.

### S3 — Página `/nacional/`

Crear una página estática con:
- título y descripción editoriales propios;
- listado de noticias nacionales;
- tarjetas adecuadas al modelo de Nacional;
- estado vacío claro cuando todavía no haya noticias;
- orden descendente por fecha disponible, con desempate estable;
- canonical correcto e inclusión en sitemap según la política existente.

La presentación puede tomar como referencia el hub Internacional, sin incorporar clasificación por países.

### S4 — Detalle `/nacional/[slug]`

Crear páginas individuales para las noticias nacionales.

- Generar rutas estables y únicas a partir de los registros.
- Mostrar los campos disponibles sin inventar datos.
- Admitir cuerpo ausente o parcial.
- Incluir un enlace visible a la fuente original, especialmente cuando el cuerpo no esté disponible.
- Mostrar imágenes remotas cuando existan y ofrecer fallback cuando falten o fallen.
- Definir metadata y canonical coherentes con la URL pública de QSK.

### S5 — ArticleCard

Agregar el fallback para noticias nacionales sin sección, preservando exactamente el comportamiento de artículos que sí tienen sección. Revisar los usos existentes para evitar regresiones en portada, búsqueda, municipios, regiones y feeds.

### S6 — Header responsive

Actualizar la configuración y el componente Header para reflejar la navegación acordada en escritorio y móvil. Mantener:
- el botón Buscar;
- accesibilidad por teclado;
- atributos ARIA y comportamiento de disclosure;
- apertura y cierre del menú móvil;
- acceso a los destinos locales existentes.

### S7 — Pruebas

Agregar pruebas unitarias para:
- artículo nacional sin sección válido;
- artículos de otros alcances sujetos a las reglas temáticas vigentes;
- consulta Nacional filtrada y ordenada;
- incorporación incremental sin duplicados;
- conservación del historial previo;
- no sobrescritura de registros existentes ante entregas repetidas;
- renderizado de registros con descripción, cuerpo, fecha o imagen ausentes;
- fallback de ArticleCard sin sección;
- conservación de enlaces temáticos cuando existe sección.

Agregar pruebas E2E para:
- ruta `/nacional/`;
- listado y estado vacío;
- exclusión de noticias de otros alcances;
- detalle de noticia con contenido completo;
- detalle de noticia con contenido parcial o ausente y enlace a la fuente;
- imagen remota y fallback;
- navegación desktop y móvil;
- acceso a Buscar;
- preservación de rutas locales e Internacional.

### S8 — Verificación de calidad

Ejecutar, según disponibilidad del entorno:
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run test:e2e`

No declarar una verificación como exitosa si no fue ejecutada. Revisar el diff final y comprobar que no se modificó `master`.

## 4. Fuera de alcance

- Rehacer el diseño completo de la portada.
- Cambiar el criterio de selección de noticias destacadas o últimas noticias.
- Rediseñar el hub Internacional.
- Crear una sección temática llamada Nacional.
- Distribuir noticias de Argentina.gob.ar en feeds temáticos.
- Replicar en QSK la recolección, validación editorial o selección que realiza Extracción Ultimate.
- Descargar o copiar imágenes al repositorio QSK como parte de esta integración.
- Incorporar LLM, reescritura automática o generación de contenido faltante.
- Modificar el funcionamiento interno de Extracción Ultimate o su workflow de recolección en esta tarea.
- Publicar directamente en producción, hacer auto-merge o fusionar el PR.

## 5. Criterios de aceptación

1. Las novedades entregadas por Extracción Ultimate se incorporan al conjunto Nacional sin duplicar registros existentes.
2. El historial previamente incorporado se conserva íntegramente.
3. Las noticias nacionales aparecen exclusivamente en `/nacional/` y sus páginas individuales.
4. Las noticias nacionales no requieren `section` ni `primaryTopic`.
5. Las noticias con contenido parcial se muestran con los datos disponibles y enlace a la fuente original.
6. Las imágenes se consumen desde sus URL remotas y existe un fallback visual.
7. Las tarjetas nacionales muestran la etiqueta y los enlaces correctos; los artículos temáticos existentes mantienen su comportamiento.
8. La navegación queda como Inicio, Locales, Nacional, Internacional y Buscar, en escritorio y móvil.
9. Las rutas y funciones existentes de Locales, Internacional y Buscar siguen operativas.
10. La aceptación del PR sigue siendo manual; no se configura auto-merge ni publicación directa.
11. El build y las pruebas aplicables pasan, o las fallas quedan identificadas con evidencia.
12. Todo el trabajo queda aislado en `feat/national-hub`, sin cambios en `master`.

## 6. Pendientes de coordinación y auditoría

- Confirmar la ruta y el formato exactos con los que Extracción Ultimate entregará las novedades dentro de QSK. El cambio del destino de entrega se realiza en Extracción Ultimate.
- Verificar el campo de fecha disponible y definir el orden de presentación cuando falte la fecha.
- Revisar la política de sitemap y las pruebas existentes antes de modificarla.
- Verificar si `feat/national-hub` necesita sincronizarse con cambios recientes de `master` antes de implementar.
- Definir la organización visual de Locales sin asumir la creación de una nueva ruta.
