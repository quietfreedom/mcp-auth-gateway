// tokenStore.ts
// 简单的内存 token 存储，支持 TTL（可替换为 Redis/Keyv）

type TokenRecord = {
  value: any;
  expiresAt?: number | null;
};

const store = new Map<string, TokenRecord>();

export function saveToken(key: string, token: any, ttlSeconds?: number) {
  const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
  store.set(key, { value: token, expiresAt });
}

export function getToken(key: string) {
  const rec = store.get(key);
  if (!rec) return null;
  if (rec.expiresAt && rec.expiresAt < Date.now()) {
    store.delete(key);
    return null;
  }
  return rec.value;
}

export function deleteToken(key: string) {
  store.delete(key);
}

export function clearExpired() {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (v.expiresAt && v.expiresAt < now) store.delete(k);
  }
}
