// index.ts
// 统一加载 YAML/ENV 配置（占位实现）

import fs from 'fs';
import path from 'path';

export function loadConfig() {
  // TODO: 从 YAML 和 ENV 加载配置
  const cfgPath = path.resolve(__dirname, 'servers.yaml');
  let raw = null;
  try {
    raw = fs.readFileSync(cfgPath, 'utf8');
  } catch (e) {
    raw = '';
  }
  return { raw };
}
