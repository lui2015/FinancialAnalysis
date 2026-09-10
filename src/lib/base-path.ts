// 子路径前缀。本地开发为空，线上部署时由 NEXT_PUBLIC_BASE_PATH 注入（如 /financialAnalysis）。
// 该常量同时被客户端组件与服务端 Route Handler 引用，用于拼接 API 路径与对外 Base URL。
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function api(path: string): string {
  return `${BASE_PATH}${path}`;
}
