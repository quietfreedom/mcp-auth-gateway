import { transformLongLivedToken } from '../../src/auth/tokenTransformer';

describe('tokenTransformer', () => {
  test('transforms token and returns jwt', async () => {
    const res = await transformLongLivedToken('longsecret', { audience: 'aud', expiresInSeconds: 2 });
    expect(res.token).toBeTruthy();
    expect(res.pubJwk).toBeTruthy();
  });
});
