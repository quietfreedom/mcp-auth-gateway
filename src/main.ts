// main.ts
// 程序入口：启动 HTTP + MCP Server（占位实现）


import { startCallbackServer } from './http/callbackServer';
import { startGatewayMcpServer } from './server/gatewayMcpServer';
import { McpClientManager } from './client/mcpClientManager';

export async function main() {
  // 启动 demo callback server（可选）
  startCallbackServer();

  // 创建一个空的 McpClientManager 并传入网关服务器
  const manager = new McpClientManager();
  // 注册一个本地 downstream stub，便于本地 demo（serverId: demo-srv）
  manager.registerServer('demo-srv', { baseUrl: 'http://localhost:5000' });
  startGatewayMcpServer({ port: 4001, serverManager: manager });

  console.log('mcp-auth-gateway main started (callback and gateway)');
}

if (require.main === module) {
  main();
}
