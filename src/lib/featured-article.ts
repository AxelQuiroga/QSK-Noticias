export interface FeaturedCandidate {
  data: {
    featured?: boolean;
    image?: unknown;
  };
}

/**
 * Selecciona una noticia apta para el bloque visual destacado.
 * Prioriza las marcadas como destacadas que tengan imagen; si no hay,
 * elige la primera noticia publicada con imagen antes de usar un fallback.
 */
export function selectFeaturedArticle<T extends FeaturedCandidate>(
  articles: readonly T[],
): T | null {
  return (
    articles.find((article) => article.data.featured && article.data.image) ??
    articles.find((article) => article.data.image) ??
    articles.find((article) => article.data.featured) ??
    articles[0] ??
    null
  );
}
