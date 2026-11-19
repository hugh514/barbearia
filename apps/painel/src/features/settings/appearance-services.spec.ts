import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAppearance, saveAppearance, NO_CONFIG_MESSAGE } from './appearance-services';

const fetchMock = vi.fn();

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('appearance-services', () => {
  it('lê do GET /channels/config/appearance', async () => {
    fetchMock.mockResolvedValue(
      json(200, { businessName: 'Modelo', brandColor: '#1F4FB8', themeMode: 'light' }),
    );
    const a = await getAppearance();
    expect(fetchMock.mock.calls[0][0]).toBe('/api/channels/config/appearance');
    expect(a.businessName).toBe('Modelo');
  });

  it('salva por PATCH /channels/config só com cor e modo', async () => {
    fetchMock.mockResolvedValue(json(200, { brandColor: '#6e1f2a', themeMode: 'dark' }));
    await saveAppearance({ brandColor: '#6e1f2a', themeMode: 'dark' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/channels/config');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ brandColor: '#6e1f2a', themeMode: 'dark' });
  });

  it('sem configuração (404) pede para salvar os dados da barbearia', async () => {
    fetchMock.mockResolvedValue(json(404, { statusCode: 404, message: 'Not Found', error: 'Not Found' }));
    await expect(saveAppearance({ brandColor: '#6e1f2a', themeMode: 'dark' })).rejects.toThrow(
      NO_CONFIG_MESSAGE,
    );
  });
});
