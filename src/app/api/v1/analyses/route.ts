import { isAuthorized } from "@/lib/auth";
import { createAnalysis, getIdempotent, listAnalyses, saveIdempotent, toMeta } from "@/lib/db";
import { error, json, parseAnalysisBody } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "20");
    const from = url.searchParams.get("from") ?? undefined;
    const to = url.searchParams.get("to") ?? undefined;
    return json(await listAnalyses({ page, pageSize, from, to }));
  } catch {
    return error(500, "读取分析列表失败");
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return error(401, "鉴权失败");
  }

  const token = request.headers.get("authorization") ?? "default";
  if (!rateLimit(token)) {
    return error(429, "超出频率限制，请稍后再试");
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 2 * 1024 * 1024 + 4096) {
    return error(413, "HTML 超过 2MB");
  }

  const idempotencyKey = request.headers.get("idempotency-key")?.trim();
  if (idempotencyKey) {
    const cached = await getIdempotent(idempotencyKey);
    if (cached) {
      return json(cached, 201);
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error(400, "无法解析请求");
  }

  const parsed = parseAnalysisBody(body);
  if (parsed.error || !parsed.title || !parsed.html || !parsed.analysisDate || !parsed.source) {
    return error(parsed.status ?? 400, parsed.error ?? "参数错误");
  }

  try {
    const created = await createAnalysis({
      title: parsed.title,
      analysisDate: parsed.analysisDate,
      summary: parsed.summary,
      html: parsed.html,
      source: parsed.source,
    });
    const response = {
      ...toMeta(created),
      detailUrl: `/analyses/${created.id}`,
    };
    if (idempotencyKey) {
      await saveIdempotent(idempotencyKey, response);
    }
    return json(response, 201);
  } catch {
    return error(500, "保存分析失败");
  }
}
