import { getCollection, type CollectionEntry } from 'astro:content';
import { slugify, formatDate } from './utils';

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

export async function getLatestArticles(count = 10): Promise<Article[]> {
  const articles = await getPublishedArticles();
  return articles.slice(0, count);
}

export async function getArticlesBySection(section: string): Promise<Article[]> {
  const articles = await getPublishedArticles();
  return articles.filter(
    (a) => a.data.section.toLowerCase().replace(/\s+/g, '-') === section,
  );
}

export async function getArticlesByMunicipality(municipality: string): Promise<Article[]> {
  const articles = await getPublishedArticles();
  return articles.filter(
    (a) =>
      a.data.municipality.toLowerCase().replace(/\s+/g, '-') === municipality,
  );
}

export async function getSections(): Promise<string[]> {
  const articles = await getPublishedArticles();
  const sections = new Set(articles.map((a) => a.data.section));
  return Array.from(sections).sort();
}

export async function getMunicipalities(): Promise<string[]> {
  const articles = await getPublishedArticles();
  const municipalities = new Set(articles.map((a) => a.data.municipality));
  return Array.from(municipalities).sort();
}
