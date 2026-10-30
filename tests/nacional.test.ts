import { describe, expect, it } from 'vitest';
import {
  createNationalSlug,
  mergeNationalArticles,
  sortNationalArticles,
  toNationalArticle,
  type NationalRecord,
} from '../src/lib/nacional';

const record = (overrides: Partial<NationalRecord> = {}): NationalRecord => ({
  title: 'Noticia nacional',
  description: 'Descripción original',
  content: 'Cuerpo original',
  publishedAt: '2026-10-28T12:00:00.000Z',
  url: 'https://www.argentina.gob.ar/noticias/noticia-nacional',
  image: { src: 'https://www.argentina.gob.ar/sites/default/files/noticia.jpg', alt: 'Imagen' },
  ...overrides,
});

describe('mergeNationalArticles', () => {
  it('conserva el historial y agrega solamente URLs nuevas', () => {
    const previous = [record()];
    const incoming = [
      record({ url: 'https://www.argentina.gob.ar/noticias/nueva-noticia', title: 'Nueva noticia' }),
    ];

    expect(mergeNationalArticles(previous, incoming)).toEqual([...previous, ...incoming]);
  });

  it('no duplica una URL ya incorporada ni sobrescribe el registro histórico', () => {
    const previous = [record({ title: 'Titular histórico', description: 'Versión histórica' })];
    const repeated = record({ title: 'Titular modificado', description: 'Versión nueva' });

    expect(mergeNationalArticles(previous, [repeated])).toEqual(previous);
  });

  it('deduplica URLs repetidas dentro de una misma entrega conservando la primera', () => {
    const first = record({ title: 'Primera versión' });
    const second = record({ title: 'Segunda versión' });

    expect(mergeNationalArticles([], [first, second])).toEqual([first]);
  });

  it('rechaza registros sin título o URL original válida', () => {
    expect(() => mergeNationalArticles([], [record({ title: null })])).toThrow();
    expect(() => mergeNationalArticles([], [record({ url: 'not-a-url' })])).toThrow();
    expect(() => mergeNationalArticles([], [record({ url: 'https://example.com/noticia' })])).toThrow();
  });

  it('asigna scope nacional sin incorporar clasificación temática ni país', () => {
    const article = toNationalArticle(record());

    expect(article.scope).toBe('nacional');
    expect(article).not.toHaveProperty('section');
    expect(article).not.toHaveProperty('primaryTopic');
    expect(article).not.toHaveProperty('country');
    expect(article.slug).toBe(createNationalSlug(article));
  });

  it('rechaza imágenes locales porque el contrato exige URL remota', () => {
    expect(() => mergeNationalArticles([], [record({ image: { src: '/images/local.jpg', alt: null } })]))
      .toThrow();
  });

  it('rechaza fechas inválidas sin rechazar la ausencia de fecha', () => {
    expect(() => mergeNationalArticles([], [record({ publishedAt: 'fecha-inválida' })])).toThrow();
    expect(mergeNationalArticles([], [record({ publishedAt: null })])).toHaveLength(1);
  });
  it('permite registros parciales con título y URL, sin descripción, cuerpo, fecha o imagen', () => {
    const partial = record({
      description: null,
      content: null,
      publishedAt: null,
      image: null,
    });

    expect(mergeNationalArticles([], [partial])).toEqual([partial]);
  });
});

describe('createNationalSlug', () => {
  it('genera un slug estable para la misma noticia', () => {
    const article = record();
    expect(createNationalSlug(article)).toBe(createNationalSlug(article));
  });

  it('genera slugs únicos para titulares iguales con URLs diferentes', () => {
    const first = record({ url: 'https://www.argentina.gob.ar/noticias/a' });
    const second = record({ url: 'https://www.argentina.gob.ar/noticias/b' });

    expect(createNationalSlug(first)).not.toBe(createNationalSlug(second));
  });

  it('produce un slug URL-friendly', () => {
    expect(createNationalSlug(record({ title: 'Educación pública: nuevas medidas' })))
      .toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });
});

describe('sortNationalArticles', () => {
  it('ordena por fecha descendente y deja las fechas ausentes al final', () => {
    const older = record({ title: 'Anterior', url: 'https://argentina.gob.ar/a', publishedAt: '2026-10-20T00:00:00.000Z' });
    const newer = record({ title: 'Nueva', url: 'https://argentina.gob.ar/b', publishedAt: '2026-10-29T00:00:00.000Z' });
    const undated = record({ title: 'Sin fecha', url: 'https://argentina.gob.ar/c', publishedAt: null });

    expect(sortNationalArticles([older, undated, newer])).toEqual([newer, older, undated]);
  });

  it('mantiene un desempate determinista para fechas iguales', () => {
    const first = record({ title: 'Primera', url: 'https://argentina.gob.ar/a' });
    const second = record({ title: 'Segunda', url: 'https://argentina.gob.ar/b' });

    expect(sortNationalArticles([second, first])).toEqual([first, second]);
  });
});
