import type { OleNews } from './ole';

export interface ArticuloDeportes {
  data: {
    slug: string;
    publishedAt: Date;
    sources?: ReadonlyArray<{ url: string }>;
  };
}

export type ElementoFeedDeportes<T extends ArticuloDeportes = ArticuloDeportes> =
  | {
      tipo: 'qsk';
      article: T;
      fecha: Date;
      clave: string;
    }
  | {
      tipo: 'ole';
      noticia: OleNews;
      fecha: Date | null;
      clave: string;
    };

/**
 * Normaliza URLs para comparar procedencia, no para cambiar los enlaces que
 * se muestran. Quita fragmentos y parámetros de tracking y unifica www.
 */
export function canonicalizarUrlNoticia(value: string): string {
  try {
    const url = new URL(value);
    url.hash = '';
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');

    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_.+|fbclid|gclid|mc_cid|mc_eid)$/i.test(key)) {
        url.searchParams.delete(key);
      }
    }

    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, '');
    }

    return url.toString();
  } catch {
    return value.trim();
  }
}

/**
 * Une noticias editoriales de Deportes con el feed externo.
 * Si una publicación propia ya cita una URL de Olé, prevalece la publicación
 * propia. No se deduplica por título: QSK puede cubrir el mismo acontecimiento.
 */
export function combinarNoticiasDeportes<T extends ArticuloDeportes>(
  articulos: readonly T[],
  noticiasOle: readonly OleNews[],
): ElementoFeedDeportes<T>[] {
  const urlsCubiertasPorQsk = new Set(
    articulos.flatMap((article) =>
      (article.data.sources ?? []).map((source) => canonicalizarUrlNoticia(source.url)),
    ),
  );

  const propias: ElementoFeedDeportes<T>[] = articulos.map((article) => ({
    tipo: 'qsk',
    article,
    fecha: article.data.publishedAt,
    clave: article.data.slug,
  }));

  const externas: ElementoFeedDeportes<T>[] = noticiasOle
    .filter((noticia) => !urlsCubiertasPorQsk.has(canonicalizarUrlNoticia(noticia.url)))
    .map((noticia) => ({
      tipo: 'ole',
      noticia,
      fecha: noticia.publishedAt ? new Date(noticia.publishedAt) : null,
      clave: noticia.id,
    }));

  return [...propias, ...externas].sort((a, b) => {
    if (a.fecha === null && b.fecha !== null) return 1;
    if (a.fecha !== null && b.fecha === null) return -1;

    const fechaA = a.fecha?.getTime();
    const fechaB = b.fecha?.getTime();
    if (fechaA !== undefined && fechaB !== undefined && fechaA !== fechaB) {
      return fechaB - fechaA;
    }

    return a.clave.localeCompare(b.clave) || a.tipo.localeCompare(b.tipo);
  });
}
