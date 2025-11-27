import axios from 'axios';
import { createMcpClient } from '../../src/client/mcpClientFactory';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('mcpClientFactory', () => {
  beforeEach(() => jest.resetAllMocks());

  test('createMcpClient.request calls axios', async () => {
    const fakeRes = { data: { ok: true } } as any;
    const instance = { post: jest.fn().mockResolvedValue(fakeRes), get: jest.fn().mockResolvedValue(fakeRes) } as any;
    mockedAxios.create = jest.fn().mockReturnValue(instance);

    const client = createMcpClient({ baseUrl: 'http://example' });
    const res = await client.request('/x', { method: 'post', data: { a: 1 } });
    expect(res).toEqual({ ok: true });
    expect(instance.post).toHaveBeenCalledWith('/x', { a: 1 }, expect.any(Object));
  });

  test('callTool posts to /call/<tool>', async () => {
    const fakeRes = { data: { result: 42 } } as any;
    const instance = { post: jest.fn().mockResolvedValue(fakeRes) } as any;
    mockedAxios.create = jest.fn().mockReturnValue(instance);

    const client = createMcpClient({ baseUrl: 'http://example' });
    const res = await client.callTool('doThing', { x: 1 });
    expect(res).toEqual({ result: 42 });
    expect(instance.post).toHaveBeenCalledWith('/call/doThing', { x: 1 }, expect.any(Object));
  });
});
