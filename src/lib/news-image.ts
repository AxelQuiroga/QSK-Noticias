import { existsSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';

const NEWS_IMAGE_PREFIX = '/images/noticias/';

/**
 * Valida el formato de una ruta pública de imagen de noticias.
 * Sólo admite rutas locales bajo /images/noticias/ y segmentos simples,
 * sin traversal, barras invertidas, query strings ni fragmentos.
 */
export function isValidNewsImageSrc(src: string): boolean {
  if (!src.startsWith(NEWS_IMAGE_PREFIX) || /[\\\\%?#\s]/.test(src)) {
    return false;
  }

  const segments = src.slice(NEWS_IMAGE_PREFIX.length).split('/');
  if (segments.length === 0) return false;

  return segments.every(
    (segment) =>
      segment !== '' &&
      segment !== '.' &&
      segment !== '..' &&
      /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(segment),
  );
}

/**
 * Comprueba que la ruta válida apunte a un archivo dentro de
 * public/images/noticias. El directorio público puede inyectarse en tests.
 */
export function newsImageFileExists(
  src: string,
  publicDirectory = resolve(process.cwd(), 'public'),
): boolean {
  if (!isValidNewsImageSrc(src)) return false;

  const imageDirectory = resolve(publicDirectory, 'images', 'noticias');
  const filePath = resolve(publicDirectory, src.slice(1));
  const relativePath = relative(imageDirectory, filePath);

  if (
    relativePath === '' ||
    relativePath === '..' ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    return false;
  }

  try {
    return existsSync(filePath) && statSync(filePath).isFile();
  } catch {
    return false;
  }
}
