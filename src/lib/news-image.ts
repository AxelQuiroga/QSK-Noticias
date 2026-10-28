import { existsSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';

const NEWS_IMAGE_PREFIX = '/images/noticias/';

/**
 * Comprueba que un origen remoto sea una URL HTTPS absoluta y no incluya
 * credenciales. No descarga la imagen ni garantiza que el proveedor la mantenga.
 */
function isHttpsImageUrl(src: string): boolean {
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && url.hostname.length > 0 && !url.username && !url.password;
  } catch {
    return false;
  }
}

/**
 * Valida el origen de una imagen de noticia.
 * Admite rutas locales seguras bajo /images/noticias/ y URLs HTTPS externas.
 * Las rutas locales no permiten traversal, barras invertidas, query strings
 * ni fragmentos; las URLs externas deben ser absolutas y no llevar credenciales.
 */
export function isValidNewsImageSrc(src: string): boolean {
  if (isHttpsImageUrl(src)) return true;

  if (!src.startsWith(NEWS_IMAGE_PREFIX) || /[\\\\%?#\\s]/.test(src)) {
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
 * Comprueba que una ruta local válida apunte a un archivo dentro de
 * public/images/noticias. Para URLs HTTPS solo valida el formato: el archivo
 * remoto no se descarga ni puede comprobarse durante el build.
 * El directorio público puede inyectarse en tests.
 */
export function newsImageFileExists(
  src: string,
  publicDirectory = resolve(process.cwd(), 'public'),
): boolean {
  if (!isValidNewsImageSrc(src)) return false;
  if (isHttpsImageUrl(src)) return true;

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
