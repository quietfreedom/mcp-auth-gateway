// tokenTransformer.ts
// 将长期 token 转换为短期、受限的下游 token（使用 jose 签名）

import { SignJWT, generateKeyPair, exportJWK } from 'jose';

let ephemeralKey: any = null;

async function ensureKey(): Promise<any> {
  if (!ephemeralKey) {
    ephemeralKey = await generateKeyPair('ES256');
  }
  return ephemeralKey;
}

export async function transformLongLivedToken(longToken: string, opts?: { audience?: string; expiresInSeconds?: number }) {
  const keyPair: any = await ensureKey();
  const pubJwk = await exportJWK(keyPair.publicKey);

  const expiresIn = opts?.expiresInSeconds ?? 60; // 默认 60s

  const jwt = await new SignJWT({ sub: 'transformed', src: longToken })
    .setProtectedHeader({ alg: 'ES256', jwk: pubJwk })
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .setAudience(opts?.audience ?? 'mcp-gateway')
    .sign(keyPair.privateKey);

  return { token: jwt, expiresIn, pubJwk };
}
