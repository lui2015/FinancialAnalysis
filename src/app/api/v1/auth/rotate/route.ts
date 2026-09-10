import { isAuthorized, isEnvManagedKey, rotateApiKey } from "@/lib/auth";
import { error, json } from "@/lib/http";

export async function POST(request: Request) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return error(401, "鉴权失败");
  }
  if (isEnvManagedKey()) {
    return error(409, "API_KEY 由环境变量管理，不能在页面内重新生成");
  }
  const confirm = request.headers.get("x-confirm")?.toLowerCase();
  if (confirm !== "rotate") {
    return error(400, "缺少 X-Confirm: rotate 确认头");
  }
  return json({ apiKey: rotateApiKey() });
}
