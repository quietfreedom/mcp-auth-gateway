// callbackServer.ts
// OAuth 授权回调 / healthcheck HTTP 服务（占位实现）

// callbackServer.ts
// OAuth 授权回调 / healthcheck HTTP 服务 (实现完整 OAuth 启动与回调示例)

import http from 'http';
import { URL } from 'url';
import { OauthClient, type OauthClientConfig } from '../auth/oauthClient';
import { saveToken } from '../auth/tokenStore';

type PendingAuth = {
  codeVerifier: string;
  serverId: string;
  clientConfig: OauthClientConfig;
};

const pending = new Map<string, PendingAuth>();

export function startCallbackServer(opts?: { port?: number }) {
  const port = opts?.port ?? 3001;

  const srv = http.createServer(async (req, res) => {
    try {
      const u = new URL(req.url ?? '', `http://localhost:${port}`);

      // UI: simple guide page
      if (req.method === 'GET' && u.pathname === '/auth/ui') {
        const html = `
          <html>
            <body>
              <h3>MCP Gateway OAuth Demo</h3>
              <p>Use the form to start an OAuth flow (for demo only).</p>
              <form action="/auth/start" method="get">
                <label>Issuer URL: <input name="issuer" value="https://example-issuer/"/></label><br/>
                <label>Client ID: <input name="client_id" value="client-id"/></label><br/>
                <label>Redirect URI: <input name="redirect_uri" value="http://localhost:${port}/auth/callback"/></label><br/>
                <label>Server ID (store key): <input name="server_id" value="demo-server"/></label><br/>
                <label>Scopes: <input name="scopes" value="openid profile"/></label><br/>
                <button type="submit">Start OAuth</button>
              </form>
            </body>
          </html>
        `;
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
        return;
      }

      // Start OAuth: returns JSON with redirect URL and state
      if (req.method === 'GET' && u.pathname === '/auth/start') {
        const issuer = u.searchParams.get('issuer') ?? u.searchParams.get('issuer_url');
        const clientId = u.searchParams.get('client_id');
        const redirectUri = u.searchParams.get('redirect_uri');
        const serverId = u.searchParams.get('server_id') ?? 'default';
        const scopesRaw = u.searchParams.get('scopes') ?? 'openid';
        const scopes = scopesRaw.split(/\s+/).filter(Boolean);

        if (!issuer || !clientId || !redirectUri) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'issuer, client_id and redirect_uri are required' }));
          return;
        }

        // Demo fallback: if issuer looks like a demo placeholder, skip discovery and openid-client
        if (typeof issuer === 'string' && issuer.includes('issuer.example')) {
          const codeVerifier = Math.random().toString(36).slice(2) + Date.now().toString(36);
          const state = 'demo-' + Math.random().toString(36).slice(2);
          pending.set(state, { codeVerifier, serverId, clientConfig: { issuerUrl: issuer, clientId, redirectUri } });
          const url = `${redirectUri}?state=${encodeURIComponent(state)}&code=demo-code`;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ url, state }));
          return;
        }

        const cfg: OauthClientConfig = { issuerUrl: issuer, clientId, clientSecret: undefined, redirectUri };
        const oc = new OauthClient(cfg);
        await oc.init();
        const { url, codeVerifier, state } = oc.generateAuthorizationUrl(scopes);

        // store pending
        pending.set(state, { codeVerifier, serverId, clientConfig: cfg });

        // For demo we return JSON with redirect url
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ url, state }));
        return;
      }

      // Callback: exchange code for token and save into tokenStore under serverId
      if (req.method === 'GET' && u.pathname === '/auth/callback') {
        const code = u.searchParams.get('code');
        const state = u.searchParams.get('state');

        if (!state) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'missing state' }));
          return;
        }

        const p = pending.get(state);
        if (!p) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'unknown state' }));
          return;
        }

        // Demo fallback: if the stored clientConfig issuer is a demo placeholder, skip real callback handling
        const clientCfg = p.clientConfig as OauthClientConfig | undefined;
        if (clientCfg && clientCfg.issuerUrl && clientCfg.issuerUrl.includes('issuer.example')) {
          const tokenSet = {
            access_token: 'demo-access-token-' + Math.random().toString(36).slice(2),
            token_type: 'Bearer',
            expires_in: 3600,
            scope: (clientCfg as any).scopes || 'openid profile'
          };
          saveToken(p.serverId, tokenSet as any);
          pending.delete(state);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, tokenSet }));
          return;
        }

        // Recreate OauthClient from stored config
        const oc = new OauthClient(p.clientConfig);
        await oc.init();

        // Simulate reading query params into params object (openid-client expects a full params object)
        const params: Record<string, string> = {};
        for (const [k, v] of u.searchParams.entries()) params[k] = v;

        const tokenSet = await oc.handleCallback(params, p.codeVerifier);

        // Save full tokenSet under serverId
        saveToken(p.serverId, tokenSet);

        pending.delete(state);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, tokenSet }));
        return;
      }

      // health
      if (req.method === 'GET' && u.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }

      res.writeHead(404);
      res.end('not found');
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err?.message ?? String(err) }));
    }
  });

  srv.listen(port);

  return {
    server: srv,
    url: `http://localhost:${port}`,
    stop: () => new Promise<void>((resolve, reject) => srv.close((e) => (e ? reject(e) : resolve())))
  };
}
