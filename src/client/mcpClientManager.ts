// mcpClientManager.ts
// 管理多个下游 MCP Server 的 client 实例

import { createMcpClient, type McpClientOptions, type McpClient } from './mcpClientFactory';

export class McpClientManager {
  private clients: Map<string, McpClient> = new Map();

  /** 注册下游服务器（可多次调用覆盖） */
  registerServer(serverId: string, opts: McpClientOptions) {
    const client = createMcpClient({ ...opts, serverId });
    this.clients.set(serverId, client);
    return client;
  }

  /** 根据 serverId 获取 client */
  getClientFor(serverId: string): McpClient | null {
    return this.clients.get(serverId) ?? null;
  }

  /** 移除 client */
  removeServer(serverId: string) {
    this.clients.delete(serverId);
  }

  /** 列出已注册的 servers */
  listServers() {
    return Array.from(this.clients.keys());
  }
}
