import { isAuthorized } from "@/lib/auth";
import { deleteSnapshot, getSnapshot } from "@/lib/db";
import { error, json } from "@/lib/http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const snapshot = await getSnapshot(id);
  if (!snapshot) return error(404, "快照不存在");
  return json(snapshot);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return error(401, "鉴权失败");
  }
  const { id } = await context.params;
  const ok = await deleteSnapshot(id);
  if (!ok) return error(404, "快照不存在");
  return json({ ok: true });
}
