// src/manifest/types.ts

export interface ToolManifest {
  /** 在整个 Gateway 系统中的唯一工具标识，例如 "github.issues" */
  toolId: string;

  /** 下游 MCP Server 的标识，例如 "github" */
  serverId: string;

  title: string;
  description?: string;

  /** 工具声明的能力（业务语义），例如 ["read:issue", "write:issue"] */
  capabilities: string[];

  /** 对应 OAuth 所需的 scopes，例如 ["repo:read", "repo:write"] */
  oauthScopes: string[];

  /**
   * OAuth 2 Resource Indicator / audience，用于将 token 绑定到具体资源服务器
   * 例如 "https://api.github.com/" 或某个内部 API 网关的标识
   */
  resourceIndicator?: string;

  /**
   * MCP Server 用来对回调 / 结果消息签名的公钥（JWK 格式）
   * 用于 Gateway callback 验签
   */
  serverPublicKeyJwk: unknown;

  /**
   * 可扩展字段，外包方实现时禁止在这里塞业务逻辑标识，
   * 如需扩展请显式添加字段并在文档中说明
   */
  [extra: string]: unknown;
}

/**
 * 原始 JWS/JWT payload 结构：
 * - iss / aud / exp 等为标准 JWT claim，用于供应链完整性检查
 * - manifest 包含真正的工具信息
 */
export interface RawManifestPayload {
  iss: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  jti?: string;

  manifest: ToolManifest;
}
