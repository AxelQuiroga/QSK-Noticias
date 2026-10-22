import { describe, expect, it } from 'vitest';
import { normalizarTexto, formatearTitulo } from '../src/lib/normalizar-texto';

describe('normalizarTexto', () => {
  it('devuelve null para entradas nulas, undefined o vacías', () => {
    expect(normalizarTexto(null)).toBe(null);
    expect(normalizarTexto(undefined)).toBe(null);
    expect(normalizarTexto('')).toBe(null);
    expect(normalizarTexto('   ')).toBe(null);
  });

  it('decodifica entidades HTML nombradas y numéricas', () => {
    expect(normalizarTexto('&amp;')).toBe('&');
    expect(normalizarTexto('&quot;')).toBe('"');
    expect(normalizarTexto('&lt;')).toBe('<');
    expect(normalizarTexto('&gt;')).toBe('>');
    expect(normalizarTexto('&#160;')).toBe(null); // solo espacios → vacío
    expect(normalizarTexto('&nbsp;')).toBe(null); // solo espacios → vacío
    expect(normalizarTexto('hola&nbsp;mundo')).toBe('hola mundo'); // NBSP entre palabras → espacio
    expect(normalizarTexto('&#233;')).toBe('é');
    expect(normalizarTexto('&#xE1;')).toBe('á');
    expect(normalizarTexto('&#1114112;')).toBe('&#1114112;');
    expect(normalizarTexto('&#x110000;')).toBe('&#x110000;');
    expect(normalizarTexto('&iquest;')).toBe('¿');
  });

  it('elimina etiquetas HTML sin unir palabras incorrectamente', () => {
    expect(normalizarTexto('<b>hola</b><i>mundo</i>')).toBe('hola mundo');
    expect(normalizarTexto('<p>Texto con <br> salto</p>')).toBe('Texto con salto');
    expect(normalizarTexto('<a href="x">link</a>')).toBe('link');
  });

  it('normaliza espacios no rompibles, repetidos y bordes', () => {
    expect(normalizarTexto('  hola   mundo  ')).toBe('hola mundo');
    expect(normalizarTexto('a\u00A0b')).toBe('a b');
    expect(normalizarTexto('línea\n\n\tcon espacios')).toBe('línea con espacios');
  });

  it('no daña acentos, puntuación, comillas ni caracteres legítimos', () => {
    const entrada = 'Café, mañana: “qué tal” — ¿sí? 15 kg';
    expect(normalizarTexto(entrada)).toBe(entrada);
  });

  it('no decodifica dos veces texto ya limpio', () => {
    const entrada = 'Precios & productos';
    expect(normalizarTexto(normalizarTexto(entrada)!)).toBe(entrada);
  });

  it('convierte entidades en descripciones largas de RSS', () => {
    const entrada = 'Se inauguró el nuevo centro &amp; se entregaron &quot;netbooks&quot; a los alumnos&#160;de la zona.';
    expect(normalizarTexto(entrada)).toBe('Se inauguró el nuevo centro & se entregaron "netbooks" a los alumnos de la zona.');
  });
});

describe('formatearTitulo', () => {
  it('convierte títulos totalmente en mayúsculas a sentence case', () => {
    expect(formatearTitulo('NUEVOS TRABAJOS DE BACHEO SOBRE LA RUTA 58')).toBe(
      'Nuevos trabajos de bacheo sobre la ruta 58',
    );
  });

  it('no toca títulos que ya están en caso mixto', () => {
    const entrada = 'Kicillof encabezó la presentación del programa “Empleo Verde Joven”';
    expect(formatearTitulo(entrada)).toBe(entrada);
  });

  it('preserva acrónimos, números y signos en mayúsculas', () => {
    expect(formatearTitulo('PLAN 2° ETAPA: OBRAS Y MÁS')).toBe(
      'Plan 2° etapa: obras y más',
    );
  });

  it('preserva siglas institucionales al normalizar títulos en mayúsculas', () => {
    expect(formatearTitulo('OPERATIVO DE DNI Y ANSES EN EL BARRIO')).toBe(
      'Operativo de DNI y ANSES en el barrio',
    );
    expect(formatearTitulo('OBRAS DE LA UTN Y LA UNLP')).toBe(
      'Obras de la UTN y la UNLP',
    );
  });

  it('devuelve null para entradas nulas o vacías', () => {
    expect(formatearTitulo(null)).toBe(null);
    expect(formatearTitulo('')).toBe(null);
  });

  it('normaliza espacios antes de aplicar sentence case', () => {
    expect(formatearTitulo('  HOLA   MUNDO  ')).toBe('Hola mundo');
  });
});
