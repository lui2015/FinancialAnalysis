import { deleteAnalysis, getAnalysis } from "@/lib/db";
import { error, json } from "@/lib/http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const analysis = await getAnalysis(id);
  if (!analysis) return error(404, "分析不存在");
  return json(analysis);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const ok = await deleteAnalysis(id);
  if (!ok) return error(404, "分析不存在");
  return json({ ok: true });
}
