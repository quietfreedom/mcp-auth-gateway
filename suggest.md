## 一、MCP-AuthZ 总体时序图（从用户到外部资源）
参与方：

+ **U**：User 用户
+ **H**：Host / LLM（IDE、Chat 应用）
+ **C**：MCP Client（实现 MCP JSON-RPC 的客户端）
+ **G**：MCP-Auth Gateway（你的创新点）
+ **MA**：Manifest Authority / Registry（工具“身份证”中心）
+ **AZ**：AuthZ Server（OAuth / 企业 IAM）
+ **S**：MCP Server（真实工具实现）
+ **R**：External Resource（Google API / GitHub / 企业内部服务等）

下面这张图分 4 个阶段：  
1）初始化 + 授权协商  
2）工具调用（请求级校验 + 最小权限）  
3）回调 / 通知（可选）  
4）撤销 / 检查（revoke & introspection）

```plain
sequenceDiagram
    participant U as 用户 U
    participant H as Host / LLM
    participant C as MCP Client
    participant G as MCP-Auth Gateway
    participant MA as Manifest Authority
    participant AZ as AuthZ Server (OAuth)
    participant S as MCP Server
    participant R as 外部资源 API

    %% ========== 1. 初始化 + 授权协商 ==========
    U->>H: 1. 提出任务（例如：查看今天日程）
    H->>C: 2. 需要使用工具集合 T（如 com.example.calendar）
    C->>G: 3. initialize(T, mcp_authz.hint)
    Note right of C: mcp_authz.hint 中可包含：<br/>toolset_id, requested_profile, user.subject

    G->>MA: 3.1 获取并验证 T 的 Signed Manifest
    MA-->>G: 3.2 返回 manifest + 签名验证通过
    Note right of G: 验证工具身份、开发者、能力声明<br/>确定工具的最低安全级别（profile_min）

    G->>AZ: 3.3 authz.request(toolset_id, profile, requested_scopes, user)
    AZ-->>G: 3.4 authz.grant(access_token, granted_scopes, cnf, ttl)
    Note right of G: 生成会话：session_id + profile + granted_scopes<br/>access_token 仅在 G↔S 链路中使用

    G->>S: 3.5 转发 initialize（附带 mcp_authz.session）
    S-->>G: 3.6 返回 initialized（serverInfo, capabilities）

    G-->>C: 4. initialized（附带 mcp_authz.session_id, profile）
    C-->>H: 5. 告知 Host：工具集合 T 已就绪，可被 LLM 使用

    %% ========== 2. 工具调用（单次调用） ==========
    H->>C: 6. LLM 决定调用工具 t（例如 get_today_events）
    C->>G: 7. tools/call(name, arguments, mcp_authz.session_id)
    Note right of C: 可选携带 requested_profile / scopes_hint

    G->>G: 7.1 校验 session_id 有效性、profile 合规性
    G->>G: 7.2 根据 manifest + arguments 计算最小 scopes_used
    G->>G: 7.3 检查 scopes_used ⊆ granted_scopes<br/>否则拒绝或触发重新授权

    G->>G: 7.4 对调用内容做哈希 + 签名<br/>生成 request_signature（ts, nonce, body_hash, sig）
    G->>G: 7.5 生成 PoP/DPoP 证明，绑定 access_token 与当前请求

    G->>S: 8. 转发 tools/call（附 mcp_authz:<br/>session_id, scopes_used, access_token, request_signature, pop_proof）
    Note right of S: S 可验证 request_signature 与 PoP<br/>再使用 access_token 调用外部资源

    S->>R: 9. 使用 access_token 调用外部 API
    R-->>S: 10. 返回业务数据
    S-->>G: 11. tools/call result（可选附 server_signature）
    G-->>C: 12. 转发 result.content 给 Client
    C-->>H: 13. Host/LLM 获取工具结果，继续对话

    %% ========== 3. 回调 / 通知（可选） ==========
    S-->>G: 14. notifications/...（附 mcp_authz.server_signature）
    G->>G: 14.1 验签 server_signature，确认来源 & 完整性
    G-->>C: 15. 转发通知给 Client（可留或去除 mcp_authz）

    %% ========== 4. 撤销 & 授权检查 ==========
    H->>G: 16. （可选）请求撤销某 session 或 tool 权限
    G->>AZ: 17. revoke(session_id / access_token)
    AZ-->>G: 18. 撤销确认
    G->>G: 19. 标记 session 失效，后续调用一律拒绝或要求重新授权
```

---

## 二、实现流程建议（你可以直接当“工程落地路线图”写进论文）
下面是一个**按“怎么一步步实现”排序的建议**，适合你在论文里写成“实现方案与工程落地建议”。

### 第 0 步：明确目标与边界
+ 目标：
    - 在不破坏 MCP 现有 JSON-RPC 结构的前提下，引入授权语义和安全机制；
    - 保持原有 MCP Server 基本代码可复用，仅增加对 `mcp_authz` 字段的理解即可；
    - Client 端**可不改**（兼容模式）或**逐步支持 **`**mcp_authz**`** hint**（增强模式）。

---

### 第 1 步：定义 Manifest 和 Authority
1. 设计 Manifest Schema（JSON）：
    - `tool_id` / `toolset_id`
    - 开发者信息 + 公钥（developer pubkey）
    - 工具 capabilities 列表（每个有 profile、需要的 scopes）
    - 推荐/最低 profile（A/B/C）
    - 对应 MCP Server endpoint（或多个 endpoint）
2. 实现 Manifest Authority / Registry：
    - 提供 `get_manifest(tool_id / toolset_id)` API；
    - 验证开发者签名（比如 JWS）；
    - 可选：平台签发二次签名（平台背书）。

_这一部分主要目标是“给工具发身份证”，为后续所有授权和校验提供基础。_

---

### 第 2 步：实现 Gateway 核心结构
1. Gateway 对外暴露为一个 MCP Server：
    - 对 Client 暴露标准 MCP endpoint（可为 HTTP / WebSocket / stdio）。
    - 支持 `initialize / tools/list / tools/call / notifications/...`。
2. Gateway 对内作为 MCP Client：
    - 负责与真实 MCP Server 建 TCP / HTTP 连接；
    - 透明转发原始 MCP 消息；
    - 在 `params` / `result` 上附加 / 解析 `mcp_authz` 信息。
3. 引入会话存储：
    - `session_id → { manifest, profile, granted_scopes, access_token, cnf, ttl }`；
    - 支持 session 失效、更新、撤销。

_Gateway 本质就是一个「会 MCP 的反向代理 + 安全策略引擎」。_

---

### 第 3 步：扩展 MCP 消息格式（mcp_authz 字段）
不动原有字段，仅**新增可选字段**：

+ 在 `initialize.params.mcp_authz`：
    - Client → Gateway：`toolset_id / requested_profile / user.subject`（hint）
    - Gateway → Server：`session_id / granted_scopes / access_token / cnf / profile`
+ 在 `tools/call.params.mcp_authz`：
    - Client → Gateway：`session_id / requested_profile / scopes_hint`
    - Gateway → Server：`session_id / scopes_used / access_token / request_signature / pop_proof`
+ 在 `notifications.params.mcp_authz`：
    - Server → Gateway：`server_signature`

**兼容性设计：**

+ 旧 Client/Server：忽略未知字段 → 仍能工作；
+ 新实现：识别并利用 `mcp_authz` → 获得增强安全。

---

### 第 4 步：与 OAuth / AuthZ Server 集成
1. 定义 Gateway ↔ AuthZ Server 的 API：
    - `authz.request`：请求 access_token + scopes + cnf；
    - `revoke`：撤销 access_token 或 session；
    - `introspect`：检查 token 状态。
2. 建议 access_token 使用 PoP / mTLS：
    - JWT 内含 `cnf.jwk`；
    - 或使用 mTLS 绑定客户端证书；
3. 在初始化时完成授权：
    - 根据 manifest + policy 计算 `requested_scopes`；
    - 得到 `granted_scopes` 并写入 session。

_这一步是“让 OAuth 真正嵌入 MCP 链路”，而不是躺在 Server 内部做黑盒实现。_

---

### 第 5 步：实现请求级安全机制（Request Signature + PoP）
1. 规范化待签名内容：
    - 方法名 + 工具名 + arguments + session_id + timestamp + nonce；
2. 使用 Gateway 私钥生成 `request_signature`：
    - `alg`, `kid`, `ts`, `nonce`, `body_hash`, `signature`；
3. 可选启用 DPoP / HTTP PoP：
    - `htm`（HTTP 方法）、`htu`（URL）、`iat`、`jti`；
4. Server 端：
    - 验证签名与 `body_hash` 是否匹配；
    - 验证 DPoP 与`access_token.cnf` 一致。

_这样可确保：Server 拿到的请求一定是 Gateway 审核过且未被篡改的。_

---

### 第 6 步：实现回调验签（Server → Gateway）
1. 为 MCP Server 配置签名私钥（或使用 manifest 中 `server_keys`）。
2. 所有 `notifications/...` 或 Server 主动推送的结果，带上：

```plain
"mcp_authz": {
  "server_signature": {
    "alg": "...",
    "kid": "...",
    "ts": ...,
    "nonce": "...",
    "body_hash": "...",
    "signature": "..."
  }
}
```

1. Gateway 验证签名成功后才转发给 Client。
    - 防止中间人伪造回调；
    - 防止“callback 污染 / prompt 注入”从 Server 通道进入 LLM。

---

### 第 7 步：实现撤销（Revoke）与状态检查（Introspection）
1. Gateway 提供管理接口（或管理面板）：
    - 按 `session_id` / `user` / `toolset_id` 列出当前授权会话；
    - 支持管理员或用户触发“立即撤销”。
2. 撤销流程：
    - G → AZ：`revoke(access_token or session_id)`；
    - AZ 标记 token 无效；
    - G 在本地 session_store 标记此 session 无效；
    - 后续带该 `session_id` 的 `tools/call` 一律拒绝或要求重新初始化。
3. introspection：
    - 定期或按需检查 token 状态；
    - 发现异常立即强制下线该工具会话。

_这部分让你的设计从“安全机制”变成“可运营的安全体系”。_

