export interface SearchIndexEntry {
  slug: string;
  title: string;
  description: string;
  section: string;
  municipality: string;
  publishedAt: string;
}

interface SearchableArticle {
  id: string;
  data: {
    slug: string;
    title: string;
    description: string;
    section: string;
    municipality: string;
    publishedAt: Date;
  };
  body: string;
}

export function buildSearchIndex(articles: SearchableArticle[]): SearchIndexEntry[] {
  return articles.map((a) => ({
    slug: a.data.slug,
    title: a.data.title,
    description: a.data.description,
    section: a.data.section,
    municipality: a.data.municipality,
    publishedAt: a.data.publishedAt.toISOString(),
  }));
}

export function searchArticles(
  articles: SearchableArticle[],
  query: string,
): SearchableArticle[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return articles.filter((a) => {
    const searchable = `${a.data.title} ${a.data.description} ${a.data.section} ${a.data.municipality} ${a.body}`.toLowerCase();
    return q.split(/\s+/).every((term) => searchable.includes(term));
  });
}
