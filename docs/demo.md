**演示与使用说明**

- **项目**: `mcp-auth-gateway`
- **目的**: 本文档说明如何本地运行并演示 OAuth 回调示例 (把 `oauthClient` 与 `tokenStore` 结合起来)、如何调用关键端点以及演示用例。

环境准备
- Node >= 18, 在项目根目录运行：

```bash
npm install
```

快速运行演示（无需构建）
- 使用内置 demo 脚本直接在 TypeScript 源上运行（开发/演示用）：

```bash
npm run start:demo
# 打开 http://localhost:4002/auth/ui
```

演示流程说明
- 打开 `http://localhost:4002/auth/ui`，会看到一个简单表单（Issuer URL、Client ID、Redirect URI、Server ID、Scopes）。
- 点击“Start OAuth” 或者直接访问 `/auth/start`（返回 JSON `{ url, state }`）。
- 模拟授权服务器（本仓库在测试中通过 Jest mock），点击或访问返回的 `url`（测试环境中 URL 为示例地址），授权后将回调 `/auth/callback?code=...&state=...`。
- 回调处理会触发 `OauthClient.handleCallback`（在测试中为模拟实现），并把得到的 `tokenSet` 保存到内存 `tokenStore`，使用 `server_id` 作为 key。

关键端点
- `GET /auth/ui` — 演示 HTML UI（仅示例）。
- `GET /auth/start?issuer=...&client_id=...&redirect_uri=...&server_id=...&scopes=...` — 返回 `{ url, state }`，并在服务器内存保存 `codeVerifier` 与 `serverId` 对应关系以便后续回调使用。
- `GET /auth/callback?code=...&state=...` — 处理回调并保存 `tokenSet` 至 `tokenStore`（示例返回 `{ ok: true, tokenSet }`）。
- `GET /health` — 健康检查。
- `POST /invoke` — 网关主入口（已在 `gatewayMcpServer` 中实现），会：
  - 验证 manifest（JWS）
  - 从 `tokenStore` 读取长期 token
  - 将长期 token 转换为短期 token（`tokenTransformer`）
  - 使用 `mcpClient` 调用下游

示例 curl（演示交互）
- 启动 demo 服务器后：

```bash
# 1) 发起授权，获取 redirect URL
curl "http://localhost:4002/auth/start?issuer=https://issuer.example&client_id=client&redirect_uri=http://localhost:4002/auth/callback&server_id=demo-srv&scopes=openid%20profile"

# 2) 模拟授权服务器完成回调（测试中为模拟）
curl "http://localhost:4002/auth/callback?code=thecode&state=mystate"

# 3) 检查 token 已保存（示例：通过调用应用的 debug endpoint 或查看日志）
```

注意事项与建议
- 当前 `tokenStore` 是内存实现，仅适用于 demo/测试；生产请替换为 Redis 或受管理的 Key-Value 存储，并加密存储内容与访问控制。
- 测试环境中 `openid-client` 已通过 Jest mock 在 `test/__mocks__/openid-client.js` 中隔离，生产/CI 请安装真实依赖：

```bash
npm install openid-client
```

- 若安装真实 `openid-client`，请移除仓库中的临时 `src/types/openid-client.d.ts`（或替换为更精确的类型声明）。

如何向他人演示
- 本地运行 `npm run start:demo`，打开 `http://localhost:4002/auth/ui`。
- 演示时说明关键点：PKCE（code_verifier/code_challenge）、state 防止 CSRF、如何持久化长期 token、如何把长期 token 转换为短期 token 并在下游使用。

运行测试
- 所有单元与集成测试通过（仓库包含 Jest 配置）：

```bash
npm test
```

后续改进（可选）
- 把 demo 脚本改为使用构建后的 `dist` 版本以更接近生产环境。
- 将 `tokenStore` 改写为注入式接口（便于替换为 Redis 实现）。
- 移除临时的 `src/types/openid-client.d.ts` 并使用真实 `openid-client` 类型定义。

如果你同意，我会把这个文档提交并推送到远程仓库。

管理端点（演示/运维）
--------------------------------

本工程已在 `gatewayMcpServer` 中加入简单的管理端点，用于演示如何查看与撤销会话。生产环境请为这些端点添加认证与访问控制（例如 `ADMIN_TOKEN` 环境变量或基于 OAuth 的管理接口）。

- `GET /admin/sessions` — 列出当前会话
  ```bash
  curl http://localhost:4002/admin/sessions
  ```

- `GET /admin/session/:id` — 获取单个会话详情
  ```bash
  curl http://localhost:4002/admin/session/<SESSION_ID>
  ```

- `POST /admin/revoke` — 撤销会话（请求 body: `{ "sessionId": "..." }`）
  ```bash
  curl -X POST http://localhost:4002/admin/revoke -H "Content-Type: application/json" -d '{"sessionId":"demo-srv"}'
  ```

示例（带简单管理令牌）
如果你在生产/演示环境中希望限制管理操作，可以在调用时添加 `Authorization: Bearer <ADMIN_TOKEN>` 头（当前实现未强制校验，但建议改造为在服务端检查 `ADMIN_TOKEN`）：

```bash
curl -H "Authorization: Bearer ${ADMIN_TOKEN}" http://localhost:4002/admin/sessions
```

这些端点方便你在演示时展示：
- 会话如何被创建（initialize → session 保存）
- 如何查看会话中的 `grantedScopes` / `accessToken` 占位信息
- 如何通过撤销动作立即使会话失效（演示 revoke 效果）

