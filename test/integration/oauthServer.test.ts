import { startCallbackServer } from '../../src/http/callbackServer';
import { getToken } from '../../src/auth/tokenStore';

jest.mock('openid-client', () => {
  const generators = {
    codeVerifier: () => 'codever',
    codeChallenge: (_: string) => 'challenge',
    state: () => 'mystate'
  };

  class Client {
    cfg: any;
    constructor(cfg: any) {
      this.cfg = cfg;
    }
    authorizationUrl(opts: any) {
      return `https://auth.example/authorize?state=${opts.state}`;
    }
    async callback(_redirectUri: string, _params: any, _checks: any) {
      return { access_token: 'at', refresh_token: 'rt', id_token: 'id', expires_in: 3600 };
    }
    async refresh(_rt: string) {
      return { access_token: 'new-at' };
    }
  }

  const Issuer = { discover: async (_: string) => ({ Client }) };
  return { Issuer, generators };
});

describe('callbackServer OAuth flow', () => {
  let srv: any;

  beforeAll(() => {
    srv = startCallbackServer({ port: 4002 });
  });

  afterAll(async () => {
    await srv.stop();
  });

  test('start returns redirect url and callback saves token', async () => {
    const base = srv.url;

    const startRes = await fetch(
      `${base}/auth/start?issuer=https://issuer.example&client_id=cid&redirect_uri=http://localhost:4002/auth/callback&server_id=test-srv&scopes=openid%20profile`
    );
    expect(startRes.status).toBe(200);
    const startJson = await startRes.json();
    expect(startJson.state).toBe('mystate');
    expect(startJson.url).toContain('https://auth.example/authorize');

    const cbRes = await fetch(`${base}/auth/callback?code=thecode&state=${startJson.state}`);
    expect(cbRes.status).toBe(200);
    const cbJson = await cbRes.json();
    expect(cbJson.ok).toBe(true);
    expect(cbJson.tokenSet.access_token).toBe('at');

    const stored = getToken('test-srv');
    expect(stored).not.toBeNull();
    expect(stored.access_token).toBe('at');
  });
});
