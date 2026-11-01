import { describe, it, expect } from 'vitest';
import {
  buildSearchDocument,
  buildSearchDocuments,
  matchesQuery,
  normalizeText,
  searchDocuments,
  tokenizeQuery,
  type SearchIndexEntry,
} from '../src/lib/search';
import {
  LOCATIONS,
  getAncestorOfType,
  getLocationById,
  getLocationsByType,
  isKnownLocationName,
} from '../src/data/locations';

const makeEntry = (
  overrides: Partial<SearchIndexEntry> & { slug: string },
): SearchIndexEntry => ({
  title: '',
  description: '',
  section: '',
  municipality: '',
  localidad: '',
  region: '',
  scope: '',
  publishedAt: '2026-10-13T00:00:00.000Z',
  content: '',
  ...overrides,
});

const entries: SearchIndexEntry[] = [
  makeEntry({
    slug: 'lanus-escuelas',
    title: 'Lanús anunció obras en cuatro establecimientos educativos',
    description: 'Qué se proyecta y cuánto se informó',
    section: 'Educación',
    municipality: 'Lanús',
    region: 'Zona Sur',
    content: 'Las obras alcanzan a cuatro escuelas del distrito.',
  }),
  makeEntry({
    slug: 'banfield-adoquines',
    title: 'Adoquines en Banfield: qué calles fueron reparadas',
    description: 'El programa municipal recupera calles empedradas',
    section: 'Obras públicas',
    municipality: 'Lomas de Zamora',
    localidad: 'Banfield',
    region: 'Zona Sur',
    content: 'Los trabajos se concentran en dos cuadras de la calle Medrano.',
  }),
  makeEntry({
    slug: 'ezpeleta-corte',
    title: 'Ezpeleta: anunciaron un corte de 14 días',
    description: 'Trabajos de bacheo con hormigón en la avenida Oscar Smith',
    section: 'Tránsito',
    municipality: 'Quilmes',
    localidad: 'Ezpeleta',
    region: 'Zona Sur',
    content: 'El transporte público modifica su recorrido durante las obras.',
  }),
  makeEntry({
    slug: 'anmat-lavandina',
    title: 'La ANMAT prohibió una lavandina en toda la Argentina',
    description: 'Alcance de la medida',
    section: 'Actualidad',
    scope: 'nacional',
    content: 'La resolución rige en todo el país.',
  }),
  makeEntry({
    slug: 'aysa-rowing',
    title: 'AySA: Rowing presentó la oferta más alta',
    description: 'Qué consta en el expediente',
    section: 'Economía',
    region: 'AMBA',
    scope: 'nacional',
    content: 'La preadjudicación alcanza al 90% de la empresa.',
  }),
  makeEntry({
    slug: 'quilmes-evento',
    title: 'Actividad cultural en Quilmes',
    description: 'Cronograma del fin de semana',
    section: 'Actualidad',
    municipality: 'Quilmes',
    region: 'Zona Sur',
    content: 'El municipio informó el cronograma.',
  }),
];

const documents = buildSearchDocuments(entries);
const slugsFor = (query: string): string[] =>
  searchDocuments(documents, query).map((document) => document.slug);

describe('normalizeText', () => {
  it('quita tildes, mayúsculas y puntuación', () => {
    expect(normalizeText('Lanús')).toBe('lanus');
    expect(normalizeText('AMBA')).toBe('amba');
    expect(normalizeText('¡Hola, mundo!')).toBe('hola mundo');
  });
});

describe('tokenizeQuery', () => {
  it('separa términos y descarta palabras vacías', () => {
    expect(tokenizeQuery('transporte en Lanús')).toEqual(['transporte', 'lanus']);
    expect(tokenizeQuery('educación   en   Banfield')).toEqual(['educacion', 'banfield']);
  });

  it('devuelve vacío sin términos significativos', () => {
    expect(tokenizeQuery('')).toEqual([]);
    expect(tokenizeQuery('   ')).toEqual([]);
    expect(tokenizeQuery('de la en')).toEqual([]);
  });

  it('no repite términos', () => {
    expect(tokenizeQuery('lanus Lanús LANUS')).toEqual(['lanus']);
  });
});

describe('matchesQuery', () => {
  it('compara sin distinguir tildes ni mayúsculas', () => {
    expect(matchesQuery('Lanús', 'lanus')).toBe(true);
    expect(matchesQuery('Lanús', 'LANÚS')).toBe(true);
    expect(matchesQuery('Zona Sur', 'zona sur')).toBe(true);
  });

  it('exige todos los términos', () => {
    expect(matchesQuery('Zona Sur', 'zona norte')).toBe(false);
    expect(matchesQuery('Zona Sur', 'de la')).toBe(false);
  });
});

describe('searchDocuments', () => {
  it('busca por tema', () => {
    expect(slugsFor('educación')).toContain('lanus-escuelas');
  });

  it('busca por tema principal y temas secundarios', () => {
    const editorialDocuments = buildSearchDocuments([
      makeEntry({
        slug: 'alemania-economia',
        title: 'Alemania anuncia nuevas medidas',
        primaryTopic: 'Economía',
        secondaryTopics: ['Política', 'Comercio'],
        country: 'DE',
      }),
    ]);
    const search = (query: string) => searchDocuments(editorialDocuments, query).map(({ slug }) => slug);

    expect(search('economía')).toEqual(['alemania-economia']);
    expect(search('política')).toEqual(['alemania-economia']);
    expect(search('comercio')).toEqual(['alemania-economia']);
    expect(search('economía comercio')).toEqual(['alemania-economia']);
    expect(search('economía deportes')).toEqual([]);
  });

  it('busca por código ISO y nombre legible del país', () => {
    const internationalDocuments = buildSearchDocuments([
      makeEntry({ slug: 'alemania', title: 'Medidas económicas', country: 'de' }),
    ]);

    expect(searchDocuments(internationalDocuments, 'alemania').map(({ slug }) => slug)).toEqual(['alemania']);
    expect(searchDocuments(internationalDocuments, 'DE').map(({ slug }) => slug)).toEqual(['alemania']);
  });

  it('busca por municipio', () => {
    expect(slugsFor('quilmes')).toEqual(expect.arrayContaining(['ezpeleta-corte', 'quilmes-evento']));
  });

  it('busca por localidad', () => {
    expect(slugsFor('banfield')).toEqual(['banfield-adoquines']);
    expect(slugsFor('ezpeleta')).toEqual(['ezpeleta-corte']);
  });

  it('busca por provincia usando la jerarquía del catálogo', () => {
    expect(slugsFor('buenos aires')).toEqual(
      expect.arrayContaining(['lanus-escuelas', 'banfield-adoquines', 'ezpeleta-corte', 'quilmes-evento']),
    );
    // Un artículo nacional o regional no reclama una provincia que no declara.
    expect(slugsFor('buenos aires')).not.toContain('anmat-lavandina');
    expect(slugsFor('buenos aires')).not.toContain('aysa-rowing');
  });

  it('busca por región editorial', () => {
    expect(slugsFor('zona sur')).toEqual(
      expect.arrayContaining(['lanus-escuelas', 'banfield-adoquines', 'quilmes-evento']),
    );
    expect(slugsFor('amba')).toContain('aysa-rowing');
  });

  it('combina tema y ubicación', () => {
    expect(slugsFor('escuelas en lanus')).toEqual(['lanus-escuelas']);
    expect(slugsFor('adoquines en banfield')).toEqual(['banfield-adoquines']);
    expect(slugsFor('transporte en ezpeleta')).toEqual(['ezpeleta-corte']);
  });

  it('encuentra consultas escritas sin tildes', () => {
    expect(slugsFor('lanus')).toContain('lanus-escuelas');
    expect(slugsFor('lanus anuncio obras')).toContain('lanus-escuelas');
  });

  it('no distingue mayúsculas de minúsculas', () => {
    expect(slugsFor('EDUCACIÓN')).toContain('lanus-escuelas');
    expect(slugsFor('BaNfIeLd')).toEqual(['banfield-adoquines']);
  });

  it('busca dentro del contenido del artículo', () => {
    expect(slugsFor('medrano')).toEqual(['banfield-adoquines']);
    expect(slugsFor('recorrido')).toEqual(['ezpeleta-corte']);
  });

  it('devuelve las noticias nacionales sin municipio específico', () => {
    expect(slugsFor('lavandina')).toEqual(['anmat-lavandina']);
  });

  it('devuelve vacío con consulta vacía o sin resultados', () => {
    expect(slugsFor('')).toEqual([]);
    expect(slugsFor('de la')).toEqual([]);
    expect(slugsFor('inexistente12345')).toEqual([]);
  });

  it('ordena por relevancia: el título pesa más que el contenido', () => {
    const withDuplicate = buildSearchDocuments([
      ...entries,
      makeEntry({
        slug: 'mencion-en-contenido',
        title: 'Nota sobre otro tema',
        section: 'Actualidad',
        publishedAt: '2026-10-14T00:00:00.000Z',
        content: 'Quilmes aparece sólo en el cuerpo de esta nota.',
      }),
    ]);
    const results = searchDocuments(withDuplicate, 'quilmes').map((document) => document.slug);
    expect(results.indexOf('quilmes-evento')).toBeLessThan(results.indexOf('mencion-en-contenido'));
  });
});

describe('buildSearchDocument', () => {
  it('resuelve municipio, regiones, provincia y país desde el catálogo', () => {
    const document = buildSearchDocument(
      makeEntry({ slug: 'x', municipality: 'Lanús', region: 'Zona Sur' }),
    );
    expect(document.location.municipality).toBe('Lanús');
    expect(document.location.provincia).toBe('Buenos Aires');
    expect(document.location.pais).toBe('Argentina');
    expect(document.location.regions).toEqual(['AMBA', 'Zona Sur']);
  });

  it('resuelve la jerarquía de una localidad', () => {
    const document = buildSearchDocument(
      makeEntry({ slug: 'x', municipality: 'Lomas de Zamora', localidad: 'Banfield' }),
    );
    expect(document.location.localidad).toBe('Banfield');
    expect(document.location.provincia).toBe('Buenos Aires');
  });

  it('no inventa jerarquía para valores fuera del catálogo', () => {
    const document = buildSearchDocument(
      makeEntry({ slug: 'x', municipality: 'AMBA', region: 'AMBA' }),
    );
    expect(document.location.municipality).toBe('AMBA');
    expect(document.location.provincia).toBe('');
    expect(document.location.pais).toBe('');
    expect(document.location.regions).toEqual(['AMBA']);
  });

  it('indexa los nombres del catálogo asociados a la ubicación', () => {
    const document = buildSearchDocument(makeEntry({ slug: 'x', municipality: 'Quilmes' }));
    const locationField = document.fields.find((field) => field.weight === 4);
    expect(locationField?.text).toContain('quilmes');
    expect(locationField?.text).toContain('zona sur');
    expect(locationField?.text).toContain('argentina');
  });
});

describe('catálogo geográfico', () => {
  it('todos los `parentId` y `regionIds` apuntan a ubicaciones existentes', () => {
    for (const location of LOCATIONS) {
      if (location.parentId) {
        expect(getLocationById(location.parentId), `${location.id} -> ${location.parentId}`).toBeDefined();
      }
      for (const regionId of location.regionIds ?? []) {
        expect(getLocationById(regionId)?.type, `${location.id} -> ${regionId}`).toBe('region');
      }
    }
  });

  it('no repite nombres', () => {
    const names = LOCATIONS.map((location) => location.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it('cada municipio pertenece a una provincia y a un país', () => {
    for (const municipio of getLocationsByType('municipio')) {
      expect(getAncestorOfType(municipio, 'provincia')?.name).toBe('Buenos Aires');
      expect(getAncestorOfType(municipio, 'pais')?.name).toBe('Argentina');
    }
  });

  it('incluye los municipios acordados para la cobertura de Zona Sur', () => {
    const zonaSur = [
      'Avellaneda',
      'Lanús',
      'Lomas de Zamora',
      'Almirante Brown',
      'Quilmes',
      'Berazategui',
      'Florencio Varela',
      'Esteban Echeverría',
      'Ezeiza',
      'Presidente Perón',
      'San Vicente',
    ];
    const municipalities = getLocationsByType('municipio');
    for (const name of zonaSur) {
      const location = municipalities.find((municipio) => municipio.name === name);
      expect(location, `Falta el municipio ${name}`).toBeDefined();
      expect(location?.regionIds).toEqual(expect.arrayContaining(['region-zona-sur', 'region-amba']));
    }
  });

  it('cada localidad pertenece a un municipio', () => {
    for (const localidad of getLocationsByType('localidad')) {
      expect(getAncestorOfType(localidad, 'municipio')?.type).toBe('municipio');
    }
  });

  it('valida nombre + tipo, no nombre suelto', () => {
    expect(isKnownLocationName('Lanús', 'municipio')).toBe(true);
    expect(isKnownLocationName('AMBA', 'municipio')).toBe(false);
    expect(isKnownLocationName('AMBA', 'region')).toBe(true);
    expect(isKnownLocationName('Banfield', 'localidad')).toBe(true);
    expect(isKnownLocationName('Avellaneda', 'municipio')).toBe(true);
  });
});
