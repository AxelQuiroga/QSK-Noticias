import { z } from 'astro/zod';
import datosOle from '../data/ole.json';

const URL_NOTICIA_OLE = /^https:\/\/(?:www\.)?ole\.com\.ar(?:[/:?#]|$)/i;
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

    const canonicalUrl = new URL(item.url);
    canonicalUrl.hash = '';
    for (const key of [...canonicalUrl.searchParams.keys()]) {
      if (/^(utm_.+|fbclid|gclid|mc_cid|mc_eid)$/i.test(key)) {
        canonicalUrl.searchParams.delete(key);
      }
    }
    const urlKey = canonicalUrl.toString();
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

/** Devuelve las noticias validadas del dataset local, limitadas para la UI. */
export function getNoticiasOle(limit = 10): OleNews[] {
  const noticias = validarNoticiasOle(datosOle);
  return noticias.slice(0, Math.max(0, Math.floor(limit)));
}
