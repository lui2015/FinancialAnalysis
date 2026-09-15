import { isAuthorized } from "@/lib/auth";
import { deleteAnalysis, getAnalysis, toMeta, updateAnalysis } from "@/lib/db";
import { error, json, parseAnalysisBody } from "@/lib/http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const analysis = await getAnalysis(id);
  if (!analysis) return error(404, "分析不存在");
  return json(analysis);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return error(401, "鉴权失败");
  }

  const { id } = await context.params;
  const existing = await getAnalysis(id);
  if (!existing) return error(404, "分析不存在");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error(400, "无法解析请求");
  }

  const data = (body ?? {}) as Record<string, unknown>;
  const parsed = parseAnalysisBody({
    title: data.title ?? existing.title,
    analysisDate: data.analysisDate ?? existing.analysisDate,
    summary: data.summary !== undefined ? data.summary : existing.summary,
    html: data.html ?? existing.html,
    source: data.source ?? existing.source,
  });
  if (parsed.error || !parsed.title || !parsed.html || !parsed.analysisDate || !parsed.source) {
    return error(parsed.status ?? 400, parsed.error ?? "参数错误");
  }

  const updated = await updateAnalysis(id, {
    title: parsed.title,
    analysisDate: parsed.analysisDate,
    summary: parsed.summary,
    html: parsed.html,
    source: parsed.source,
  });
  if (!updated) return error(404, "分析不存在");
  return json(toMeta(updated));
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return error(401, "鉴权失败");
  }
  const { id } = await context.params;
  const ok = await deleteAnalysis(id);
  if (!ok) return error(404, "分析不存在");
  return json({ ok: true });
}
