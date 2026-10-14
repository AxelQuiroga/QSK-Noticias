import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { collectReferencedLocalidadSlugs, isIndexablePath } from './src/lib/sitemap-policy.mjs';

// Se recalcula en cada build: las localidades con contenido etiquetado en el
// frontmatter entran solas al sitemap (ver src/lib/sitemap-policy.mjs).
const referencedLocalidades = collectReferencedLocalidadSlugs('src/content/noticias');

export default defineConfig({
  site: 'https://qsk-noticias.pages.dev',
  output: 'static',
  integrations: [
    sitemap({
      filter: (page) => isIndexablePath(new URL(page).pathname, { referencedLocalidades }),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
