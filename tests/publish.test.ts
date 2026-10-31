import { describe, it, expect } from 'vitest';
import matter from 'gray-matter';
import { serializeFrontmatter } from '../scripts/frontmatter.mjs';

describe('serializeFrontmatter', () => {
  it('preserva los metadatos al serializar y volver a leer el frontmatter', () => {
    const metadata = {
      title: 'Prueba de serialización',
      slug: 'prueba-serializacion',
      status: 'published',
      publishedAt: '2026-10-31T12:00:00.000Z',
      image: {
        src: '/images/noticias/principal.webp',
        alt: 'Imagen principal de la noticia',
        attribution: 'QSK Noticias',
      },
      gallery: [
        {
          src: '/images/noticias/galeria-1.webp',
          alt: 'Primera imagen de la galería',
          attribution: 'Fuente propia',
        },
        {
          src: '/images/noticias/galeria-2.webp',
          alt: 'Segunda imagen de la galería',
        },
      ],
      sources: [
        {
          name: 'Fuente de prueba',
          url: 'https://example.com/noticia',
          description: 'Descripción de la fuente',
        },
      ],
    };

    const body = [
      '# Título de la noticia',
      '',
      'Primer párrafo con **formato Markdown**.',
      '',
      '- Primer elemento',
      '- Segundo elemento',
      '',
      '[Enlace de referencia](https://example.com)',
    ].join('\n');

    const serialized = serializeFrontmatter(metadata, body);
    const parsed = matter(serialized);

    expect(parsed.data).toEqual(metadata);
    expect(parsed.content).toBe(body);
  });
});