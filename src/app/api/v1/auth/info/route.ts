import { getApiKey } from "@/lib/auth";
import { BASE_PATH } from "@/lib/base-path";
import { error, json } from "@/lib/http";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}${BASE_PATH}`;
  return json({
    baseUrl,
    apiKey: getApiKey(),
  });
}

export async function POST() {
  return error(405, "Method Not Allowed");
}
