import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isValidNewsImageSrc, newsImageFileExists } from '../src/lib/news-image';

let temporaryDirectory: string;

afterEach(() => {
  if (temporaryDirectory) rmSync(temporaryDirectory, { recursive: true, force: true });
});

function createPublicDirectory() {
  temporaryDirectory = mkdtempSync(join(tmpdir(), 'qsk-news-image-'));
  mkdirSync(join(temporaryDirectory, 'images', 'noticias'), { recursive: true });
  return temporaryDirectory;
}

describe('isValidNewsImageSrc', () => {
  it('acepta rutas locales dentro de /images/noticias/', () => {
    expect(isValidNewsImageSrc('/images/noticias/operativo.jpg')).toBe(true);
    expect(isValidNewsImageSrc('/images/noticias/2026/operativo_1.webp')).toBe(true);
  });

  it('acepta URLs HTTPS externas con parámetros de consulta', () => {
    expect(isValidNewsImageSrc('https://cdn.example.com/imagen.jpg?v=1&size=large')).toBe(true);
  });

  it.each([
    'http://example.com/operativo.jpg',
    '//example.com/operativo.jpg',
    'https://user:password@example.com/operativo.jpg',
    'https://',
    '/images/operativo.jpg',
    '/images/noticias/../privado.jpg',
    '/images/noticias/%2e%2e/privado.jpg',
    '/images/noticias/operativo.jpg?size=large',
    '/images/noticias/operativo.jpg#preview',
    '/images/noticias\\operativo.jpg',
    '/images/noticias/',
    '',
  ])('rechaza la ruta inválida %s', (src) => {
    expect(isValidNewsImageSrc(src)).toBe(false);
  });
});

describe('newsImageFileExists', () => {
  it('acepta una imagen existente dentro del directorio permitido', () => {
    const publicDirectory = createPublicDirectory();
    writeFileSync(join(publicDirectory, 'images', 'noticias', 'operativo.jpg'), 'fixture');

    expect(newsImageFileExists('/images/noticias/operativo.jpg', publicDirectory)).toBe(true);
  });

  it('acepta una URL HTTPS válida sin intentar descargarla', () => {
    const publicDirectory = createPublicDirectory();

    expect(
      newsImageFileExists('https://cdn.example.com/imagen.jpg?token=abc', publicDirectory),
    ).toBe(true);
  });

  it('rechaza rutas válidas cuyo archivo no existe', () => {
    const publicDirectory = createPublicDirectory();

    expect(newsImageFileExists('/images/noticias/no-existe.jpg', publicDirectory)).toBe(false);
  });

  it('rechaza directorios aunque existan', () => {
    const publicDirectory = createPublicDirectory();
    mkdirSync(join(publicDirectory, 'images', 'noticias', 'carpeta'));

    expect(newsImageFileExists('/images/noticias/carpeta', publicDirectory)).toBe(false);
  });
});
