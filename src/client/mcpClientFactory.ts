// mcpClientFactory.ts
// 创建到下游 MCP Server 的 HTTP client（基于 axios）的简单封装

import axios, { type AxiosInstance } from 'axios';

export interface McpClientOptions {
  serverId?: string;
  baseUrl: string;
  timeoutMs?: number;
  defaultHeaders?: Record<string, string>;
}

export type McpClient = {
  serverId?: string;
  baseUrl: string;
  http: AxiosInstance;
  request: (path: string, opts?: { method?: 'get' | 'post' | 'put' | 'delete'; data?: any; headers?: Record<string,string> }) => Promise<any>;
  callTool: (toolPath: string, body?: any, headers?: Record<string,string>) => Promise<any>;
};

export function createMcpClient(opts: McpClientOptions): McpClient {
  const http = axios.create({ baseURL: opts.baseUrl, timeout: opts.timeoutMs ?? 5000, headers: opts.defaultHeaders });

  async function request(path: string, p?: { method?: 'get'|'post'|'put'|'delete'; data?: any; headers?: Record<string,string> }) {
    const method = (p?.method ?? 'post').toLowerCase();
    const headers = p?.headers ?? {};
    const res = await (http as any)[method](path, p?.data, { headers });
    return res.data;
  }

  async function callTool(toolPath: string, body?: any, headers?: Record<string,string>) {
    // 默认把工具调用 POST 到 /call 或指定的工具路径
    const path = toolPath.startsWith('/') ? toolPath : `/call/${toolPath}`;
    return request(path, { method: 'post', data: body, headers });
  }

  return {
    serverId: opts.serverId,
    baseUrl: opts.baseUrl,
    http,
    request,
    callTool
  };
}
