import { isAuthorized } from "@/lib/auth";
import { deleteLedger, listAssets, upsertLedger } from "@/lib/db";
import { error, json, parseLedgerBody } from "@/lib/http";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return error(401, "鉴权失败");
  }
  const { id } = await context.params;
  const existing = (await listAssets()).find((item) => item.id === id);
  if (!existing) return error(404, "资产不存在");

  try {
    const parsed = parseLedgerBody(await request.json(), "assets", existing);
    if (parsed.error || !parsed.item) {
      return error(400, parsed.error ?? "参数错误");
    }
    return json(await upsertLedger("assets", { ...parsed.item, id }));
  } catch {
    return error(400, "无法解析请求");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return error(401, "鉴权失败");
  }
  const { id } = await context.params;
  const ok = await deleteLedger("assets", id);
  if (!ok) return error(404, "资产不存在");
  return json({ ok: true });
}
