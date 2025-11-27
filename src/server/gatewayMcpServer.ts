// gatewayMcpServer.ts
// 简单的 HTTP RPC Server，把调用转发到 gatewayInvoker

import http from 'http';
import { invokeToolThroughGateway } from '../flow/gatewayInvoker';
import type { McpClientManager } from '../client/mcpClientManager';

export interface GatewayServerOptions {
  port?: number;
  serverManager: McpClientManager;
}

export function startGatewayMcpServer(opts: GatewayServerOptions) {
  const port = opts.port ?? 3000;
  const serverManager = opts.serverManager;

  const srv = http.createServer(async (req, res) => {
    try {
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

        const out = await invokeToolThroughGateway({
          signedManifest,
          manifestVerifyOptions,
          serverManager,
          toolPath,
          body: callBody
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, result: out.res }));
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
