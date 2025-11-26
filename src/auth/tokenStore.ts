// tokenStore.ts
// 安全缓存 access/refresh token（占位实现）

const store = new Map<string, any>();

export function saveToken(key: string, token: any) {
  store.set(key, token);
}

export function getToken(key: string) {
  return store.get(key) || null;
}
