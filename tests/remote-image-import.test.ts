import { describe, expect, it } from 'vitest';
import { detectImageType, validateFilename } from '../.github/scripts/download-news-image.mjs';

describe('remote news image importer', () => {
  it('accepts safe lowercase slugs', () => {
    expect(validateFilename('riachuelo-limpieza-2026')).toBe('riachuelo-limpieza-2026');
  });

  it.each(['../secret', 'Mi Imagen', '-inicio', 'final-', 'a_b', 'imagen.jpg', ''])(
    'rejects unsafe filename: %s',
    (filename) => {
      expect(() => validateFilename(filename)).toThrow();
    },
  );

  it('detects JPEG from its binary signature', () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toEqual({
      mime: 'image/jpeg',
      extension: 'jpg',
    });
  });

  it('detects PNG from its binary signature', () => {
    expect(detectImageType(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toEqual({
      mime: 'image/png',
      extension: 'png',
    });
  });

  it('detects WebP from its RIFF signature', () => {
    expect(detectImageType(Buffer.from('RIFF0000WEBP'))).toEqual({
      mime: 'image/webp',
      extension: 'webp',
    });
  });

  it('rejects HTML, SVG and unknown content', () => {
    expect(() => detectImageType(Buffer.from('<svg></svg>'))).toThrow();
    expect(() => detectImageType(Buffer.from('<!doctype html>'))).toThrow();
  });
});
