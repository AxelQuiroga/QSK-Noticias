import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import matter from 'gray-matter';
import { serializeFrontmatter } from './frontmatter.mjs';

const CONTENT_DIR = 'src/content/noticias';

function getMarkdownFiles(dir) {
  return readdirSync(dir)
    .filter((f) => extname(f) === '.md')
    .map((f) => join(dir, f));
}

/*function formatValue(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return '\n' + value.map((item) => {
      if (typeof item === 'object') {
        const entries = Object.entries(item).map(([k, v]) => `  ${k}: ${formatValue(v)}`).join('\n');
        return `-\n${entries}`;
      }
      return `- ${formatValue(item)}`;
    }).join('\n');
  }
  if (typeof value === 'object') {
    return '\n' + Object.entries(value).map(([k, v]) => `${k}: ${formatValue(v)}`).join('\n');
  }
  const str = String(value);
  if (str.includes('\n') || str.includes(':') || str.includes("'")) {
    return JSON.stringify(str);
  }
  return `'${str}'`;
}*/

function processFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const { data, content: body } = matter(content);

  if (data.status !== 'published') {
    return { action: 'skipped', reason: 'not published' };
  }

  if (data.publishedAt) {
    return { action: 'unchanged', reason: 'already has publishedAt' };
  }

  const now = new Date();
  data.publishedAt = now.toISOString();

  const newContent = serializeFrontmatter(data, body);
  writeFileSync(filePath, newContent);
  return { action: 'published', publishedAt: data.publishedAt };
}

const files = getMarkdownFiles(CONTENT_DIR);
const results = files.map((f) => ({ file: f, ...processFile(f) }));

const published = results.filter((r) => r.action === 'published');
const unchanged = results.filter((r) => r.action === 'unchanged');
const skipped = results.filter((r) => r.action === 'skipped');

console.log('=== QSK Noticias — Script de publicación ===');
console.log(`Publicados por primera vez: ${published.length}`);
published.forEach((r) => console.log(`  ✓ ${r.file} → ${r.publishedAt}`));
console.log(`Sin cambios (ya publicados): ${unchanged.length}`);
unchanged.forEach((r) => console.log(`  = ${r.file}`));
console.log(`Omitidos (no publicados): ${skipped.length}`);
skipped.forEach((r) => console.log(`  - ${r.file} (${r.reason})`));
