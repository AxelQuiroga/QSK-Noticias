# Importación remota de imágenes para QSK

El workflow **Importar imagen remota para QSK** descarga una imagen directamente en GitHub Actions, la valida y abre un Pull Request. No necesita que la computadora local esté encendida.

## Cómo ejecutarlo

1. Abrir **Actions → Importar imagen remota para QSK → Run workflow**.
2. Pegar una URL HTTPS directa al archivo de imagen.
3. Elegir un nombre único en minúsculas y separado por guiones, sin extensión.
4. Completar el texto alternativo y la atribución.
5. Informar la URL HTTPS de la licencia o autorización de reutilización.
6. Confirmar explícitamente que QSK tiene derecho a reutilizarla.
7. Ejecutar el workflow y revisar el PR generado.

## Validaciones

- Solo HTTPS y destinos DNS/IP públicos; se vuelven a validar las redirecciones.
- Límite de 8 MiB, timeout de 20 segundos y hasta tres redirecciones.
- Se admiten JPEG, PNG, WebP y AVIF, comprobando la firma binaria real.
- Se rechazan HTML, SVG, formatos desconocidos, MIME contradictorios y nombres inseguros.
- No se sobrescriben archivos existentes.
- Se genera un archivo `.meta.json` junto a la imagen con URL de origen (sin query strings), fecha, formato, tamaño, texto alternativo, atribución y licencia.

## Uso en una noticia

El workflow solo incorpora la imagen y su procedencia al PR. No publica la noticia ni modifica frontmatter automáticamente. Después de revisar el PR, el editor debe integrar la imagen en el artículo usando:

- `src`: ruta local bajo `/images/noticias/`.
- `alt`: el texto alternativo revisado.
- `attribution`: la atribución que corresponda.

**Importante:** confirmar el campo del formulario no sustituye la revisión de la licencia. Una imagen visible en internet no es automáticamente reutilizable. No usar enlaces de Google Images ni páginas de resultados; se necesita la URL directa del archivo y una licencia o autorización compatible.
