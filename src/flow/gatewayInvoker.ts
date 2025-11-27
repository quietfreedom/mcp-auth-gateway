// gatewayInvoker.ts
// 集成 Auth 与 Client 的调用桥接：
// - 验证 Signed Manifest
// - 从 tokenStore 获取长期 token
// - 使用 tokenTransformer 创建短期下游 token
// - 调用下游 MCP Server（通过 McpClientManager 提供的 client）

import { verifyAndParseManifest, type ManifestVerificationOptions } from '../manifest/verifier';
import { McpClientManager } from '../client/mcpClientManager';
import { getToken } from '../auth/tokenStore';
import { transformLongLivedToken } from '../auth/tokenTransformer';
import { createRequestSignature } from '../security/requestSigner';
import { getSession, createSession } from '../session/sessionStore';
import fs from 'fs';

export interface InvokeOptions {
  signedManifest: string;
  manifestVerifyOptions: ManifestVerificationOptions;
  serverManager: McpClientManager;
  toolPath: string;
  body?: any;
}

export async function invokeToolThroughGateway(opts: InvokeOptions) {
  const { signedManifest, manifestVerifyOptions, serverManager, toolPath, body } = opts;

  // 1. 验证并解析 manifest
  const manifest = await verifyAndParseManifest(signedManifest, manifestVerifyOptions);

  const serverId = (manifest as any).serverId;
  const client = serverManager.getClientFor(serverId);
  if (!client) throw new Error(`no client registered for server ${serverId}`);

  // 2. 获取长期 token（示例：以 serverId 存储的长期 token）
  const longToken = getToken(serverId);
  if (!longToken) throw new Error(`no long-lived token found for server ${serverId}`);

  // 3. 将长期 token 转换为短期下游 token
  const transformed = await transformLongLivedToken(longToken, { audience: manifest.resourceIndicator ?? serverId, expiresInSeconds: 60 });
  const shortToken = transformed.token;

  // 4. 计算 request signature 并调用下游（在 header 中传递 Authorization: Bearer <shortToken>）
  // 若存在会话则使用会话 id，否则创建临时 session
  const mf: any = manifest as any;
  const sessionId: string = (mf.sessionId as string) ?? `sess-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  // create session if not exists
  let sess = getSession(sessionId);
  if (!sess) {
    createSession({
      sessionId,
      toolsetId: mf.toolsetId as string | undefined,
      manifest: mf,
      profile: mf.profile as string | undefined,
      grantedScopes: (mf.scopes ?? mf.oauthScopes ?? []) as string[]
    }, 3600);
    sess = getSession(sessionId)!;
  }

  // load gateway private key if available (for demo use a generated key file optional)
  let privKey = process.env.GATEWAY_PRIVKEY_PEM;
  try {
    if (!privKey && fs.existsSync('gateway_key.pem')) privKey = fs.readFileSync('gateway_key.pem', 'utf8');
  } catch (e) { /* ignore */ }

  const reqSig = privKey ? createRequestSignature({ method: 'tools/call', toolPath, body }, privKey, 'gateway-demo-kid') : undefined;
  const headers: Record<string,string> = { Authorization: `Bearer ${shortToken}` };
  if (reqSig) headers['x-request-signature'] = JSON.stringify(reqSig);

  const res = await client.callTool(toolPath, body, headers);

  return { res, manifest, shortToken, pubJwk: transformed.pubJwk };
}
