# Política Editorial de Imágenes — QSK Noticias

## Principios fundamentales

1. **Fuentes preferidas**: Imágenes propias, autorizadas o licenciadas correctamente.
2. **Verificación obligatoria**: La disponibilidad en Google, redes sociales u otros medios NO implica permiso de reutilización.
3. **Atribución ≠ Licencia**: Atribuir al autor no reemplaza la licencia o autorización necesaria.
4. **Fuentes oficiales**: Las condiciones de reutilización de fuentes oficiales también deben verificarse.
5. **Registro obligatorio**: Procedencia, licencia/autorización y estado de verificación editorial.
6. **Sin derechos verificados = no publicar**: Si no se pueden verificar los derechos, la imagen no se publica hasta resolver la situación.
7. **Transparencia**: Las imágenes ilustrativas, de archivo o generadas con IA no deben presentarse como fotografías documentales.
8. **Revisión humana obligatoria**: Los procesos automatizados pueden proponer imágenes, pero nunca determinar que están autorizadas sin evidencia suficiente.

## Campos del esquema de contenido

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `src` | string | Sí (si hay imagen) | Ruta de la imagen |
| `alt` | string | Sí (si hay imagen) | Texto alternativo descriptivo |
| `attribution` | string | No | Crédito del autor/fuente |
| `license` | string | No | Tipo de licencia o autorización |
| `verificationStatus` | enum | No | `pending`, `verified` o `rejected` |

## Almacenamiento

- Las imágenes se guardan en `public/images/noticias/`
- Se referencian con rutas absolutas del sitio: `/images/noticias/ejemplo.webp`
- Formatos recomendados: WebP, JPEG, PNG
- Optimización: comprimir sin pérdida significativa de calidad

## Nota legal

Este documento no constituye asesoramiento jurídico definitivo. En caso de duda, consultar con el asesor legal de la organización.
