import { startGatewayMcpServer } from '../../src/server/gatewayMcpServer';
import { McpClientManager } from '../../src/client/mcpClientManager';
import { saveToken } from '../../src/auth/tokenStore';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('gateway server integration', () => {
  let server: any;

  beforeEach(() => jest.resetAllMocks());
  afterEach(async () => {
    if (server) await server.stop();
    server = null;
  });

  test('POST /invoke routes to gatewayInvoker and returns result', async () => {
    const instance = { post: jest.fn().mockResolvedValue({ data: { ok: true } }) } as any;
    mockedAxios.create = jest.fn().mockReturnValue(instance);

    const mgr = new McpClientManager();
    mgr.registerServer('github', { baseUrl: 'http://github.example' });

    saveToken('github', 'long-lived-secret-token');

    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const pubJwk = await exportJWK(publicKey);
    pubJwk.kid = 'k1';

    const manifest = {
      toolId: 'test.tool',
      serverId: 'github',
      title: 'Test',
      capabilities: ['read'],
      oauthScopes: ['scope:read'],
      serverPublicKeyJwk: pubJwk
    };

    const signed = await new SignJWT({ manifest })
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer('issuer')
      .setAudience('aud')
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(privateKey as any);

    server = startGatewayMcpServer({ port: 0, serverManager: mgr });
    // get actual port
    const address: any = (server.server.address && server.server.address()) || server.server.address();
    const port = address.port || address;
    const url = `http://localhost:${port}/invoke`;

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signedManifest: signed,
        manifestVerifyOptions: { jwks: { keys: [pubJwk] }, audience: 'aud', issuer: 'issuer' },
        toolPath: 'doThing',
        body: { x: 1 }
      })
    });
    const resp = await r.json();

    expect(resp).toMatchObject({ ok: true, result: { ok: true } });
    expect(instance.post).toHaveBeenCalled();
  });
});
