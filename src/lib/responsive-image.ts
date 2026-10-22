import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Directorio público del sitio (activos estáticos servidos por Cloudflare Pages).
 */
const PUBLIC_DIR = join(process.cwd(), 'public');

/**
 * Anchos de variantes WebP generadas por `scripts/convert-images.cjs`.
 *
 * Se eligen a partir de las medidas reales de renderizado en la portada:
 * - Móvil: tarjetas ~341 px de ancho (1x) / ~682 px a 2x -> cubren 400 y 800.
 * - Escritorio: tarjeta por defecto ~424 px, destacada ~468 px (1x) / ~850-940 px a 2x
 *   -> cubren 600 y 1200.
 *
 * No se generan variantes que escalen hacia arriba la imagen origen.
 */
export const IMAGE_WIDTHS = [400, 600, 800, 1200] as const;

export type ImageWidth = (typeof IMAGE_WIDTHS)[number];

/**
 * Genera los atributos de imagen responsiva (`srcset`, `sizes` y `src` de
 * respaldo) para una imagen de noticia bajo `/images/noticias/`.
 *
 * Solo se incluyen en el `srcset` las variantes que realmente existen en
 * disco (es decir, variantes sin escalar hacia arriba). El atributo `src`
 * apunta a la imagen original para preservar la calidad en navegadores que
 * no soportan `srcset` (minoría residual); los navegadores modernos usan el
 * `srcset` y no descargan el `src`.
 */
export function responsiveImage(src: string, sizes: string) {
  const name = src.split('/').pop()!.replace(/\.[^/.]+$/, '');
  const optimizedDir = join(PUBLIC_DIR, 'images', 'noticias', 'optimized');

  const available = IMAGE_WIDTHS.filter((w) =>
    existsSync(join(optimizedDir, `${name}-w${w}.webp`)),
  );

  const srcset = available
    .map((w) => `/images/noticias/optimized/${name}-w${w}.webp ${w}w`)
    .join(', ');

  // Fallback: la imagen original (calidad completa, sin procesar).
  const fallbackSrc = available.length ? `/images/noticias/optimized/${name}-w${available[0]}.webp` : src;

  return { srcset, sizes, src: fallbackSrc, available };
}
