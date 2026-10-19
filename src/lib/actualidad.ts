/**
 * Ventana temporal de la página Actualidad.
 *
 * `Actualidad` dejó de ser un tema editorial: `/secciones/actualidad/` es el
 * listado de las noticias publicadas en los últimos días. Este módulo es la
 * ÚNICA definición de esa ventana —días, zona horaria y límites— para que la
 * página, el resto del sitio y los tests compartan una sola regla.
 *
 * Semántica: se comparan FECHAS CALENDARIO de Argentina
 * (`America/Argentina/Buenos_Aires`), no instantes UTC ni la fecha del hecho
 * que originó la noticia. Un artículo entra si su `publishedAt` cae en la
 * fecha de referencia (hoy) o en los siete días calendario anteriores, con
 * frontera inclusiva: hace 7 días calendario entra, hace 8 días no.
 *
 * `updatedAt` no participa: editar un artículo no lo devuelve a Actualidad.
 */

export const ACTUALIDAD_TIME_ZONE = 'America/Argentina/Buenos_Aires';

/**
 * Días calendario hacia atrás que cubre la ventana, contando la fecha de
 * referencia y la frontera inclusiva (hoy, ayer, …, hace 7 días).
 */
export const ACTUALIDAD_WINDOW_DAYS = 7;

/** Límites inclusivos de la ventana, expresados como fechas `YYYY-MM-DD`. */
export interface ActualidadWindow {
  /** Primera fecha calendario incluida (la más antigua). */
  start: string;
  /** Última fecha calendario incluida (la fecha de referencia). */
  end: string;
}

/** Formateadores por zona, cacheados: crear `Intl.DateTimeFormat` no es barato. */
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  const cached = formatters.get(timeZone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  formatters.set(timeZone, formatter);
  return formatter;
}

/**
 * Fecha calendario (`YYYY-MM-DD`) de un instante en la zona indicada.
 *
 * Se arma con `formatToParts` para no depender del orden de campos que el
 * locale elija, y así comparar fechas como texto ordenable.
 */
export function calendarDateIn(instant: Date, timeZone: string = ACTUALIDAD_TIME_ZONE): string {
  const parts = formatterFor(timeZone).formatToParts(instant);
  const valueOf = (type: string): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${valueOf('year')}-${valueOf('month')}-${valueOf('day')}`;
}

/**
 * Suma (o resta, con `days` negativo) días calendario a una fecha
 * `YYYY-MM-DD`. Opera en UTC sobre la fecha suelta: así el cálculo no
 * reintroduce corrimientos de zona horaria ni de horario de verano.
 */
export function addCalendarDays(isoDate: string, days: number): string {
  const parts = isoDate.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new RangeError(`Fecha calendario inválida: "${isoDate}" (se espera YYYY-MM-DD).`);
  }

  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

/** Límites inclusivos de la ventana de Actualidad para una fecha de referencia. */
export function actualidadWindow(reference: Date = new Date()): ActualidadWindow {
  const end = calendarDateIn(reference);
  return { start: addCalendarDays(end, -ACTUALIDAD_WINDOW_DAYS), end };
}

/**
 * ¿La fecha de publicación cae dentro de la ventana?
 *
 * Las fechas `YYYY-MM-DD` se comparan como texto: en ese formato el orden
 * lexicográfico coincide con el cronológico.
 */
export function isInActualidadWindow(publishedAt: Date, reference: Date = new Date()): boolean {
  const { start, end } = actualidadWindow(reference);
  const date = calendarDateIn(publishedAt);

  return date >= start && date <= end;
}

/** Datos mínimos que necesita la regla de Actualidad. */
export interface ActualidadCandidate {
  data: {
    status?: string;
    publishedAt: Date;
  };
}

/**
 * ¿El artículo debe aparecer en Actualidad? Publicado Y dentro de la ventana.
 *
 * El `status` se exige acá —y no solo en producción como en el resto del
 * sitio— porque Actualidad nunca lista borradores ni artículos en revisión.
 * `updatedAt` no se mira nunca: editar no republica.
 */
export function isActualidadEligible(
  article: ActualidadCandidate,
  reference: Date = new Date(),
): boolean {
  return (
    article.data.status === 'published' &&
    isInActualidadWindow(article.data.publishedAt, reference)
  );
}
