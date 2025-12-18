// src/manifest/cache.ts

import type { ToolManifest } from "./type";

interface CacheEntry {
  manifest: ToolManifest;
  fetchedAt: number;
}

const manifestCache: Map<string, CacheEntry> = new Map();

/**
 * 根据 serverId + toolId 拼接缓存 key
 */
function makeKey(serverId: string, toolId: string): string {
  return `${serverId}::${toolId}`;
}

/**
 * 写入缓存
 */
export function setManifestToCache(
  serverId: string,
  toolId: string,
  manifest: ToolManifest
): void {
  const key = makeKey(serverId, toolId);
  manifestCache.set(key, {
    manifest,
    fetchedAt: Date.now()
  });
}

/**
 * 从缓存读取 Manifest
 * @param maxAgeMs 最大允许年龄（毫秒），超出返回 undefined
 */
export function getManifestFromCache(
  serverId: string,
  toolId: string,
  maxAgeMs?: number
): ToolManifest | undefined {
  const key = makeKey(serverId, toolId);
  const entry = manifestCache.get(key);
  if (!entry) return undefined;

  if (typeof maxAgeMs === "number") {
    const age = Date.now() - entry.fetchedAt;
    if (age > maxAgeMs) {
      manifestCache.delete(key);
      return undefined;
    }
  }

  return entry.manifest;
}

/**
 * 按 serverId 列出该 server 下的所有 manifest（方便 tools/list 聚合）
 */
export function listManifestsByServer(serverId: string): ToolManifest[] {
  const result: ToolManifest[] = [];
  for (const [key, entry] of manifestCache.entries()) {
    if (key.startsWith(`${serverId}::`)) {
      result.push(entry.manifest);
    }
  }
  return result;
}

/**
 * 清空缓存（测试用）
 */
export function clearManifestCache(): void {
  manifestCache.clear();
}
