// src/manifest/verifier.ts

import {
  createLocalJWKSet,
  jwtVerify,
  type JWTPayload,
  type JSONWebKeySet,
  type KeyLike
} from "jose";
import type { RawManifestPayload, ToolManifest } from "./type";

/**
 * 验签所需的选项：
 * - jwks：Registry 的 JWKS（推荐）
 * - audience：期望的 aud 值（可选，但建议配置）
 * - issuer：期望的 iss 值（可选，但建议配置）
 */
export interface ManifestVerificationOptions {
  jwks: JSONWebKeySet | KeyLike | KeyLike[];
  audience?: string | string[];
  issuer?: string;
}

/**
 * 验证 Signed Manifest 的签名与基本 JWT Claim，
 * 并解析出内部使用的 ToolManifest 结构。
 *
 * @param jws - 来自 Registry 的 Signed Manifest（JWS/JWT）
 * @param options - 验证选项（包含 jwks / audience / issuer）
 */
export async function verifyAndParseManifest(
  jws: string,
  options: ManifestVerificationOptions
): Promise<ToolManifest> {
  const { jwks, audience, issuer } = options;

  const keySet = Array.isArray(jwks) || isKeyLike(jwks)
    ? jwks
    : createLocalJWKSet(jwks);

  const verifyOptions: {
    audience?: string | string[];
    issuer?: string;
  } = {};
  if (audience) verifyOptions.audience = audience;
  if (issuer) verifyOptions.issuer = issuer;

  const { payload } = await jwtVerify(jws, keySet as any, verifyOptions);
  const raw = payload as unknown as RawManifestPayload;

  // 基本字段校验：manifest 必须存在，且包含最小字段集
  if (!raw.manifest) {
    throw new Error("Manifest payload missing 'manifest' field");
  }

  const manifest = raw.manifest;

  if (!manifest.toolId || !manifest.serverId) {
    throw new Error("Manifest missing required fields 'toolId' or 'serverId'");
  }

  if (!Array.isArray(manifest.capabilities)) {
    throw new Error("Manifest 'capabilities' must be an array");
  }

  if (!Array.isArray(manifest.oauthScopes)) {
    throw new Error("Manifest 'oauthScopes' must be an array");
  }

  if (!manifest.serverPublicKeyJwk) {
    throw new Error("Manifest missing 'serverPublicKeyJwk'");
  }

  return manifest;
}

/**
 * 简单的 KeyLike 类型判断，避免类型系统抱怨
 */
function isKeyLike(obj: unknown): obj is KeyLike {
  return !!obj && typeof obj === "object" && "type" in (obj as any);
}
