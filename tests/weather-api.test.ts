import { describe, expect, it } from 'vitest';
import { onRequest } from '../functions/api/weather';

describe('GET /api/weather', () => {
  it('rechaza localidades fuera de la lista permitida', async () => {
    const response = await onRequest({
      request: new Request('https://qsk.test/api/weather?location=desconocida'),
      env: {},
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Localidad no válida.' });
  });

  it('indica que falta configurar el proveedor sin exponer secretos', async () => {
    const response = await onRequest({
      request: new Request('https://qsk.test/api/weather?location=lanus'),
      env: {},
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'El servicio meteorológico todavía no está configurado.',
    });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
