import crypto from 'crypto';

export type RequestSignature = {
  alg: string;
  kid?: string;
  ts: number;
  nonce: string;
  body_hash: string;
  signature: string;
};

export function createRequestSignature(body: any, privateKeyPem: string, kid?: string) : RequestSignature {
  const ts = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomBytes(12).toString('hex');
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body || {});
  const hash = crypto.createHash('sha256').update(bodyStr).digest('base64url');

  const toSign = `${ts}.${nonce}.${hash}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(toSign);
  sign.end();
  const signature = sign.sign(privateKeyPem, 'base64url');

  return { alg: 'RS256', kid, ts, nonce, body_hash: hash, signature };
}

export function simpleDpopProof(httpMethod: string, httpUrl: string, dpopKeyPem: string) {
  // Simplified DPoP-like proof: sign htm + htu + iat + jti
  const iat = Math.floor(Date.now() / 1000);
  const jti = crypto.randomBytes(8).toString('hex');
  const payload = { htm: httpMethod, htu: httpUrl, iat, jti };
  const toSign = JSON.stringify(payload);
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(toSign);
  sign.end();
  const signature = sign.sign(dpopKeyPem, 'base64url');
  return { proof: payload, signature };
}
// requestSigner.ts
// Host → Gateway / Gateway → MCP 请求签名（占位实现）

export function signRequest(req: any) {
  // TODO: 实现请求签名
  return req;
}
