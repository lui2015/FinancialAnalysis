const DANGEROUS_TAGS = /<\/?(script|iframe|object|embed|link|meta|base|form|input|button|textarea|select)[^>]*>/gi;

export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, "")
    .replace(/<style[\s\S]*?@import[\s\S]*?<\/style>/gi, "")
    .replace(DANGEROUS_TAGS, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src|xlink:href)\s*=\s*(['"])\s*(javascript|vbscript|data):/gi, "$1=$2blocked:")
    .replace(/(href|src|xlink:href)\s*=\s*(javascript|vbscript|data):/gi, "$1=blocked:");
}

export function wrapHtmlDocument(html: string): string {
  const safe = sanitizeHtml(html.trim());
  const extras = `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0;padding:0;background:#fff;color:#1f1a14;font-family:ui-sans-serif,PingFang SC,Hiragino Sans GB,Noto Sans SC,sans-serif;line-height:1.65;font-size:16px;}body{padding:8px 4px 32px;}img,video,canvas,svg{max-width:100%;height:auto;}table{border-collapse:collapse;width:100%;display:block;overflow-x:auto;}pre,code{white-space:pre-wrap;word-break:break-word;}a{color:#2F4F3E;}</style>`;

  if (/<html[\s>]/i.test(safe)) {
    if (/<head[\s>]/i.test(safe)) {
      return safe.replace(/<head([^>]*)>/i, `<head$1>${extras}`);
    }
    return safe.replace(/<html([^>]*)>/i, `<html$1><head>${extras}</head>`);
  }

  return `<!DOCTYPE html><html lang="zh-CN"><head>${extras}<title>财务分析</title></head><body>${safe}</body></html>`;
}
