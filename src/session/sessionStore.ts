// sessionStore.ts
// 简单的会话存储：保存 session 元数据、granted_scopes、access_token/cnf、ttl、状态

export type SessionRecord = {
  sessionId: string;
  toolsetId?: string;
  manifest?: any;
  profile?: string;
  grantedScopes: string[];
  accessToken?: any;
  cnf?: any;
  createdAt: number;
  expiresAt?: number | null;
  revoked?: boolean;
};

const sessions = new Map<string, SessionRecord>();

export function createSession(record: Partial<SessionRecord> & { sessionId: string; grantedScopes?: string[] }, ttlSeconds?: number) {
  const now = Date.now();
  const expiresAt = ttlSeconds ? now + ttlSeconds * 1000 : null;
  const rec: SessionRecord = {
    sessionId: record.sessionId,
    toolsetId: record.toolsetId,
    manifest: record.manifest,
    profile: record.profile,
    grantedScopes: record.grantedScopes ?? [],
    accessToken: record.accessToken,
    cnf: record.cnf,
    createdAt: now,
    expiresAt,
    revoked: false
  };
  sessions.set(record.sessionId, rec);
  return rec;
}

export function getSession(sessionId: string) {
  const rec = sessions.get(sessionId);
  if (!rec) return null;
  if (rec.expiresAt && rec.expiresAt < Date.now()) {
    sessions.delete(sessionId);
    return null;
  }
  if (rec.revoked) return null;
  return rec;
}

export function listSessions() {
  const now = Date.now();
  const out: SessionRecord[] = [];
  for (const v of sessions.values()) {
    if (v.expiresAt && v.expiresAt < now) continue;
    out.push(v);
  }
  return out;
}

export function revokeSession(sessionId: string) {
  const rec = sessions.get(sessionId);
  if (!rec) return false;
  rec.revoked = true;
  sessions.set(sessionId, rec);
  return true;
}

export function clearExpiredSessions() {
  const now = Date.now();
  for (const [k, v] of sessions.entries()) {
    if (v.expiresAt && v.expiresAt < now) sessions.delete(k);
  }
}
