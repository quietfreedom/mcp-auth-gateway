3.1 Manifest 验证模块（Manifest Verifier）
职责：
● 从 Registry 拉取 Signed Manifest，验证开发者签名 + 平台签名，校验证书链；Medium+1
● 解析字段：
  ○ tool_id
  ○ MCP 端点 URI（将作为 OAuth Resource Indicator / audience）GitGuardian Blog
  ○ 支持的 scopes、允许的 redirect_uris（用于 OAuth 客户端注册）IETF Datatracker
  ○ MCP Server 的签名公钥（用于回调验签）。
● 将解析结果缓存，供 AuthZ&Policy 和 Callback Verifier 使用。
现实依据：
OWASP LLM Top10 将“Insecure LLM Supply Chain”视作主要风险，明确建议对插件/扩展使用签名机制和 SBOM 追踪。Checkmarx GitGuardian 也披露了 Smithery.ai 宿主的路径遍历漏洞曾经暴露了数千个 MCP server 与 API Key，说明工具供应链确实可能被整体攻陷，这直接证明 Signed Manifest + Registry 的必要性。GitGuardian Blog

3.2 授权与策略模块（AuthZ & Policy Engine）
职责：
● 将每个 MCP Server 映射为 OAuth 里的 Resource Server，配合 Resource Indicators 将 token 严格绑定到单个 server（aud/resource 字段）。GitGuardian Blog+1
● 与 AuthZ Server 使用 OAuth2.1 Authorization Code / Client Credentials 等标准授权模式：
  ○ User-scoped：授权访问用户数据（文件、GitHub 仓库等）；
  ○ System-scoped：工具自身访问公共或组织资源。GitGuardian Blog
● 强制使用 OAuth 2.1 推荐的安全配置：
  ○ 授权码 + PKCE、移除 implicit flow、严格校验 redirect_uri（防止回调劫持）。IETF Datatracker+1
● 根据 manifest 中声明的能力 + 本地策略（可以参考你原来的 profile 概念，但不用在协议层暴露），决定：
  ○ 允许工具使用哪些 grant type / scopes；
  ○ access token 最大过期时间；是否允许 refresh token；
  ○ 需要 HITL 的风险级别。
现实依据：
● OAuth2.1 草案本身就强调 sender-constrained token、严格 redirect URI、移除隐式授权等实践来防止 token 滥用与重定向攻击。IETF Datatracker
● GitGuardian 和 Curity 都建议在 MCP 里使用 Resource Indicators + 短生命周期 token，并把 refresh token 当作“王冠上的珠宝”严加保护，这与你的 “长生命周期 token 滥用” 问题完全对齐。GitGuardian Blog+1

3.3 请求保护模块（Request Protection: PoP + 签名）
职责：
● 对 Host → Gateway 的 MCP 请求做规范化（canonicalization），计算请求体哈希（method, path, headers, body）。
● 根据 OAuth 2.1 的 sender-constrained token 建议，优先使用：
  ○ DPoP：每次请求附带一个由客户端密钥签名的 JWK 证明，token 绑定到该密钥；IETF Datatracker+1
  ○ 或者 mTLS PoP：通过双向 TLS，把 token 绑定到 TLS 证书。Okta Developer+1
● 对发往 MCP Server 的请求附加：
  ○ mcp_authz.request_signature（含 nonce, timestamp, body_hash）；
  ○ PoP / mTLS 相关的 header；
  ○ 最小必要 scope 的 access token。
● 在入口验证 Host 的签名（区分“合法 Host 被 prompt 污染”和“纯伪造请求”），在出口只允许 Gateway 自己签名后的请求流向 MCP Server。
现实依据：
● PoP / DPoP 已被 IETF 正式标准化，用于防止 Bearer token 被窃取后在别处重放。IBM、Okta 等厂商的最佳实践都建议对高价值 API 使用 sender-constrained token。IBM+3IETF Datatracker+3OAuth社区+3
● OWASP API Security Top10 将 Broken Object Level Authorization / Excessive Data Exposure 列为核心风险，建议通过细粒度 scope 和请求级检查防止 API 被滥用。OWASP Foundation+1 Gateway 在 MCP 里承担的就是这一责任。

3.4 回调与撤销模块（Callback & Revocation）
职责：
● 强制所有 MCP Server 的 callback / streaming 链路使用在 manifest 中注册的回调端点，并通过服务器私钥对回调 payload 签名：
  ○ server_signature = Sign_k_server(hash(session_id, call_id, payload, nonce, timestamp))
● Gateway 验证：
  ○ 回调是否来自允许的 IP/mTLS 对端；
  ○ server_signature 是否和 manifest 中的公钥匹配；
  ○ nonce / timestamp 是否在时效内，防止重放。
● 对高风险 C 类操作（例如发交易、删文件）：
  ○ 在每次调用前通过 introspection 查询 token 状态；
  ○ 或按一定频率自动 introspection。
● 提供 authz.revoke 接口，让用户/Host 可以一键撤销某个会话或工具的所有权限，Gateway 调用 AuthZ Server 的 revocation endpoint，同时更新本地缓存。IETF Datatracker+1
现实依据：
● OAuth2.1 明确建议使用 revocation / introspection 端点实现 token 生命周期控制。IETF Datatracker
● JWT 自身不易撤销，GitGuardian 文章就强调必须 短生命周期 + 辅助撤销机制，否则一旦泄露将持续可利用。GitGuardian Blog
● ITPro 针对 MCP 的安全分析指出，目前大量 MCP Server 配置不当，可能成为 Token 泄露与滥用的集中点，而没有统一回调与撤销逻辑的体系很难追踪问题。你的 Gateway 方案正好补上这块“统管”的空白。IT Pro