/**
 * Normalización de texto importado de fuentes oficiales.
 *
 * Objetivo: limpiar defectos tipográficos de la extracción (entidades HTML,
 * etiquetas sueltas, espacios de control) sin alterar el sentido del contenido
 * ni inyectar HTML renderizado en la página.
 *
 * Reglas:
 * - Decodifica entidades HTML nombradas y numéricas (`&#160;`, `&#x27;`,
 *   `&#233;`, etc.) en una sola pasada, por lo que es idempotente frente a
 *   texto ya decodificado.
 * - Elimina etiquetas HTML sin unir palabras de forma incorrecta.
 * - Normaliza espacios no rompibles, espacios repetidos y bordes.
 * - Acepta null/undefined/cadena vacía de forma segura.
 * - Nunca devuelve HTML: el resultado se escapa normalmente por Astro/JSX.
 */

// Entidades nombradas más frecuentes en feeds oficiales argentinos (clave sin
// & ni ;, ya que el token capturado del regex ya los excluye).
const ENTIDADES_NOMBRADAS: Record<string, string> = {
  nbsp: '\u00A0',
  iexcl: '\u00A1',
  cent: '\u00A2',
  pound: '\u00A3',
  curren: '\u00A4',
  yen: '\u00A5',
  brvbar: '\u00A6',
  sect: '\u00A7',
  uml: '\u00A8',
  copy: '\u00A9',
  ordf: '\u00AA',
  laquo: '\u00AB',
  not: '\u00AC',
  shy: '',
  reg: '\u00AE',
  macr: '\u00AF',
  deg: '\u00B0',
  sup2: '\u00B2',
  sup3: '\u00B3',
  acute: '\u00B4',
  micro: '\u00B5',
  para: '\u00B6',
  middot: '\u00B7',
  cedil: '\u00B8',
  sup1: '\u00B9',
  ordm: '\u00BA',
  raquo: '\u00BB',
  frac14: '\u00BC',
  frac12: '\u00BD',
  frac34: '\u00BE',
  iquest: '\u00BF',
  Agrave: '\u00C0',
  Aacute: '\u00C1',
  Acirc: '\u00C2',
  Atilde: '\u00C3',
  Auml: '\u00C4',
  Aring: '\u00C5',
  AElig: '\u00C6',
  Ccedil: '\u00C7',
  Egrave: '\u00C8',
  Eacute: '\u00C9',
  Ecirc: '\u00CA',
  Euml: '\u00CB',
  Igrave: '\u00CC',
  Iacute: '\u00CD',
  Icirc: '\u00CE',
  Iuml: '\u00CF',
  ETH: '\u00D0',
  Ntilde: '\u00D1',
  Ograve: '\u00D2',
  Oacute: '\u00D3',
  Ocirc: '\u00D4',
  Otilde: '\u00D5',
  Ouml: '\u00D6',
  times: '\u00D7',
  Oslash: '\u00D8',
  Ugrave: '\u00D9',
  Uacute: '\u00DA',
  Ucirc: '\u00DB',
  Uuml: '\u00DC',
  Yacute: '\u00DD',
  THORN: '\u00DE',
  szlig: '\u00DF',
  agrave: '\u00E0',
  aacute: '\u00E1',
  acirc: '\u00E2',
  atilde: '\u00E3',
  auml: '\u00E4',
  aring: '\u00E5',
  aelig: '\u00E6',
  ccedil: '\u00E7',
  egrave: '\u00E8',
  eacute: '\u00E9',
  ecirc: '\u00EA',
  euml: '\u00EB',
  igrave: '\u00EC',
  iacute: '\u00ED',
  icirc: '\u00EE',
  iuml: '\u00EF',
  eth: '\u00F0',
  ntilde: '\u00F1',
  ograve: '\u00F2',
  oacute: '\u00F3',
  ocirc: '\u00F4',
  otilde: '\u00F5',
  ouml: '\u00F6',
  divide: '\u00F7',
  oslash: '\u00F8',
  ugrave: '\u00F9',
  uacute: '\u00FA',
  ucirc: '\u00FB',
  uuml: '\u00FC',
  yacute: '\u00FD',
  thorn: '\u00FE',
  yuml: '\u00FF',
  quot: '"',
  amp: '&',
  lt: '<',
  gt: '>',
  apos: "'",
};

/**
 * Decodifica entidades HTML nombradas y numéricas en una sola pasada.
 */
function decodificarEntidades(texto: string): string {
  return texto.replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z\d]*);/g, (_match, token) => {
    if (token.startsWith('#')) {
      const esHex = token.startsWith('#x');
      const codigo = esHex ? parseInt(token.slice(2), 16) : parseInt(token.slice(1), 10);
      if (Number.isInteger(codigo) && codigo >= 0 && codigo <= 0x10FFFF) {
        return String.fromCodePoint(codigo);
      }
      // Mantener entidades numéricas inválidas como texto en lugar de lanzar
      // RangeError durante el renderizado del sitio.
      return _match;
    }
    return ENTIDADES_NOMBRADAS[token] ?? _match;
  });
}

/**
 * Elimina etiquetas HTML insertando un espacio entre etiquetas adyacentes para
 * evitar unir palabras que estaban separadas por una etiqueta.
 */
function quitarEtiquetasHTML(texto: string): string {
  return texto.replace(/<[^>]*>/g, ' ');
}

/**
 * Normaliza espacios no rompibles y otros espacios Unicode a espacio común,
 * colapsa secuencias de espacios y recorta bordes.
 */
function normalizarEspacios(texto: string): string {
  return texto
    .replace(/[\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Limpia un campo de texto importado. Devuelve `null` si la entrada es
 * `null`/`undefined` o queda vacía tras la limpieza.
 */
export function normalizarTexto(texto: string | null | undefined): string | null {
  if (texto === null || texto === undefined) return null;
  if (texto === '') return null;

  let resultado = decodificarEntidades(texto);
  resultado = quitarEtiquetasHTML(resultado);
  resultado = normalizarEspacios(resultado);

  return resultado === '' ? null : resultado;
}

/**
 * Determina si una cadena está escrita completamente en mayúsculas (solo se
 * consideran letras alfabéticas).
 */
function estaEnMayusculas(texto: string): boolean {
  return /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(texto) && texto === texto.toUpperCase();
}

/**
 * Aplica sentence case conservador en español: solo transforma títulos que
 * llegan completamente en mayúsculas. En ese caso deja la primera letra en
 * mayúscula y el resto en minúsculas, preservando acrónimos, números y
 * signos de puntuación. Si no está completamente en mayúsculas, se devuelve
 * tal como viene para no dañar nombres propios ni acrónimos mixtos.
 */
export function formatearTitulo(titulo: string | null | undefined): string | null {
  const limpio = normalizarTexto(titulo);
  if (limpio === null) return null;
  if (!estaEnMayusculas(limpio)) return limpio;

  const resultado = limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();

  // En títulos íntegramente en mayúsculas no se puede inferir cualquier sigla
  // automáticamente; preservamos las siglas institucionales frecuentes.
  const siglas: Record<string, string> = {
    ANSES: 'ANSES',
    ARCA: 'ARCA',
    COVID: 'COVID',
    DNI: 'DNI',
    GBA: 'GBA',
    PAMI: 'PAMI',
    SUBE: 'SUBE',
    UBA: 'UBA',
    UNLAM: 'UNLaM',
    UNLP: 'UNLP',
    UTN: 'UTN',
  };
  return resultado.replace(/\b(?:anses|arca|covid|dni|gba|pami|sube|uba|unlam|unlp|utn)\b/gi, (token) => {
    const clave = token.toUpperCase();
    return siglas[clave] ?? token;
  });
}
