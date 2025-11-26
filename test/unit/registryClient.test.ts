import axios from 'axios';
import { fetchSignedManifest } from '../../src/manifest/registryClient';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('registryClient', () => {
  beforeEach(() => jest.resetAllMocks());

  test('fetchSignedManifest returns string body', async () => {
    mockedAxios.get.mockResolvedValue({ data: 'signed-jwt-string' } as any);

    const res = await fetchSignedManifest('http://example.com/manifest');
    expect(res).toBe('signed-jwt-string');
    expect(mockedAxios.get).toHaveBeenCalledWith('http://example.com/manifest', expect.objectContaining({ responseType: 'text' }));
  });

  test('fetchSignedManifest throws on empty url', async () => {
    await expect(fetchSignedManifest('' as any)).rejects.toThrow('Manifest URL is empty');
  });

  test('fetchSignedManifest throws when response not string', async () => {
    mockedAxios.get.mockResolvedValue({ data: { foo: 'bar' } } as any);
    await expect(fetchSignedManifest('http://example.com/manifest')).rejects.toThrow('Manifest response is not a string');
  });
});
