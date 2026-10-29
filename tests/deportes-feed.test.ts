import { describe, expect, it } from 'vitest';
import { combinarNoticiasDeportes, type ArticuloDeportes } from '../src/lib/deportes-feed';
import type { OleNews } from '../src/lib/ole';

const qsk = (
  slug: string,
  publishedAt: string,
  sources: Array<{ url: string }> = [],
): ArticuloDeportes => ({
  data: {
    slug,
    publishedAt: new Date(publishedAt),
    sources,
  },
});

const ole = (
  id: string,
  url: string,
  publishedAt: string | null,
  title = `Titular ${id}`,
): OleNews => ({
  id,
  title,
  url,
  publishedAt,
  imageUrl: null,
  source: 'Olé',
});

describe('combinarNoticiasDeportes', () => {
  it('integra las noticias propias y las de Olé en orden cronológico descendente', () => {
    const feed = combinarNoticiasDeportes(
      [
        qsk('qsk-primera', '2026-10-28T10:00:00.000Z'),
        qsk('qsk-segunda', '2026-10-28T08:00:00.000Z'),
      ],
      [
        ole('ole-1', 'https://www.ole.com.ar/futbol/a.html', '2026-10-28T11:00:00.000Z'),
        ole('ole-2', 'https://www.ole.com.ar/futbol/b.html', '2026-10-28T09:00:00.000Z'),
      ],
    );

    expect(feed.map((item) => item.tipo === 'qsk' ? item.article.data.slug : item.noticia.id))
      .toEqual(['ole-1', 'qsk-primera', 'ole-2', 'qsk-segunda']);
  });

  it('ubica las noticias sin fecha al final', () => {
    const feed = combinarNoticiasDeportes(
      [qsk('qsk-fechada', '2026-10-28T08:00:00.000Z')],
      [
        ole('ole-sin-fecha', 'https://www.ole.com.ar/futbol/sin-fecha.html', null),
        ole('ole-fechada', 'https://www.ole.com.ar/futbol/fechada.html', '2026-10-28T09:00:00.000Z'),
      ],
    );

    expect(feed.map((item) => item.tipo === 'qsk' ? item.article.data.slug : item.noticia.id))
      .toEqual(['ole-fechada', 'qsk-fechada', 'ole-sin-fecha']);
  });

  it('no duplica una noticia de Olé cuando una nota QSK ya cita su URL original', () => {
    const feed = combinarNoticiasDeportes(
      [qsk('nota-propia', '2026-10-28T10:00:00.000Z', [
        { url: 'https://ole.com.ar/futbol/nota.html?utm_source=boletin#nota' },
      ])],
      [ole('ole-repetida', 'https://www.ole.com.ar/futbol/nota.html', '2026-10-28T09:00:00.000Z')],
    );

    expect(feed).toHaveLength(1);
    expect(feed[0]?.tipo).toBe('qsk');
  });

  it('no deduplica solo porque dos titulares se parezcan o coincidan', () => {
    const feed = combinarNoticiasDeportes(
      [qsk('nota-qsk', '2026-10-28T10:00:00.000Z')],
      [ole('ole-mismo-titular', 'https://www.ole.com.ar/futbol/otra-nota.html', '2026-10-28T09:00:00.000Z', 'Titular compartido')],
    );

    expect(feed).toHaveLength(2);
  });

  it('resuelve empates de fecha de forma determinista', () => {
    const feed = combinarNoticiasDeportes(
      [qsk('zeta', '2026-10-28T10:00:00.000Z'), qsk('alfa', '2026-10-28T10:00:00.000Z')],
      [ole('ole-b', 'https://www.ole.com.ar/futbol/b.html', '2026-10-28T10:00:00.000Z'),
        ole('ole-a', 'https://www.ole.com.ar/futbol/a.html', '2026-10-28T10:00:00.000Z')],
    );

    expect(feed.map((item) => item.tipo === 'qsk' ? item.article.data.slug : item.noticia.id))
      .toEqual(['alfa', 'ole-a', 'ole-b', 'zeta']);
  });
});
