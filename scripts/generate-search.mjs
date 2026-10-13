import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import matter from 'gray-matter';

const CONTENT_DIR = 'src/content/noticias';
const OUTPUT_FILE = 'public/search-index.json';

function getMarkdownFiles(dir) {
  return readdirSync(dir)
    .filter((f) => extname(f) === '.md')
    .map((f) => join(dir, f));
}

function extractFrontmatter(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const { data } = matter(content);
  return data;
}

const files = getMarkdownFiles(CONTENT_DIR);
const entries = files
  .map((f) => {
    const data = extractFrontmatter(f);
    if (data.status !== 'published') return null;
    return {
      slug: data.slug || f.replace(/\.md$/, '').split('/').pop(),
      title: data.title || '',
      description: data.description || '',
      section: data.section || '',
      municipality: data.municipality || '',
      region: data.region || '',
      scope: data.scope || '',
      publishedAt: data.publishedAt ? new Date(data.publishedAt).toISOString() : '',
    };
  })
  .filter(Boolean);

writeFileSync(OUTPUT_FILE, JSON.stringify(entries, null, 2));
console.log(`Search index generated: ${entries.length} entries -> ${OUTPUT_FILE}`);
