import { getAnalysis } from "@/lib/db";
import { wrapHtmlDocument } from "@/lib/sanitize";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const analysis = await getAnalysis(id);
  if (!analysis || !analysis.html.trim()) {
    return new Response("报告无法打开", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(wrapHtmlDocument(analysis.html), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy":
        "default-src 'none'; img-src data: https: http:; style-src 'unsafe-inline'; font-src data: https:; frame-ancestors 'self'",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
