import { getSummary } from "@/lib/db";
import { error, json } from "@/lib/http";

export async function GET() {
  try {
    return json(await getSummary());
  } catch {
    return error(500, "读取总览失败");
  }
}
