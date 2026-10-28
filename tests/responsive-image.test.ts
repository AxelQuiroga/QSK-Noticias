import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { responsiveImage } from '../src/lib/responsive-image';

describe('responsiveImage', () => {
  it('genera srcset con variantes WebP existentes y descriptors de ancho', () => {
    const result = responsiveImage('/images/noticias/fumigacion-esteban-echeverria-octubre.jpg', '100vw');

    expect(result.srcset).toContain('fumigacion-esteban-echeverria-octubre-w400.webp 400w');
    expect(result.srcset).toContain('fumigacion-esteban-echeverria-octubre-w800.webp 800w');
    result.srcset.split(',').forEach((candidate) => {
      expect(candidate.trim()).toMatch(/\.webp\s+\d+w$/);
    });
    expect(result.sizes).toBe('100vw');
  });

  it('solo incluye variantes que existen en disco (sin escalar hacia arriba)', () => {
    const result = responsiveImage('/images/noticias/hospital-el-cruce-auditoria-interna-sigen-2026.jpg', '100vw');
    expect(result.srcset).toContain('hospital-el-cruce-auditoria-interna-sigen-2026-w400.webp 400w');
    expect(result.srcset).not.toContain('600w');
    expect(result.srcset).not.toContain('800w');
    expect(result.srcset).not.toContain('1200w');
  });

  it('resuelve src de respaldo a la primera variante disponible', () => {
    const result = responsiveImage('/images/noticias/bacheo-monte-grande-cabo-corrientes.jpg', '100vw');
    expect(result.src).toBe(
      '/images/noticias/optimized/bacheo-monte-grande-cabo-corrientes-w400.webp',
    );
  });

  it('resuelve src de respaldo a la imagen original cuando no hay variantes', () => {
    const result = responsiveImage('/images/noticias/municipio-lanus.png', '100vw');
    expect(result.srcset).toBe('');
    expect(result.src).toBe('/images/noticias/municipio-lanus.png');
  });

  it('devuelve las URLs HTTPS externas sin intentar generar variantes locales', () => {
    const src = 'https://cdn.example.com/imagen.jpg?size=large&v=2';
    const result = responsiveImage(src, '100vw');

    expect(result.src).toBe(src);
    expect(result.srcset).toBe('');
    expect(result.sizes).toBe('100vw');
    expect(result.available).toEqual([]);
  });

  it('todas las variantes referenciadas en el srcset existen en el disco público', () => {
    const noticiasDir = join(process.cwd(), 'public', 'images', 'noticias');
    const fuentes = readdirSync(noticiasDir).filter((f) =>
      /\.(jpe?g|png|webp|heif|heic|jfif|avif)$/i.test(f),
    );

    for (const fuente of fuentes) {
      const src = \`/images/noticias/\${fuente}\`;
      const { srcset } = responsiveImage(src, '100vw');
      if (!srcset) continue;
      const candidatos = srcset.split(',').map((c) => c.trim().split(' ')[0]);
      for (const candidato of candidatos) {
        if (candidato === undefined) continue;
        const existe = existsSync(join(process.cwd(), 'public', candidato.slice(1)));
        expect(existe, \`la variante referenciada no existe: \${candidato}\`).toBe(true);
      }
    }
  });
});
