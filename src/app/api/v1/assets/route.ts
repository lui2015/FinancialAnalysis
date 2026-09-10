import { isAuthorized } from "@/lib/auth";
import { listAssets, upsertLedger } from "@/lib/db";
import { error, json, parseLedgerBody } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  try {
    return json({ items: await listAssets() });
  } catch {
    return error(500, "读取资产失败");
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

  try {
    const parsed = parseLedgerBody(await request.json(), "assets");
    if (parsed.error || !parsed.item) {
      return error(400, parsed.error ?? "参数错误");
    }
    return json(await upsertLedger("assets", parsed.item), 201);
  } catch {
    return error(400, "无法解析请求");
  }
}
