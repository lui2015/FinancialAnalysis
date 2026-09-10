import { listLiabilities, upsertLedger } from "@/lib/db";
import { error, json, parseLedgerBody } from "@/lib/http";

export async function GET() {
  try {
    return json({ items: await listLiabilities() });
  } catch {
    return error(500, "读取负债失败");
  }
}

export async function POST(request: Request) {
  try {
    const parsed = parseLedgerBody(await request.json(), "liabilities");
    if (parsed.error || !parsed.item) {
      return error(400, parsed.error ?? "参数错误");
    }
    return json(await upsertLedger("liabilities", parsed.item), 201);
  } catch {
    return error(400, "无法解析请求");
  }
}
