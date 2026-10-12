import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://saql-noticias.pages.dev',
  output: 'static',
  integrations: [],
  vite: {
    plugins: [tailwindcss()],
  },
});
