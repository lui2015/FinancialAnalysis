import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import {
  ASSET_CATEGORIES,
  LIABILITY_CATEGORIES,
  type AnalysisSource,
  type LedgerItem,
} from "./types";
import { isValidDate, roundMoney, shanghaiNowIso, shanghaiToday } from "./format";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(status: number, message: string) {
  return json({ error: message }, status);
}

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

const MAX_HTML_BYTES = 2 * 1024 * 1024;

export function htmlByteLength(html: string): number {
  return Buffer.byteLength(html, "utf8");
}

export function tooLargeHtml(html: string): boolean {
  return htmlByteLength(html) > MAX_HTML_BYTES;
}

export function parseLedgerBody(
  body: unknown,
  kind: "assets" | "liabilities",
  existing?: LedgerItem,
): { item?: LedgerItem; error?: string } {
  if (!body || typeof body !== "object") {
    return { error: "请求体必须是 JSON 对象" };
  }

  const data = body as Record<string, unknown>;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name || name.length > 40) {
    return { error: "名称必填，最多 40 字" };
  }

  const allowed: readonly string[] = kind === "assets" ? ASSET_CATEGORIES : LIABILITY_CATEGORIES;
  const category = typeof data.category === "string" ? data.category : "";
  if (!allowed.includes(category)) {
    return { error: `分类必须是：${allowed.join("、")}` };
  }

  const amount = typeof data.amount === "number" ? data.amount : Number(data.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return { error: "金额必须是大于等于 0 的数字" };
  }
  if (amount > 9_999_999_999_999.99) {
    return { error: "金额超出允许范围" };
  }

  const note = typeof data.note === "string" ? data.note.trim() : "";
  if (note.length > 120) {
    return { error: "备注最多 120 字" };
  }

  return {
    item: {
      id: existing?.id ?? newId(kind === "assets" ? "ast" : "lbl"),
      name,
      category,
      amount: roundMoney(amount),
      note: note || undefined,
      updatedAt: shanghaiNowIso(),
    },
  };
}

export function parseAnalysisBody(body: unknown): {
  title?: string;
  analysisDate?: string;
  summary?: string;
  html?: string;
  source?: AnalysisSource;
  error?: string;
  status?: number;
} {
  if (!body || typeof body !== "object") {
    return { error: "请求体必须是 JSON 对象", status: 400 };
  }

  const data = body as Record<string, unknown>;
  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!title || title.length > 80) {
    return { error: "标题必填，最多 80 字", status: 400 };
  }

  const html = typeof data.html === "string" ? data.html : "";
  if (!html.trim()) {
    return { error: "html 必填", status: 400 };
  }
  if (tooLargeHtml(html)) {
    return { error: "HTML 超过 2MB", status: 413 };
  }

  const analysisDate =
    typeof data.analysisDate === "string" && data.analysisDate.trim()
      ? data.analysisDate.trim()
      : shanghaiToday();
  if (!isValidDate(analysisDate)) {
    return { error: "analysisDate 格式必须是 YYYY-MM-DD", status: 400 };
  }

  const summary = typeof data.summary === "string" ? data.summary.trim() : "";
  if (summary.length > 200) {
    return { error: "摘要最多 200 字", status: 400 };
  }

  const source = data.source === "manual" ? "manual" : "ai";

  return {
    title,
    analysisDate,
    summary: summary || undefined,
    html,
    source,
  };
}
