import { McpClientManager } from '../../src/client/mcpClientManager';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('McpClientManager', () => {
  beforeEach(() => jest.resetAllMocks());

  test('registerServer and getClientFor', () => {
    const instance = { post: jest.fn().mockResolvedValue({ data: { ok: true } }) } as any;
    mockedAxios.create = jest.fn().mockReturnValue(instance);

    const mgr = new McpClientManager();
    mgr.registerServer('s1', { baseUrl: 'http://s1' });
    const client = mgr.getClientFor('s1');
    expect(client).not.toBeNull();
    expect(mgr.listServers()).toContain('s1');
  });

  test('removeServer', () => {
    const instance = { post: jest.fn().mockResolvedValue({ data: {} }) } as any;
    mockedAxios.create = jest.fn().mockReturnValue(instance);

    const mgr = new McpClientManager();
    mgr.registerServer('s2', { baseUrl: 'http://s2' });
    mgr.removeServer('s2');
    expect(mgr.getClientFor('s2')).toBeNull();
  });
});
