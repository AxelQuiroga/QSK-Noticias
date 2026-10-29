import { z } from 'astro/zod';
import datosOle from '../data/ole.json';
import { canonicalizarUrlNoticia } from './deportes-feed';

const URL_NOTICIA_OLE = /^https:\/\/(?:www\.)?ole\.com\.ar(?:[/:?#]|$)/i;
const URL_IMAGEN_OLE = /^https:\/\/(?:www\.)?ole\.com\.ar(?:[/:?#]|$)/i;
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const oleNewsSchema = z.object({
  id: z.string().trim().min(1, 'id no puede estar vacío'),
  title: z.string().trim().min(1, 'title no puede estar vacío'),
  url: z
    .string()
    .url('url debe ser una URL válida')
    .refine((value) => URL_NOTICIA_OLE.test(value), 'url debe pertenecer a ole.com.ar'),
  publishedAt: z
    .string()
    .nullable()
    .refine(
      (value) => value === null || (FECHA_ISO.test(value) && !Number.isNaN(Date.parse(value))),
      'publishedAt debe ser una fecha ISO válida o null',
    ),
  imageUrl: z
    .string()
    .url('imageUrl debe ser una URL válida')
    .refine((value) => value.startsWith('https://'), 'imageUrl debe usar HTTPS')
    .refine((value) => URL_IMAGEN_OLE.test(value), 'imageUrl debe pertenecer a ole.com.ar')
    .nullable(),
  source: z.literal('Olé'),
});

export type OleNews = z.infer<typeof oleNewsSchema>;

const oleDatasetSchema = z.array(oleNewsSchema).superRefine((items, context) => {
  const ids = new Set<string>();
  const urls = new Set<string>();

  items.forEach((item, index) => {
    if (ids.has(item.id)) {
      context.addIssue({
        code: 'custom',
        path: [index, 'id'],
        message: `id duplicado: ${item.id}`,
      });
    }
    ids.add(item.id);

    const urlKey = canonicalizarUrlNoticia(item.url);
    if (urls.has(urlKey)) {
      context.addIssue({
        code: 'custom',
        path: [index, 'url'],
        message: `URL de noticia duplicada: ${urlKey}`,
      });
    }
    urls.add(urlKey);
  });
});

/**
 * Valida el contrato recibido por QSK. Los errores no se ocultan:
 * un dataset incompatible debe hacer fallar los tests/build y corregirse
 * en el productor, en lugar de publicar datos dudosos silenciosamente.
 */
export function validarNoticiasOle(data: unknown): OleNews[] {
  return oleDatasetSchema.parse(data);
}

/** Devuelve el dataset validado, ordenado de más reciente a más antiguo. */
export function getTodasNoticiasOle(): OleNews[] {
  return validarNoticiasOle(datosOle).sort((a, b) => {
    if (a.publishedAt === null && b.publishedAt !== null) return 1;
    if (a.publishedAt !== null && b.publishedAt === null) return -1;
    if (a.publishedAt && b.publishedAt && a.publishedAt !== b.publishedAt) {
      return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
    }
    return a.id.localeCompare(b.id);
  });
}

/** Devuelve las noticias validadas más recientes, limitadas para la UI. */
export function getNoticiasOle(limit = 10): OleNews[] {
  return getTodasNoticiasOle().slice(0, Math.max(0, Math.floor(limit)));
}
