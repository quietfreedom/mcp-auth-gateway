// logger.ts
// 结构化审计日志（占位实现）

export function auditLog(record: any) {
  // TODO: 发送到审计后端或文件
  console.log('AUDIT', JSON.stringify(record));
}
