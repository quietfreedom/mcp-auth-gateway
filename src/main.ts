// main.ts
// 程序入口：启动 HTTP + MCP Server（占位实现）

import { startCallbackServer } from './http/callbackServer';
import { startGatewayMcpServer } from './server/gatewayMcpServer';

export async function main() {
  startCallbackServer();
  startGatewayMcpServer();
  console.log('mcp-auth-gateway placeholder main started');
}

if (require.main === module) {
  main();
}
