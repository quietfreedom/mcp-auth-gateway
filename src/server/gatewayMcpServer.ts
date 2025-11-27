// gatewayMcpServer.ts
// 简单的 HTTP RPC Server，把调用转发到 gatewayInvoker

import http from 'http';
import { invokeToolThroughGateway } from '../flow/gatewayInvoker';
import type { McpClientManager } from '../client/mcpClientManager';
import { listSessions, revokeSession, getSession } from '../session/sessionStore';

export interface GatewayServerOptions {
  port?: number;
  serverManager: McpClientManager;
}

export function startGatewayMcpServer(opts: GatewayServerOptions) {
  const port = opts.port ?? 3000;
  const serverManager = opts.serverManager;

  const srv = http.createServer(async (req, res) => {
    try {
      // admin: list sessions
      if (req.method === 'GET' && req.url === '/admin/sessions') {
        const rows = listSessions();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sessions: rows }));
        return;
      }

      // admin: revoke session (POST body { sessionId })
      if (req.method === 'POST' && req.url === '/admin/revoke') {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(Buffer.from(chunk));
        const raw = Buffer.concat(chunks).toString('utf8') || '{}';
        const body = JSON.parse(raw);
        const sid = body.sessionId;
        if (!sid) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'missing sessionId' }));
          return;
        }
        const ok = revokeSession(sid);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok }));
        return;
      }

      // admin: get session detail
      if (req.method === 'GET' && req.url && req.url.startsWith('/admin/session/')) {
        const sid = req.url.split('/').pop() || '';
        const rec = getSession(sid);
        if (!rec) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'not found' })); return; }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ session: rec }));
        return;
      }
      if (req.method === 'POST' && req.url === '/invoke') {
        // 收集 body
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(Buffer.from(chunk));
        const raw = Buffer.concat(chunks).toString('utf8') || '{}';
        const body = JSON.parse(raw);

        // body expected: { signedManifest, manifestVerifyOptions, toolPath, body }
        const signedManifest = body.signedManifest;
        const manifestVerifyOptions = body.manifestVerifyOptions;
        const toolPath = body.toolPath;
        const callBody = body.body;

        if (!signedManifest || !manifestVerifyOptions || !toolPath) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'missing required fields' }));
          return;
        }

        try {
          const out = await invokeToolThroughGateway({
            signedManifest,
            manifestVerifyOptions,
            serverManager,
            toolPath,
            body: callBody
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, result: out.res }));
        } catch (err: any) {
          // Demo fallback: if no client or token present, return a simulated response
          const msg = err?.message ?? String(err);
          if (msg.includes('no client registered') || msg.includes('no long-lived token')) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, result: { demo: true, message: msg } }));
            return;
          }
          throw err;
        }
        return;
      }

      // healthcheck
      if (req.method === 'GET' && req.url === '/health') {
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
