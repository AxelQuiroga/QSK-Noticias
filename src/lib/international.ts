import type  {Article}  from "./articles";

/**
 * ISO 3166-1 alpha-2 country codes
 * Incluye países principales del mundo
 */
export const COUNTRY_CODES = {
  // América
  AR: 'Argentina',
  BR: 'Brasil',
  MX: 'México',
  CL: 'Chile',
  CO: 'Colombia',
  PE: 'Perú',
  VE: 'Venezuela',
  BO: 'Bolivia',
  PY: 'Paraguay',
  UY: 'Uruguay',
  EC: 'Ecuador',
  GY: 'Guyana',
  SR: 'Surinam',
  GF: 'Guayana Francesa',
  CA: 'Canadá',
  US: 'Estados Unidos',
  CR: 'Costa Rica',
  PA: 'Panamá',
  CU: 'Cuba',
  DO: 'República Dominicana',
  HT: 'Haití',
  JM: 'Jamaica',
  
  // Europa
  ES: 'España',
  FR: 'Francia',
  IT: 'Italia',
  DE: 'Alemania',
  GB: 'Reino Unido',
  IE: 'Irlanda',
  NL: 'Países Bajos',
  BE: 'Bélgica',
  CH: 'Suiza',
  AT: 'Austria',
  PL: 'Polonia',
  SE: 'Suecia',
  NO: 'Noruega',
  DK: 'Dinamarca',
  FI: 'Finlandia',
  PT: 'Portugal',
  GR: 'Grecia',
  CZ: 'República Checa',
  RO: 'Rumania',
  UA: 'Ucrania',
  RU: 'Rusia',
  
  // Asia
  JP: 'Japón',
  CN: 'China',
  KR: 'Corea del Sur',
  KP: 'Corea del Norte',
  IN: 'India',
  ID: 'Indonesia',
  TH: 'Tailandia',
  VN: 'Vietnam',
  SG: 'Singapur',
  MY: 'Malasia',
  PH: 'Filipinas',
  TW: 'Taiwán',
  HK: 'Hong Kong',
  MO: 'Macao',
  BD: 'Bangladesh',
  PK: 'Pakistán',
  KZ: 'Kazajistán',
  UZ: 'Uzbekistán',
  TJ: 'Tayikistán',
  TM: 'Turkmenistán',
  KG: 'Kirguistán',
  AF: 'Afganistán',
  IR: 'Irán',
  IQ: 'Irak',
  SA: 'Arabia Saudita',
  AE: 'Emiratos Árabes Unidos',
  IL: 'Israel',
  TR: 'Turquía',
  SY: 'Siria',
  LB: 'Líbano',
  JO: 'Jordania',
  
  // Oceanía
  AU: 'Australia',
  NZ: 'Nueva Zelanda',
  FJ: 'Fiyi',
  
  // África
  EG: 'Egipto',
  ZA: 'Sudáfrica',
  NG: 'Nigeria',
  ET: 'Etiopía',
  KE: 'Kenia',
  GH: 'Ghana',
  MA: 'Marruecos',
  DZ: 'Argelia',
  TN: 'Túnez',
  UG: 'Uganda',
  TZ: 'Tanzania',
  ZM: 'Zambia',
  ZW: 'Zimbabue',
  CM: 'Camerún',
  CD: 'República Democrática del Congo',
  CI: 'Costa de Marfil',
  SN: 'Senegal',
} as const;

export type CountryCode = keyof typeof COUNTRY_CODES;

export const GEOGRAPHIC_REGIONS = {
  AMERICAS: 'América',
  EUROPE: 'Europa',
  ASIA: 'Asia',
  OCEANIA: 'Oceanía',
  AFRICA: 'África',
} as const;

export type GeographicRegion = typeof GEOGRAPHIC_REGIONS[keyof typeof GEOGRAPHIC_REGIONS];

/**
 * Mapeo de países a regiones geográficas
 * Usado para validar y clasificar noticias internacionales
 */
export const COUNTRY_TO_REGION: Record<CountryCode, GeographicRegion> = {
  // América
  AR: GEOGRAPHIC_REGIONS.AMERICAS,
  BR: GEOGRAPHIC_REGIONS.AMERICAS,
  MX: GEOGRAPHIC_REGIONS.AMERICAS,
  CL: GEOGRAPHIC_REGIONS.AMERICAS,
  CO: GEOGRAPHIC_REGIONS.AMERICAS,
  PE: GEOGRAPHIC_REGIONS.AMERICAS,
  VE: GEOGRAPHIC_REGIONS.AMERICAS,
  BO: GEOGRAPHIC_REGIONS.AMERICAS,
  PY: GEOGRAPHIC_REGIONS.AMERICAS,
  UY: GEOGRAPHIC_REGIONS.AMERICAS,
  EC: GEOGRAPHIC_REGIONS.AMERICAS,
  GY: GEOGRAPHIC_REGIONS.AMERICAS,
  SR: GEOGRAPHIC_REGIONS.AMERICAS,
  GF: GEOGRAPHIC_REGIONS.AMERICAS,
  CA: GEOGRAPHIC_REGIONS.AMERICAS,
  US: GEOGRAPHIC_REGIONS.AMERICAS,
  CR: GEOGRAPHIC_REGIONS.AMERICAS,
  PA: GEOGRAPHIC_REGIONS.AMERICAS,
  CU: GEOGRAPHIC_REGIONS.AMERICAS,
  DO: GEOGRAPHIC_REGIONS.AMERICAS,
  HT: GEOGRAPHIC_REGIONS.AMERICAS,
  JM: GEOGRAPHIC_REGIONS.AMERICAS,
  
  // Europa
  ES: GEOGRAPHIC_REGIONS.EUROPE,
  FR: GEOGRAPHIC_REGIONS.EUROPE,
  IT: GEOGRAPHIC_REGIONS.EUROPE,
  DE: GEOGRAPHIC_REGIONS.EUROPE,
  GB: GEOGRAPHIC_REGIONS.EUROPE,
  IE: GEOGRAPHIC_REGIONS.EUROPE,
  NL: GEOGRAPHIC_REGIONS.EUROPE,
  BE: GEOGRAPHIC_REGIONS.EUROPE,
  CH: GEOGRAPHIC_REGIONS.EUROPE,
  AT: GEOGRAPHIC_REGIONS.EUROPE,
  PL: GEOGRAPHIC_REGIONS.EUROPE,
  SE: GEOGRAPHIC_REGIONS.EUROPE,
  NO: GEOGRAPHIC_REGIONS.EUROPE,
  DK: GEOGRAPHIC_REGIONS.EUROPE,
  FI: GEOGRAPHIC_REGIONS.EUROPE,
  PT: GEOGRAPHIC_REGIONS.EUROPE,
  GR: GEOGRAPHIC_REGIONS.EUROPE,
  CZ: GEOGRAPHIC_REGIONS.EUROPE,
  RO: GEOGRAPHIC_REGIONS.EUROPE,
  UA: GEOGRAPHIC_REGIONS.EUROPE,
  RU: GEOGRAPHIC_REGIONS.EUROPE,
  
  // Asia
  JP: GEOGRAPHIC_REGIONS.ASIA,
  CN: GEOGRAPHIC_REGIONS.ASIA,
  KR: GEOGRAPHIC_REGIONS.ASIA,
  KP: GEOGRAPHIC_REGIONS.ASIA,
  IN: GEOGRAPHIC_REGIONS.ASIA,
  ID: GEOGRAPHIC_REGIONS.ASIA,
  TH: GEOGRAPHIC_REGIONS.ASIA,
  VN: GEOGRAPHIC_REGIONS.ASIA,
  SG: GEOGRAPHIC_REGIONS.ASIA,
  MY: GEOGRAPHIC_REGIONS.ASIA,
  PH: GEOGRAPHIC_REGIONS.ASIA,
  TW: GEOGRAPHIC_REGIONS.ASIA,
  HK: GEOGRAPHIC_REGIONS.ASIA,
  MO: GEOGRAPHIC_REGIONS.ASIA,
  BD: GEOGRAPHIC_REGIONS.ASIA,
  PK: GEOGRAPHIC_REGIONS.ASIA,
  KZ: GEOGRAPHIC_REGIONS.ASIA,
  UZ: GEOGRAPHIC_REGIONS.ASIA,
  TJ: GEOGRAPHIC_REGIONS.ASIA,
  TM: GEOGRAPHIC_REGIONS.ASIA,
  KG: GEOGRAPHIC_REGIONS.ASIA,
  AF: GEOGRAPHIC_REGIONS.ASIA,
  IR: GEOGRAPHIC_REGIONS.ASIA,
  IQ: GEOGRAPHIC_REGIONS.ASIA,
  SA: GEOGRAPHIC_REGIONS.ASIA,
  AE: GEOGRAPHIC_REGIONS.ASIA,
  IL: GEOGRAPHIC_REGIONS.ASIA,
  TR: GEOGRAPHIC_REGIONS.EUROPE,
  SY: GEOGRAPHIC_REGIONS.ASIA,
  LB: GEOGRAPHIC_REGIONS.ASIA,
  JO: GEOGRAPHIC_REGIONS.ASIA,
  
  // Oceanía
  AU: GEOGRAPHIC_REGIONS.OCEANIA,
  NZ: GEOGRAPHIC_REGIONS.OCEANIA,
  FJ: GEOGRAPHIC_REGIONS.OCEANIA,
  
  // África
  EG: GEOGRAPHIC_REGIONS.AFRICA,
  ZA: GEOGRAPHIC_REGIONS.AFRICA,
  NG: GEOGRAPHIC_REGIONS.AFRICA,
  ET: GEOGRAPHIC_REGIONS.AFRICA,
  KE: GEOGRAPHIC_REGIONS.AFRICA,
  GH: GEOGRAPHIC_REGIONS.AFRICA,
  MA: GEOGRAPHIC_REGIONS.AFRICA,
  DZ: GEOGRAPHIC_REGIONS.AFRICA,
  TN: GEOGRAPHIC_REGIONS.AFRICA,
  UG: GEOGRAPHIC_REGIONS.AFRICA,
  TZ: GEOGRAPHIC_REGIONS.AFRICA,
  ZM: GEOGRAPHIC_REGIONS.AFRICA,
  ZW: GEOGRAPHIC_REGIONS.AFRICA,
  CM: GEOGRAPHIC_REGIONS.AFRICA,
  CD: GEOGRAPHIC_REGIONS.AFRICA,
  CI: GEOGRAPHIC_REGIONS.AFRICA,
  SN: GEOGRAPHIC_REGIONS.AFRICA,
} as const;

/**
 * Detecta noticias cuyo alcance geográfico es internacional.
 * La sección editorial (Política, Economía, Deportes, etc.) sigue siendo
 * independiente y no determina el alcance geográfico.
 */
export function isInternational(article: Article): boolean {
  return article.data.scope === 'internacional';
}


/**
 * Utility: obtiene el nombre del país a partir del código
 */
export function getCountryName(code: string): string | undefined {
  return Object.hasOwn(COUNTRY_CODES, code) ? COUNTRY_CODES[code as CountryCode] : undefined;
}

/**
 * Utility: obtiene la región geográfica de un país
 */
export function getCountryRegion(code: string): GeographicRegion | undefined {
  return Object.hasOwn(COUNTRY_TO_REGION, code) ? COUNTRY_TO_REGION[code as CountryCode] : undefined;
}