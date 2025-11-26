// dpop.ts
// 生成 DPoP 证明（DPoP: Demonstration of Proof-of-Possession）

import { generateKeyPair, SignJWT, exportJWK } from 'jose';

export async function createDpopKeyPair() {
  const kp: any = await generateKeyPair('ES256');
  const pub = await exportJWK(kp.publicKey);
  return { privateKey: kp.privateKey, publicJwk: pub };
}

export async function generateDpopProof(privateKey: any, htu: string, htm: string) {
  // DPoP 是一个小的 JWS，typ: 'dpop+jwt'，payload 包含 htu/htm/iAt/jti
  const jwt = await new SignJWT({ htu, htm })
    .setProtectedHeader({ typ: 'dpop+jwt', alg: 'ES256' })
    .setIssuedAt()
    .setJti(cryptoRandomString())
    .sign(privateKey as any);

  return jwt;
}

function cryptoRandomString() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
