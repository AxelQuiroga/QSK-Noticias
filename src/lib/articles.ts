import { getCollection, type CollectionEntry } from 'astro:content';
import { slugify, formatDate } from './utils';
import { isActualidadEligible } from './actualidad';

export type Article = CollectionEntry<'news'>;

export { slugify, formatDate };

const SECONDARY_SORT = (a: Article, b: Article): number => {
  const dateDiff = b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf();
  if (dateDiff !== 0) return dateDiff;
  return a.data.slug.localeCompare(b.data.slug);
};

export async function getPublishedArticles(): Promise<Article[]> {
  const articles = await getCollection('news', ({ data }) => {
    return import.meta.env.PROD ? data.status === 'published' : true;
  });
  return articles.sort(SECONDARY_SORT);
}

export async function getFeaturedArticle(): Promise<Article | null> {
  const articles = await getPublishedArticles();
  return articles.find((a) => a.data.featured) ?? articles[0] ?? null;
}

export async function getLatestArticles(count = 10, excludeSlug?: string): Promise<Article[]> {
  const articles = await getPublishedArticles();
  return articles
  .filter((article) => article.data.slug !== excludeSlug)
  .slice(0, count);
}

export async function getArticlesBySection(section: string): Promise<Article[]> {
  const articles = await getPublishedArticles();
  return articles.filter((a) => a.data.section === section);
}

/**
 * Artículos de la página Actualidad: publicados y con `publishedAt` dentro de
 * la ventana temporal (`src/lib/actualidad.ts`, fecha calendario argentina).
 *
 * No es una categoría editorial: un artículo sale de Actualidad cuando su
 * fecha queda fuera de la ventana, sin perder su URL, su topic ni sus
 * metadatos. Hereda el orden de `getPublishedArticles()` (fecha descendente y
 * luego slug), así que el más nuevo queda primero.
 *
 * `referenceDate` existe para poder verificar la ventana con un reloj fijo:
 * la página usa el valor por defecto (ahora).
 */
export async function getActualidadArticles(referenceDate: Date = new Date()): Promise<Article[]> {
  const articles = await getPublishedArticles();
  return articles.filter((article) => isActualidadEligible(article, referenceDate));
}

export async function getArticlesByMunicipality(municipality: string): Promise<Article[]> {
  const articles = await getPublishedArticles();
  return articles.filter(
    (a) => a.data.municipality === municipality,
  );
}

export async function getArticlesByRegion(region: string): Promise<Article[]> {
  const articles = await getPublishedArticles();
  return articles.filter(
    (a) => a.data.region === region,
  );
}

/**
 * Artículos etiquetados con una localidad concreta del catálogo (campo
 * opcional `localidad` del frontmatter). Bajo el modelo vigente
 * `municipality` guarda el partido, así que una localidad sólo tiene
 * artículos propios si la redacción la etiquetó explícitamente.
 */
export async function getArticlesByLocalidad(localidad: string): Promise<Article[]> {
  const articles = await getPublishedArticles();
  return articles.filter((a) => a.data.localidad === localidad);
}

/**
 * Obtiene artículos que coinciden con un topic (primary o secondary).
 * Devuelve cada artículo una sola vez, ordenado por fecha descendente.
 * Los topics son independientes de la clasificación geográfica.
 */
export async function getArticlesByTopic(topic: string): Promise<Article[]> {
  const articles = await getPublishedArticles();
  return articles
    .filter(
      (a) =>
        a.data.primaryTopic === topic ||
        (a.data.secondaryTopics && a.data.secondaryTopics.includes(topic))
    )
    .sort(SECONDARY_SORT);
}
