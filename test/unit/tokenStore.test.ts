import { saveToken, getToken, deleteToken } from '../../src/auth/tokenStore';

describe('tokenStore', () => {
  test('save and get token without ttl', () => {
    saveToken('k1', { a: 1 });
    expect(getToken('k1')).toEqual({ a: 1 });
  });

  test('save token with ttl expires', async () => {
    saveToken('k2', { b: 2 }, 1);
    expect(getToken('k2')).toEqual({ b: 2 });
    await new Promise((r) => setTimeout(r, 1100));
    expect(getToken('k2')).toBeNull();
  });

  test('delete token', () => {
    saveToken('k3', { c: 3 });
    deleteToken('k3');
    expect(getToken('k3')).toBeNull();
  });
});
