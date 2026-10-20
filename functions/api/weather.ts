const LOCATIONS: Record<string, { name: string; latitude: number; longitude: number }> = {
  lanus: { name: 'Lanús', latitude: -34.7065, longitude: -58.3955 },
  caba: { name: 'CABA', latitude: -34.6037, longitude: -58.3816 },
  avellaneda: { name: 'Avellaneda', latitude: -34.6627, longitude: -58.3670 },
  'lomas-de-zamora': { name: 'Lomas de Zamora', latitude: -34.7609, longitude: -58.4064 },
  'almirante-brown': { name: 'Almirante Brown', latitude: -34.8000, longitude: -58.3833 },
  quilmes: { name: 'Quilmes', latitude: -34.7206, longitude: -58.2545 },
  berazategui: { name: 'Berazategui', latitude: -34.7653, longitude: -58.2128 },
  'florencio-varela': { name: 'Florencio Varela', latitude: -34.8094, longitude: -58.2760 },
  'esteban-echeverria': { name: 'Esteban Echeverría', latitude: -34.8172, longitude: -58.4627 },
  ezeiza: { name: 'Ezeiza', latitude: -34.8539, longitude: -58.5228 },
  'presidente-peron': { name: 'Presidente Perón', latitude: -34.9167, longitude: -58.3833 },
  'san-vicente': { name: 'San Vicente', latitude: -35.0231, longitude: -58.4228 },
};

interface WeatherApiResponse {
  current: {
    temp_c: number;
    feelslike_c: number;
    humidity: number;
    precip_mm: number;
    condition: { text: string; code: number };
    last_updated: string;
  };
  forecast: {
    forecastday: Array<{
      hour: Array<{ time_epoch: number; chance_of_rain: number }>;
    }>;
  };
}

interface Env {
  WEATHER_API_KEY?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const locationId = new URL(context.request.url).searchParams.get('location') ?? '';
  const location = LOCATIONS[locationId];

  if (!location) {
    return Response.json({ error: 'Localidad no válida.' }, { status: 400 });
  }

  const apiKey = context.env.WEATHER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'El servicio meteorológico todavía no está configurado.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const cache = (globalThis as typeof globalThis & { caches?: CacheStorage }).caches?.default;
  const cacheKey = new Request(new URL(context.request.url).toString(), { method: 'GET' });
  if (cache) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  }

  const upstreamUrl = new URL('https://api.weatherapi.com/v1/forecast.json');
  upstreamUrl.searchParams.set('key', apiKey);
  upstreamUrl.searchParams.set('q', `${location.latitude},${location.longitude}`);
  upstreamUrl.searchParams.set('days', '1');
  upstreamUrl.searchParams.set('aqi', 'no');
  upstreamUrl.searchParams.set('alerts', 'no');

  try {
    const upstream = await fetch(upstreamUrl, { signal: AbortSignal.timeout(8000) });
    if (!upstream.ok) {
      return Response.json(
        { error: 'El proveedor meteorológico no respondió correctamente.' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const data = (await upstream.json()) as WeatherApiResponse;
    const nowEpoch = Math.floor(Date.now() / 1000);
    const nextHours = (data.forecast.forecastday[0]?.hour ?? [])
      .filter((hour) => hour.time_epoch >= nowEpoch)
      .slice(0, 3);
    const chanceOfRain = nextHours.length
      ? Math.max(...nextHours.map((hour) => hour.chance_of_rain))
      : null;

    const response = Response.json(
      {
        location: location.name,
        temperatureC: data.current.temp_c,
        feelsLikeC: data.current.feelslike_c,
        humidity: data.current.humidity,
        precipitationMm: data.current.precip_mm,
        chanceOfRain,
        condition: data.current.condition.text,
        conditionCode: data.current.condition.code,
        observedAt: data.current.last_updated,
      },
      { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=1800, stale-while-revalidate=3600' } },
    );

    if (cache) await cache.put(cacheKey, response.clone());
    return response;
  } catch {
    return Response.json(
      { error: 'No se pudieron obtener los datos meteorológicos.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
