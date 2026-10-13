import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://qsk-noticias.pages.dev',
  output: 'static',
  integrations: [],
  vite: {
    plugins: [tailwindcss()],
  },
});
