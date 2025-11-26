// models.ts
// 工具能力/风险等级模型（占位实现）

export type ToolModel = {
  id: string;
  name?: string;
  riskLevel?: 'low' | 'medium' | 'high';
};

export const exampleTool: ToolModel = { id: 'example', name: 'Example Tool', riskLevel: 'low' };
