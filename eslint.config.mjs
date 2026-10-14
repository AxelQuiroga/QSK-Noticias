import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.astro/**',
      'test-results/**',
      'playwright-report/**',
      'coverage/**',
    ],
  },

  // JS/TS: presets recomendados (no type-aware, para mantener el lint rápido)
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Archivos .astro: parser + procesador + reglas específicas de Astro
  ...astro.configs['flat/recommended'],

  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
);
