import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { verifyAndParseManifest } from '../../src/manifest/verifier';
import type { ToolManifest } from '../../src/manifest/type';

describe('manifest verifier', () => {
  test('verifyAndParseManifest accepts valid signed manifest', async () => {
    // 生成 RSA 密钥对用于签名
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const pubJwk = await exportJWK(publicKey);
    pubJwk.kid = 'test-key';

    const manifest: ToolManifest = {
      toolId: 'test.tool',
      serverId: 'test-server',
      title: 'Test Tool',
      description: 'A test tool manifest',
      capabilities: ['read'],
      oauthScopes: ['scope:read'],
      serverPublicKeyJwk: pubJwk
    };

    const payload = { manifest };

    const signed = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer('test-issuer')
      .setAudience('test-audience')
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(privateKey);

    const jwks = { keys: [pubJwk] };

    const parsed = await verifyAndParseManifest(signed, { jwks, audience: 'test-audience', issuer: 'test-issuer' });

    expect(parsed.toolId).toBe(manifest.toolId);
    expect(parsed.serverId).toBe(manifest.serverId);
    expect(parsed.capabilities).toEqual(expect.arrayContaining(['read']));
  });

  test('verifyAndParseManifest throws on missing manifest field', async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const pubJwk = await exportJWK(publicKey);
    pubJwk.kid = 'k1';

    const signed = await new SignJWT({ foo: 'bar' } as any)
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer('iss')
      .setAudience('aud')
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(privateKey);

    const jwks = { keys: [pubJwk] };

    await expect(verifyAndParseManifest(signed, { jwks })).rejects.toThrow("Manifest payload missing 'manifest' field");
  });
});
