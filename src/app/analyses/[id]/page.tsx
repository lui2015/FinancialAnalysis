"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/base-path";
import { wrapHtmlDocument } from "@/lib/sanitize";
import type { Analysis } from "@/lib/types";

export default function AnalysisDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "empty">("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const response = await fetch(api(`/api/v1/analyses/${params.id}`), { cache: "no-store" });
      if (response.status === 404) {
        setStatus("empty");
        return;
      }
      if (!response.ok) throw new Error("failed");
      const data = (await response.json()) as Analysis;
      if (!data.html?.trim()) {
        setStatus("empty");
        return;
      }
      setAnalysis(data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async () => {
    if (!analysis) return;
    if (!window.confirm(`确定删除「${analysis.title}」？删除后不可恢复。`)) return;
    const response = await fetch(api(`/api/v1/analyses/${analysis.id}`), { method: "DELETE" });
    if (response.ok) router.push("/");
  };

  return (
    <>
      {status === "ready" && analysis ? (
        <>
          <iframe
            title={analysis.title}
            srcDoc={wrapHtmlDocument(analysis.html)}
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer"
            className="fixed inset-0 z-0 h-full w-full border-0 bg-white"
          />
          <div className="pointer-events-none fixed inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3 sm:p-4">
            <Link
              href="/"
              className="pointer-events-auto inline-flex min-h-9 items-center rounded bg-black/55 px-3 py-1.5 text-[12px] tracking-widest text-cyan-200 backdrop-blur transition hover:bg-black/75"
            >
              ← HOME
            </Link>
            <button
              type="button"
              onClick={() => void remove()}
              className="pointer-events-auto inline-flex min-h-9 items-center rounded bg-black/55 px-3 py-1.5 text-[12px] tracking-wider text-rose-300 backdrop-blur transition hover:bg-black/75"
            >
              删除
            </button>
          </div>
        </>
      ) : null}

      {status === "loading" ? (
        <div className="fixed inset-0 z-10 grid place-items-center text-white">
          <div className="cyber-panel px-6 py-4 text-[15px]">报告加载中…</div>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="fixed inset-0 z-10 grid place-items-center px-4 text-white">
          <div className="cyber-panel px-5 py-6 text-center">
            <p className="text-[15px]">报告加载失败</p>
            <button type="button" onClick={() => void load()} className="neon-cyan mt-3 min-h-11 text-sm">
              重试
            </button>
            <div className="mt-1">
              <Link href="/" className="inline-flex min-h-11 items-center tracking-wider text-cyan">
                返回列表
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {status === "empty" ? (
        <div className="fixed inset-0 z-10 grid place-items-center px-4 text-white">
          <div className="cyber-panel px-5 py-8 text-center">
            <p className="text-[15px] font-medium">报告无法打开</p>
            <Link href="/" className="mt-3 inline-flex min-h-11 items-center tracking-wider text-cyan">
              返回列表
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
