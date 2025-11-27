快速集成指南

目的: 本文档说明如何将 MCP-Auth Gateway 与 OAuth/OIDC 提供方和 MCP 后端系统对接，用于演示与开发环境。

运行前提:
  - Node.js >= 18
  - 在项目根目录运行: `npm install`
  - 启动演示服务器: `npm run start:demo`（监听 `http://localhost:4002`）

重要环境变量 (开发/演示):
  - `PORT` - 网关端口（默认 4001）
  - `DEMO_CALLBACK_PORT` - OAuth callback demo 端口（默认 4002）
  - `GATEWAY_PRIVKEY_PEM` - 可选: 用于签名 `request_signature` 的私钥 PEM 文本（不在生产使用明文）

向 OAuth 提供方注册:
  - `redirect_uri` 请注册为: `http://localhost:4002/auth/callback`
  - scopes: `openid profile`（根据需要扩展）
  - client type: Confidential 或 Public（demo 中使用简化流程）

Manifest 验证（JWKS）:
  - MCP 工具清单为一个签名 JWS/JWT，包含工具信息和（可选）后端公钥（用于回调验证）。
  - 将清单发布到可访问的 URL 并在调用端提供给 `gatewayInvoker`（代码中 `registryClient` 会拉取并 `verifier` 验证）。

演示流程:
  1. 打开演示 UI: `web/index.html`（使用静态服务器或直接在浏览器打开）
  2. 在页面输入 `Issuer`, `Client ID`, `Redirect URI`（默认 `http://localhost:4002/auth/callback`）等信息
  3. 点击 `Start OAuth`，项目会调用 demo callback service 的 `/auth/start` 并重定向到授权端（demo 为简单演示）
  4. 点击 `Simulate Callback` 在 demo 中直接调用 `/auth/callback`，token 会被保存至内存 `tokenStore`
  5. 管理员可通过 `/admin/sessions` 查看会话，通过 `/admin/revoke` 撤销

在网关中调用下游 MCP 服务:
  - 用例: 网关需要代表用户调用 MCP 后端服务
  - 步骤: `gatewayInvoker` 会验证工具清单（manifest），从 `tokenStore` 获取长时效 token，执行 `tokenTransformer` 生成短时效 token，然后将请求发送到下游。
  - 可选: 网关对外请求会添加 `request_signature`（使用 `GATEWAY_PRIVKEY_PEM`）或 DPoP 证明（在 `dpop` helper 中）。

生产建议（重要）:
  - 将 `tokenStore` 与 `sessionStore` 替换为持久化存储（Redis / DB），并实现过期/回收策略。
  - 使用安全的 KMS（如 AWS KMS / Azure Key Vault）保存私钥并进行签名操作，不要将私钥放在环境变量中。
  - 对 `/admin/*` 接口启用强认证（mTLS / API key / OAuth with required scopes）。
  - 使用 `jose` 库全面实现 JWS/DPoP（替换 demo 中的简化实现），严格验证 JWT claims（iss/aud/exp/nbf/iat/jti）。
  - 在网关加入请求速率限制、审计日志以及异常告警。

常见调试命令:
  - 启动 demo callback server: `npm run start:demo`
  - 运行测试: `npm test`
  - 查看会话: `curl http://localhost:4002/admin/sessions`

示例 curl:
  - 列表会话: `curl http://localhost:4002/admin/sessions`
  - 撤销会话: `curl -X POST http://localhost:4002/admin/revoke -H "Content-Type: application/json" -d '{"id":"session-id"}'`

下一步:
  - 若需我将 `tokenStore` 与 `sessionStore` 切换为 Redis，并把私钥调用改为 KMS，请确认我继续实施。
