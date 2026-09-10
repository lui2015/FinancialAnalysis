"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { formatAnalysisDate } from "@/lib/format";
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
      const response = await fetch(`/api/v1/analyses/${params.id}`, { cache: "no-store" });
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
    const response = await fetch(`/api/v1/analyses/${analysis.id}`, { method: "DELETE" });
    if (response.ok) router.push("/");
  };

  return (
    <main className="flex min-h-[calc(100dvh-2rem)] flex-col">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/" className="inline-flex min-h-11 items-center text-[13px] tracking-widest text-cyan">
            ← HOME
          </Link>
          {analysis ? (
            <>
              <p className="hud-label mt-1">{formatAnalysisDate(analysis.analysisDate)}</p>
              <h1 className="font-display mt-1 truncate text-[20px] font-semibold leading-7 tracking-wide">
                {analysis.title}
              </h1>
            </>
          ) : (
            <h1 className="font-display text-[20px] font-semibold tracking-wide">财务分析</h1>
          )}
        </div>
        {analysis ? (
          <button
            type="button"
            onClick={() => void remove()}
            className="inline-flex min-h-11 shrink-0 items-center text-sm tracking-wider text-hot"
          >
            删除
          </button>
        ) : null}
      </header>

      {status === "loading" ? <div className="cyber-panel min-h-[60vh] animate-pulse" /> : null}

      {status === "error" ? (
        <div className="cyber-panel px-5 py-6">
          <p>报告加载失败</p>
          <button type="button" onClick={() => void load()} className="neon-cyan mt-3 min-h-11 text-sm">
            重试
          </button>
        </div>
      ) : null}

      {status === "empty" ? (
        <div className="cyber-panel px-5 py-8">
          <p className="text-[15px] font-medium">报告无法打开</p>
          <Link href="/" className="mt-3 inline-flex min-h-11 items-center tracking-wider text-cyan">
            返回列表
          </Link>
        </div>
      ) : null}

      {status === "ready" && analysis ? (
        <div className="cyber-panel mx-auto w-full max-w-report flex-1 overflow-hidden">
          <iframe
            title={analysis.title}
            srcDoc={wrapHtmlDocument(analysis.html)}
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer"
            className="min-h-[70dvh] w-full border-0 bg-white"
          />
        </div>
      ) : null}
    </main>
  );
}
