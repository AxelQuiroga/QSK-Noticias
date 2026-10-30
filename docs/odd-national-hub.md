# ODD — Hub Nacional

**Estado:** especificación acordada para implementación  
**Rama:** `feat/national-hub`  
**Base:** `master`  
**Alcance:** incorporar y servir en QSK Noticias las noticias recolectadas desde Argentina.gob.ar, e integrar un carrusel Nacional en la portada y conservar la navegacion principal de master.

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
13. El dataset Nacional de QSK vive en src/data/nacional.json y contiene un array acumulado de registros con el contrato Borrador (title, description, content, publishedAt, url, image). Cada PR de Extracción Ultimate debe preservar el historial existente y anexar únicamente novedades; no debe reemplazar el dataset por el lote nuevo. El cambio del destino de entrega se realiza en Extracción Ultimate.

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

### D5 - Navegacion principal

La navegacion principal conserva la estructura existente en master. Nacional no se agrega como enlace ni como grupo del navbar.

- Portada apunta a /.
- Se conservan Actualidad, los grupos Politica y sociedad, Comunidad y Ciudad, y los accesos directos Economia, Deportes e Internacional.
- Buscar sigue visible y funcional en escritorio y movil.
- No se reagrupan secciones ni se crean rutas nuevas para modificar la navegacion.

La cobertura Nacional se descubre desde la portada mediante su carrusel y desde el enlace "Ver todas" hacia /nacional/.

### D6 - Carrusel Nacional en portada sin desplazar la cobertura local

No se modifica getLatestArticles() ni el orden o la seleccion del contenido local existente. Se agrega un bloque editorial independiente "Nacional" en la portada, despues del contenido principal y antes de los carruseles secundarios existentes.

- Consume src/data/nacional.json mediante la capa de datos Nacional.
- Muestra hasta seis noticias, ordenadas de mas recientes a mas antiguas.
- Cada tarjeta enlaza al detalle /nacional/[slug]/.
- El acceso "Ver todas" enlaza a /nacional/.
- Si no hay noticias, el bloque completo no se renderiza: no deja un titulo ni un carrusel vacio.
- El bloque es adicional; no reemplaza ni desplaza la seleccion de noticias locales de la portada.

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

Implementar una capa de datos para consumir el dataset acumulado entregado por Extracción Ultimate.

- La fuente es src/data/nacional.json: un array JSON acumulado con el contrato Borrador (title, description, content, publishedAt, url, image).
- Cada PR del extractor debe anexar únicamente las novedades al array existente y conservar todos los registros anteriores; el archivo no representa un lote temporal.
- Exigir título no vacío y URL original HTTP(S) de Argentina.gob.ar. Description, content, publishedAt e image pueden ser null.
- Cuando exista imagen, exigir una URL remota HTTP(S); no copiar ni optimizar localmente los archivos.
- Deduplicar por URL original de forma determinista y conservar la primera versión; una entrega repetida no sobrescribe un registro histórico.
- Ordenar por fecha descendente; los registros sin fecha van al final y el slug estable resuelve empates.
- Asignar scope: nacional por procedencia, sin agregar section, primaryTopic ni country.
- Mantener desacoplada la capa de datos del componente visual y no duplicar la selección editorial del extractor.


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

### S6 - Preservacion del Header responsive

No se incorpora Nacional al navbar ni se reestructura la navegacion. Se conserva la estructura existente en master, incluyendo: Portada, Actualidad, los grupos Politica y sociedad / Comunidad / Ciudad, Economia, Deportes, Internacional y Buscar.

Las pruebas deben comprobar que el menu de escritorio y el menu movil conservan sus destinos, accesibilidad por teclado, atributos ARIA y comportamiento de disclosure.

### S7 - Pruebas

Agregar pruebas unitarias para:
- articulo nacional sin seccion valido;
- articulos de otros alcances sujetos a las reglas tematicas vigentes;
- consulta Nacional filtrada y ordenada;
- incorporacion incremental sin duplicados;
- conservacion del historial previo;
- no sobrescritura de registros existentes ante entregas repetidas;
- renderizado de registros con descripcion, cuerpo, fecha o imagen ausentes;
- fallback de ArticleCard sin seccion;
- conservacion de enlaces tematicos cuando existe seccion;
- seleccion de las seis noticias nacionales mas recientes para la portada;
- listas vacias y limites invalidos para el selector del carrusel.

Agregar pruebas E2E para:
- ruta /nacional/;
- listado y estado vacio;
- exclusion de noticias de otros alcances;
- detalle de noticia con contenido completo;
- detalle de noticia con contenido parcial o ausente y enlace a la fuente;
- imagen remota y fallback;
- carrusel Nacional visible cuando hay registros y oculto cuando el dataset esta vacio;
- enlaces de tarjetas al detalle y "Ver todas" al hub;
- navbar sin enlace Nacional, preservando su estructura de master en escritorio y movil;
- preservacion de rutas locales, Internacional y Buscar.

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
8. La navegacion principal conserva la estructura de master y no agrega Nacional al navbar; Nacional se descubre desde el carrusel de portada.
9. Las rutas geograficas locales existentes, Internacional y Buscar siguen operativas.
10. La aceptación del PR sigue siendo manual; no se configura auto-merge ni publicación directa.
11. El build y las pruebas aplicables pasan, o las fallas quedan identificadas con evidencia.
12. Todo el trabajo queda aislado en `feat/national-hub`, sin cambios en `master`.

## 6. Coordinación para la primera entrega

- Coordinar el cambio de destino en Extracción Ultimate para que sus PR actualicen src/data/nacional.json de forma acumulativa, anexando novedades al historial existente.
- El builder actual de Extracción Ultimate todavía requiere párrafos extraídos para construir un borrador. QSK acepta content: null, pero entregar noticias sin cuerpo requerirá revisar ese requisito en el extractor, en un cambio separado.
- Al recibir el primer PR real, verificar el contrato contra sus registros y comprobar que el historial previo se conserva.
- Repetir las pruebas E2E con el dataset real cuando haya noticias incorporadas.
