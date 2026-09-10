import { deleteLedger, listLiabilities, upsertLedger } from "@/lib/db";
import { error, json, parseLedgerBody } from "@/lib/http";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const existing = (await listLiabilities()).find((item) => item.id === id);
  if (!existing) return error(404, "负债不存在");

  try {
    const parsed = parseLedgerBody(await request.json(), "liabilities", existing);
    if (parsed.error || !parsed.item) {
      return error(400, parsed.error ?? "参数错误");
    }
    return json(await upsertLedger("liabilities", { ...parsed.item, id }));
  } catch {
    return error(400, "无法解析请求");
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const ok = await deleteLedger("liabilities", id);
  if (!ok) return error(404, "负债不存在");
  return json({ ok: true });
}
