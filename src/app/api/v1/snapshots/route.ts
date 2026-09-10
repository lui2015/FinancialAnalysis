import { isAuthorized } from "@/lib/auth";
import { listSnapshots, upsertSnapshot } from "@/lib/db";
import { error, json, parseSnapshotBody } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  try {
    return json({ items: await listSnapshots() });
  } catch {
    return error(500, "读取快照失败");
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error(400, "无法解析请求");
  }

  const parsed = parseSnapshotBody(body);
  if (
    parsed.error ||
    parsed.totalAssets === undefined ||
    parsed.totalLiabilities === undefined ||
    !parsed.date
  ) {
    return error(parsed.status ?? 400, parsed.error ?? "参数错误");
  }

  try {
    const created = await upsertSnapshot({
      date: parsed.date,
      totalAssets: parsed.totalAssets,
      totalLiabilities: parsed.totalLiabilities,
      netWorth: parsed.netWorth,
      note: parsed.note,
    });
    return json(created, 200);
  } catch {
    return error(500, "保存快照失败");
  }
}

export async function DELETE(request: Request) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return error(401, "鉴权失败");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error(400, "无法解析请求");
  }

  const ids = Array.isArray((body as { ids?: unknown })?.ids)
    ? ((body as { ids: unknown[] }).ids.filter((value) => typeof value === "string") as string[])
    : [];
  if (ids.length === 0) {
    return error(400, "ids 必须是非空数组");
  }

  const { deleteSnapshot } = await import("@/lib/db");
  let removed = 0;
  for (const id of ids) {
    if (await deleteSnapshot(id)) removed += 1;
  }
  return json({ ok: true, removed });
}
