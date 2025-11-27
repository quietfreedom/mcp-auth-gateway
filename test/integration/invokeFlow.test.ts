import { McpClientManager } from '../../src/client/mcpClientManager';
import { saveToken } from '../../src/auth/tokenStore';
import { invokeToolThroughGateway } from '../../src/flow/gatewayInvoker';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('invoke flow integration', () => {
  beforeEach(() => jest.resetAllMocks());

  test('full flow: verify manifest -> transform token -> call downstream', async () => {
    // 1. 准备下游 client
    const instance = { post: jest.fn().mockResolvedValue({ data: { ok: true } }) } as any;
    mockedAxios.create = jest.fn().mockReturnValue(instance);

    const mgr = new McpClientManager();
    mgr.registerServer('github', { baseUrl: 'http://github.example' });

    // 2. 存储长期 token
    saveToken('github', 'long-lived-secret-token');

    // 3. 生成签名 manifest（tool manifest 的 serverId 必须为 'github'）
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

    // 4. 调用 gatewayInvoker
    const out = await invokeToolThroughGateway({
      signedManifest: signed,
      manifestVerifyOptions: { jwks: { keys: [pubJwk] }, audience: 'aud', issuer: 'issuer' },
      serverManager: mgr,
      toolPath: 'doThing',
      body: { x: 1 }
    });

    expect(instance.post).toHaveBeenCalledWith('/call/doThing', { x: 1 }, expect.objectContaining({ headers: expect.any(Object) }));
    const lastHeaders = (instance.post as jest.Mock).mock.calls[0][2].headers;
    expect(lastHeaders.Authorization).toMatch(/^Bearer\s+/);
    expect(out.res).toEqual({ ok: true });
  });
});
