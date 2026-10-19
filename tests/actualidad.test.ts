import { describe, it, expect } from 'vitest';
import {
  ACTUALIDAD_TIME_ZONE,
  ACTUALIDAD_WINDOW_DAYS,
  addCalendarDays,
  actualidadWindow,
  calendarDateIn,
  isActualidadEligible,
  isInActualidadWindow,
  type ActualidadCandidate,
} from '../src/lib/actualidad';

/**
 * Reloj fijo: 19/10/2026 a las 12:00 en Buenos Aires (UTC-3). Ningún test usa
 * la fecha real del sistema: la ventana tiene que verificarse igual en
 * cualquier momento del año.
 */
const REFERENCIA = new Date('2026-10-19T15:00:00.000Z');

/** Instante que cae a las 12:00 (hora argentina) de una fecha calendario. */
function aLasDoceEnArgentina(isoDate: string): Date {
  return new Date(`${isoDate}T15:00:00.000Z`);
}

/** Artículo con la forma que consume la página (datos ya validados por Zod). */
interface ArticuloDePrueba extends ActualidadCandidate {
  data: {
    slug: string;
    status: string;
    publishedAt: Date;
    updatedAt?: Date;
  };
}

function candidato(
  slug: string,
  fecha: string,
  status = 'published',
  updatedAt?: Date,
): ArticuloDePrueba {
  return { data: { slug, status, publishedAt: aLasDoceEnArgentina(fecha), updatedAt } };
}

describe('calendarDateIn', () => {
  it('devuelve la fecha calendario argentina, no la de UTC', () => {
    // 02:30 UTC del 19/10 es 23:30 del 18/10 en Argentina.
    expect(calendarDateIn(new Date('2026-10-19T02:30:00.000Z'))).toBe('2026-10-18');
    expect(calendarDateIn(new Date('2026-10-19T15:00:00.000Z'))).toBe('2026-10-19');
    expect(calendarDateIn(new Date('2026-10-19T23:59:00.000Z'))).toBe('2026-10-19');
    expect(calendarDateIn(new Date('2026-10-20T01:00:00.000Z'))).toBe('2026-10-19');
  });

  it('completa mes y día con dos dígitos para poder comparar como texto', () => {
    expect(calendarDateIn(aLasDoceEnArgentina('2026-01-05'))).toBe('2026-01-05');
  });
});

describe('ventana de Actualidad', () => {
  it('define los siete días hacia atrás con frontera inclusiva', () => {
    expect(ACTUALIDAD_WINDOW_DAYS).toBe(7);
    expect(ACTUALIDAD_TIME_ZONE).toBe('America/Argentina/Buenos_Aires');
    expect(actualidadWindow(REFERENCIA)).toEqual({ start: '2026-10-12', end: '2026-10-19' });
  });

  it('usa el calendario argentino para decidir qué día es "hoy"', () => {
    // 02:30 UTC del 19/10 sigue siendo 18/10 en Argentina: la ventana corre un día.
    expect(actualidadWindow(new Date('2026-10-19T02:30:00.000Z'))).toEqual({
      start: '2026-10-11',
      end: '2026-10-18',
    });
  });

  it('cruza meses y años sin corrimientos', () => {
    expect(actualidadWindow(new Date('2027-01-02T15:00:00.000Z'))).toEqual({
      start: '2026-12-26',
      end: '2027-01-02',
    });
  });
});

describe('isInActualidadWindow', () => {
  const CASOS: ReadonlyArray<{ etiqueta: string; fecha: string; entra: boolean }> = [
    { etiqueta: 'publicado hoy', fecha: '2026-10-19', entra: true },
    { etiqueta: 'publicado ayer', fecha: '2026-10-18', entra: true },
    { etiqueta: 'publicado hace seis días calendario', fecha: '2026-10-13', entra: true },
    {
      etiqueta: 'publicado hace siete días calendario (frontera inclusiva)',
      fecha: '2026-10-12',
      entra: true,
    },
    { etiqueta: 'publicado hace ocho días calendario', fecha: '2026-10-11', entra: false },
    { etiqueta: 'publicado el mes anterior', fecha: '2026-09-30', entra: false },
  ];

  for (const caso of CASOS) {
    it(`${caso.etiqueta}: ${caso.entra ? 'entra' : 'no entra'}`, () => {
      expect(isInActualidadWindow(aLasDoceEnArgentina(caso.fecha), REFERENCIA)).toBe(caso.entra);
    });
  }

  it('decide la frontera con el calendario argentino, no con UTC', () => {
    // 01:00 UTC del 12/10 es 22:00 del 11/10 en Argentina: queda fuera, aunque
    // en UTC sea el día de inicio de la ventana.
    expect(isInActualidadWindow(new Date('2026-10-12T01:00:00.000Z'), REFERENCIA)).toBe(false);
    // 01:00 UTC del 20/10 es 22:00 del 19/10 en Argentina: entra.
    expect(isInActualidadWindow(new Date('2026-10-20T01:00:00.000Z'), REFERENCIA)).toBe(true);
    // 01:00 UTC del 21/10 es 22:00 del 20/10 en Argentina: todavía no ocurrió.
    expect(isInActualidadWindow(new Date('2026-10-21T01:00:00.000Z'), REFERENCIA)).toBe(false);
  });

  it('no adelanta artículos con fecha calendario futura', () => {
    expect(isInActualidadWindow(aLasDoceEnArgentina('2026-10-20'), REFERENCIA)).toBe(false);
  });

  it('toma las fechas sueltas del frontmatter como el instante que son', () => {
    // `publishedAt: "2026-10-12"` pasa por `z.coerce.date()` y queda como
    // medianoche UTC, que en Argentina es el 11/10 a las 21:00: fuera de la
    // ventana. El mismo día escrito como instante argentino entra justo.
    expect(calendarDateIn(new Date('2026-10-12T00:00:00.000Z'))).toBe('2026-10-11');
    expect(isInActualidadWindow(new Date('2026-10-12T00:00:00.000Z'), REFERENCIA)).toBe(false);
    expect(isInActualidadWindow(new Date('2026-10-12T03:00:00.000Z'), REFERENCIA)).toBe(true);
  });
});

describe('isActualidadEligible', () => {
  it('exige estado publicado', () => {
    expect(isActualidadEligible(candidato('publicada', '2026-10-19'), REFERENCIA)).toBe(true);
    expect(isActualidadEligible(candidato('borrador', '2026-10-19', 'draft'), REFERENCIA)).toBe(
      false,
    );
    expect(isActualidadEligible(candidato('en-revision', '2026-10-19', 'review'), REFERENCIA)).toBe(
      false,
    );
  });

  it('excluye un artículo publicado fuera de la ventana', () => {
    expect(isActualidadEligible(candidato('vieja', '2026-10-11'), REFERENCIA)).toBe(false);
  });

  it('no revive un artículo viejo porque lo hayan editado hoy', () => {
    // `updatedAt` no participa: editar no republica ni devuelve a Actualidad.
    expect(
      isActualidadEligible(candidato('editada', '2026-09-20', 'published', REFERENCIA), REFERENCIA),
    ).toBe(false);
  });

  it('selecciona de una lista solo los publicados dentro de la ventana', () => {
    const articulos = [
      candidato('hoy', '2026-10-19'),
      candidato('frontera', '2026-10-12'),
      candidato('viejo', '2026-10-11'),
      candidato('borrador', '2026-10-19', 'draft'),
      candidato('en-revision', '2026-10-19', 'review'),
      candidato('editado-hoy', '2026-09-20', 'published', REFERENCIA),
    ];

    const seleccionados = articulos
      .filter((articulo) => isActualidadEligible(articulo, REFERENCIA))
      .map((articulo) => articulo.data.slug);

    expect(seleccionados).toEqual(['hoy', 'frontera']);
  });
});

describe('addCalendarDays', () => {
  it('resta días cruzando mes y año', () => {
    expect(addCalendarDays('2026-10-19', -7)).toBe('2026-10-12');
    expect(addCalendarDays('2026-11-03', -7)).toBe('2026-10-27');
    expect(addCalendarDays('2027-01-02', -7)).toBe('2026-12-26');
    expect(addCalendarDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('rechaza fechas mal formadas en vez de calcular un rango inválido', () => {
    expect(() => addCalendarDays('19/10/2026', -7)).toThrow(RangeError);
    expect(() => addCalendarDays('', -7)).toThrow(RangeError);
  });
});
