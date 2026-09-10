"use client";

import { api, BASE_PATH } from "@/lib/base-path";
import { useCallback, useEffect, useMemo, useState } from "react";

interface AuthInfo {
  baseUrl: string;
  apiKey: string;
}

interface Endpoint {
  method: string;
  path: string;
  auth: "bearer" | "none";
  desc: string;
}

const ENDPOINTS: Endpoint[] = [
  { method: "GET", path: "/api/v1/summary", auth: "none", desc: "读取总资产 / 总负债 / 净资产" },
  { method: "GET", path: "/api/v1/assets", auth: "none", desc: "读取资产明细列表" },
  { method: "POST", path: "/api/v1/assets", auth: "bearer", desc: "新增一条资产明细" },
  { method: "PUT", path: "/api/v1/assets/:id", auth: "bearer", desc: "更新一条资产明细" },
  { method: "DELETE", path: "/api/v1/assets/:id", auth: "bearer", desc: "删除一条资产明细" },
  { method: "GET", path: "/api/v1/liabilities", auth: "none", desc: "读取负债明细列表" },
  { method: "POST", path: "/api/v1/liabilities", auth: "bearer", desc: "新增一条负债明细" },
  { method: "PUT", path: "/api/v1/liabilities/:id", auth: "bearer", desc: "更新一条负债明细" },
  { method: "DELETE", path: "/api/v1/liabilities/:id", auth: "bearer", desc: "删除一条负债明细" },
  { method: "POST", path: "/api/v1/snapshots", auth: "bearer", desc: "上传总资产 / 总负债 / 净资产（按日期去重）" },
  { method: "GET", path: "/api/v1/snapshots", auth: "none", desc: "读取快照列表" },
  { method: "DELETE", path: "/api/v1/snapshots/:id", auth: "bearer", desc: "删除一条快照" },
  { method: "GET", path: "/api/v1/analyses", auth: "none", desc: "读取分析报告列表（分页）" },
  { method: "GET", path: "/api/v1/analyses/:id", auth: "none", desc: "读取单条分析报告" },
  { method: "POST", path: "/api/v1/analyses", auth: "bearer", desc: "上传 HTML 财务分析报告" },
  { method: "DELETE", path: "/api/v1/analyses/:id", auth: "bearer", desc: "删除一条分析报告" },
];

const PROMPT_SNAPSHOT = `你是我的「个人财务分析」上传助手。我会告诉你一个时间点的总资产、总负债（可选净资产），请帮我调用下面的接口把它记录到我的私有系统。

## 接口信息
- 基础地址：{BASE_URL}
- 鉴权方式：所有写接口都需要在请求头里加 \`Authorization: Bearer {API_KEY}\`
- 内容类型：\`Content-Type: application/json\`

## 上传总资产 / 总负债 / 净资产
接口：\`POST {BASE_URL}/api/v1/snapshots\`（按 date 去重，重复上传会覆盖当天记录）

请求体（金额单位都是「元」，支持两位小数）：
\`\`\`json
{
  "date": "2026-09-10",
  "totalAssets": 1234567.89,
  "totalLiabilities": 234567.89,
  "netWorth": 1000000.00,
  "note": "可选备注，例如「9 月定投后」"
}
\`\`\`
说明：
- \`date\` 留空会用今天（上海时区）。
- \`netWorth\` 留空时服务端会用 \`totalAssets - totalLiabilities\` 自动算。
- 同一 date 重复上传会**覆盖**当天快照。

调用成功后，请用一句话告诉我：「已记录 2026-09-10：总资产 ¥xxx、总负债 ¥xxx、净资产 ¥xxx」。`;

const PROMPT_HTML = `你是我的「个人财务分析」报告助手。我会提供本期资产 / 负债 / 现金流的明细，请帮我生成一份结构清晰的 HTML 财务分析报告，并上传到我的私有系统。

## 接口信息
- 基础地址：{BASE_URL}
- 鉴权方式：所有写接口都需要在请求头里加 \`Authorization: Bearer {API_KEY}\`
- 内容类型：\`Content-Type: application/json\`

## 上传 HTML 分析报告
接口：\`POST {BASE_URL}/api/v1/analyses\`

请求体：
\`\`\`json
{
  "title": "2026年9月月度财务分析",
  "analysisDate": "2026-09-10",
  "summary": "一句话摘要",
  "html": "<h1>...</h1><p>...</p>",
  "source": "ai"
}
\`\`\`
要求：
- \`html\` ≤ 2MB，建议只用一个 \`<h1>\` 标题 + 几张数据表 + 几段总结。\`
- 不要包含 \`<script>\`、外链 \`<script>\`、\`onclick\` 等可执行属性，否则会被服务端清洗掉。
- \`source\` 固定传 \`"ai"\`。

## 你的任务
1. 先用我给的明细生成 HTML 报告（自包含的 inline CSS 即可）。
2. 调用 \`POST {BASE_URL}/api/v1/analyses\` 上传。
3. 上传成功后告诉我返回的 \`id\` 和访问链接 \`/analyses/{id}\`，我会用浏览器打开核对。`;

const PROMPT_ALL = `你是我的「个人财务分析」私人助手。我会描述当月财务情况，请按下面的步骤帮我录入：

## 可用接口
- 基础地址：{BASE_URL}
- 鉴权头：\`Authorization: Bearer {API_KEY}\`
- 内容类型：\`Content-Type: application/json\`

### 1. 一次性录入总资产 / 总负债 / 净资产
\`POST {BASE_URL}/api/v1/snapshots\`
\`\`\`json
{
  "date": "2026-09-10",
  "totalAssets": 1234567.89,
  "totalLiabilities": 234567.89,
  "netWorth": 1000000.00,
  "note": "可选备注"
}
\`\`\`
按 date 去重；不传 netWorth 时服务端自动算 = totalAssets − totalLiabilities。

### 2. 上传 HTML 财务分析报告
\`POST {BASE_URL}/api/v1/analyses\`
\`\`\`json
{
  "title": "2026年9月月度财务分析",
  "analysisDate": "2026-09-10",
  "summary": "一句话摘要",
  "html": "<h1>...</h1>...",
  "source": "ai"
}
\`\`\`
HTML ≤ 2MB，不要写 \`<script>\` 或 \`on*\` 事件，会被清洗。

### 3. (可选) 录入明细
- 资产：\`POST {BASE_URL}/api/v1/assets\`，body { name, category, amount, note? }
- 负债：\`POST {BASE_URL}/api/v1/liabilities\`，body 同上
- 资产分类可选：现金及存款 / 投资 / 固定资产 / 其他资产
- 负债分类可选：房贷 / 车贷 / 消费贷 / 信用卡及应付 / 其他负债

## 工作流
1. 收到我的描述后，先复述一遍你准备上传的字段，确认数据无歧义。
2. 第一步调用 \`/api/v1/snapshots\` 落总账。
3. 第二步生成 HTML 并调用 \`/api/v1/analyses\` 上传。
4. 如有逐条明细，再按分类逐条 POST 到 \`/api/v1/assets\` 或 \`/api/v1/liabilities\`。
5. 全部完成后告诉我每个接口的返回 id / 链接。

请开始。`;

const PROMPTS: { id: string; label: string; body: string }[] = [
  { id: "all", label: "通用：上传汇总 + HTML 报告", body: PROMPT_ALL },
  { id: "snapshot", label: "只上传：总资产 / 总负债 / 净资产", body: PROMPT_SNAPSHOT },
  { id: "html", label: "只上传：HTML 财务分析报告", body: PROMPT_HTML },
];

function fillTemplate(template: string, info: AuthInfo): string {
  return template.replace(/\{BASE_URL\}/g, info.baseUrl).replace(/\{API_KEY\}/g, info.apiKey);
}

function maskKey(key: string): string {
  if (key.length <= 10) return key;
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}

export function OpenApiPanel() {
  const [info, setInfo] = useState<AuthInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [rotateStep, setRotateStep] = useState<"idle" | "confirm">("idle");
  const [rotateInput, setRotateInput] = useState("");
  const [rotateError, setRotateError] = useState<string | null>(null);
  const [promptId, setPromptId] = useState<string>("all");
  const [publicBase, setPublicBase] = useState<string>("");

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const response = await fetch(api("/api/v1/auth/info"), { cache: "no-store" });
      if (!response.ok) throw new Error("failed");
      const data = (await response.json()) as AuthInfo;
      setInfo(data);
    } catch {
      setLoadError("无法加载 API Key");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPublicBase(`${window.location.origin}${BASE_PATH}`);
    }
  }, []);

  const copy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied((current) => (current === id ? null : current)), 1800);
    } catch {
      setCopied("error");
    }
  }, []);

  const rotate = useCallback(async () => {
    if (!info) return;
    if (rotateInput !== "ROTATE") {
      setRotateError("请输入 ROTATE 以确认");
      return;
    }
    setRotating(true);
    setRotateError(null);
    try {
      const response = await fetch(api("/api/v1/auth/rotate"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${info.apiKey}`,
          "X-Confirm": "rotate",
        },
      });
      const data = (await response.json()) as { apiKey?: string; error?: string };
      if (!response.ok || !data.apiKey) {
        setRotateError(data.error ?? "重新生成失败");
        return;
      }
      setInfo({ ...info, apiKey: data.apiKey });
      setRevealed(true);
      setRotateStep("idle");
      setRotateInput("");
    } catch {
      setRotateError("重新生成失败");
    } finally {
      setRotating(false);
    }
  }, [info, rotateInput]);

  const promptBody = useMemo(() => {
    if (!info) return "";
    const prompt = PROMPTS.find((entry) => entry.id === promptId) ?? PROMPTS[0];
    return fillTemplate(prompt.body, info);
  }, [info, promptId]);

  const visibleKey = info && revealed ? info.apiKey : info ? maskKey(info.apiKey) : "加载中…";

  return (
    <section className="cyber-panel mt-6 px-4 py-5 sm:px-5">
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="hud-label">Open API // 开放接口</p>
          <h2 className="font-display mt-1 text-lg tracking-wide">供 AI / 外部工具调用</h2>
        </div>
        {publicBase ? (
          <p className="font-tech text-[12px] text-muted">
            BASE：<span className="neon-cyan">{publicBase}</span>
          </p>
        ) : null}
      </header>

      <div className="space-y-5">
        {/* API Key */}
        <div>
          <p className="hud-label">API Key</p>
          <div className="mt-2 flex flex-wrap items-stretch gap-2">
            <code className="font-tech cyber-input flex-1 min-w-0 px-3 py-2 text-[13px] tabular">
              {visibleKey}
            </code>
            <button
              type="button"
              onClick={() => info && copy(info.apiKey, "key")}
              disabled={!info}
              className="cyber-btn-ghost min-h-11 shrink-0 px-3 text-[12px]"
            >
              {copied === "key" ? "已复制" : "复制"}
            </button>
            <button
              type="button"
              onClick={() => setRevealed((value) => !value)}
              disabled={!info}
              className="cyber-btn-ghost min-h-11 shrink-0 px-3 text-[12px]"
            >
              {revealed ? "隐藏" : "显示"}
            </button>
            <button
              type="button"
              onClick={() => {
                setRotateStep("confirm");
                setRotateError(null);
                setRotateInput("");
              }}
              disabled={!info || rotating}
              className="cyber-btn-ghost min-h-11 shrink-0 px-3 text-[12px] text-hot"
              style={{ borderColor: "rgba(255, 61, 110, 0.55)" }}
            >
              重新生成
            </button>
          </div>
          {loadError ? <p className="mt-2 text-[13px] text-hot">{loadError}</p> : null}

          {rotateStep === "confirm" ? (
            <div className="mt-3 cyber-panel px-3 py-3">
              <p className="text-[13px] text-muted">
                重新生成会作废当前 Key，所有正在使用旧 Key 的脚本会立即失效。输入
                <code className="mx-1 bg-black/50 px-1.5 py-0.5 text-[12px] text-hot">ROTATE</code>
                后确认。
              </p>
              <div className="mt-2 flex flex-wrap items-stretch gap-2">
                <input
                  value={rotateInput}
                  onChange={(event) => setRotateInput(event.target.value)}
                  placeholder="ROTATE"
                  className="cyber-input min-h-11 flex-1 min-w-0 px-3 text-[13px]"
                />
                <button
                  type="button"
                  onClick={() => void rotate()}
                  disabled={rotating}
                  className="cyber-btn-ghost min-h-11 shrink-0 px-3 text-[12px] text-hot"
                  style={{ borderColor: "rgba(255, 61, 110, 0.55)" }}
                >
                  {rotating ? "处理中…" : "确认重新生成"}
                </button>
                <button
                  type="button"
                  onClick={() => setRotateStep("idle")}
                  className="cyber-btn-ghost min-h-11 shrink-0 px-3 text-[12px]"
                >
                  取消
                </button>
              </div>
              {rotateError ? <p className="mt-2 text-[13px] text-hot">{rotateError}</p> : null}
            </div>
          ) : null}
        </div>

        {/* 端点列表 */}
        <div>
          <p className="hud-label">Endpoints</p>
          <ul className="mt-2 divide-y divide-cyan/15 border border-cyan/20">
            {ENDPOINTS.map((endpoint) => {
              const id = `${endpoint.method} ${endpoint.path}`;
              return (
                <li
                  key={id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[13px]"
                >
                  <span
                    className={`font-tech inline-block min-w-[58px] text-center text-[11px] tracking-widest ${
                      endpoint.method === "GET"
                        ? "text-cyan"
                        : endpoint.method === "POST"
                          ? "neon-magenta"
                          : "text-acid"
                    }`}
                  >
                    {endpoint.method}
                  </span>
                  <code className="font-tech text-[13px]">{endpoint.path}</code>
                  <span
                    className={`ml-auto text-[11px] tracking-widest ${
                      endpoint.auth === "bearer" ? "text-hot" : "text-muted"
                    }`}
                  >
                    {endpoint.auth === "bearer" ? "AUTH" : "PUBLIC"}
                  </span>
                  <span className="basis-full text-[12px] text-muted sm:basis-auto sm:ml-2">
                    {endpoint.desc}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* 提示词模板 */}
        <div>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="hud-label">AI Prompt // 一键复制</p>
              <h3 className="font-display mt-1 text-base tracking-wide">提示词模板</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={promptId}
                onChange={(event) => setPromptId(event.target.value)}
                className="cyber-input min-h-11 px-3 text-[12px]"
              >
                {PROMPTS.map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => copy(promptBody, `prompt-${promptId}`)}
                disabled={!promptBody}
                className="cyber-btn min-h-11 px-3 text-[12px]"
              >
                {copied === `prompt-${promptId}` ? "已复制" : "复制提示词"}
              </button>
            </div>
          </div>
          <p className="mt-2 text-[12px] text-muted">
            模板已自动填入你的 Base URL 和 API Key。复制后粘贴到任意 AI 对话窗口，按它的引导告诉它本月数据即可。
          </p>
          <textarea
            readOnly
            value={promptBody}
            className="cyber-input mt-2 h-72 w-full resize-y px-3 py-2 font-mono text-[12px] leading-5"
          />
        </div>
      </div>
    </section>
  );
}
