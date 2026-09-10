"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/base-path";
import { dateBadge, formatAnalysisDate, formatDateTime } from "@/lib/format";
import type { AnalysisMeta } from "@/lib/types";

type Status = "loading" | "ready" | "error";

interface ListResponse {
  items: AnalysisMeta[];
  total: number;
  page: number;
  pageSize: number;
}

export function AnalysisList() {
  const [status, setStatus] = useState<Status>("loading");
  const [items, setItems] = useState<AnalysisMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const pullStart = useRef<number | null>(null);
  const [pulling, setPulling] = useState(0);

  const load = useCallback(async (nextPage = 1, append = false) => {
    if (append) setLoadingMore(true);
    else setStatus("loading");
    try {
      const response = await fetch(api(`/api/v1/analyses?page=${nextPage}&pageSize=20`), {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("failed");
      const data = (await response.json()) as ListResponse;
      setItems((current) => (append ? [...current, ...data.items] : data.items));
      setTotal(data.total);
      setPage(data.page);
      setStatus("ready");
    } catch {
      if (!append) setStatus("error");
    } finally {
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void load(1, false);
  }, [load]);

  const hasMore = items.length < total;

  const onTouchStart = (event: React.TouchEvent) => {
    if (window.scrollY > 0) return;
    pullStart.current = event.touches[0]?.clientY ?? null;
  };

  const onTouchMove = (event: React.TouchEvent) => {
    if (pullStart.current === null) return;
    const distance = (event.touches[0]?.clientY ?? 0) - pullStart.current;
    setPulling(Math.max(0, Math.min(72, distance)));
  };

  const onTouchEnd = () => {
    if (pulling > 48) void load(1, false);
    pullStart.current = null;
    setPulling(0);
  };

  const countLabel = useMemo(() => `${String(total).padStart(2, "0")} FILES`, [total]);

  return (
    <section className="mt-10" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div className="mb-4 flex items-end justify-between px-1">
        <div>
          <p className="hud-label">Archives</p>
          <h2 className="font-display mt-1 text-lg tracking-wide">财务分析</h2>
        </div>
        {status === "ready" ? <p className="font-display text-[12px] tracking-widest text-cyan">{countLabel}</p> : null}
      </div>

      {pulling > 0 ? (
        <p className="mb-2 text-center text-[13px] text-cyan">{pulling > 48 ? "RELEASE TO SYNC" : "PULL TO SYNC"}</p>
      ) : null}

      {status === "loading" ? (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="cyber-panel h-[88px] animate-pulse" />
          ))}
        </div>
      ) : null}

      {status === "error" ? (
        <div className="cyber-panel px-5 py-6">
          <p className="text-[15px]">分析列表暂时无法加载</p>
          <button type="button" onClick={() => void load(1, false)} className="neon-cyan mt-3 inline-flex min-h-11 items-center text-sm">
            重试
          </button>
        </div>
      ) : null}

      {status === "ready" && items.length === 0 ? (
        <div className="cyber-panel px-5 py-8">
          <p className="hud-label">Empty Archive</p>
          <p className="mt-3 text-[15px] font-medium">还没有财务分析</p>
          <p className="mt-2 text-[15px] leading-6 text-muted">
            可通过开放接口让 AI 上传 HTML 报告。调用
            <code className="mx-1 bg-black/50 px-1.5 py-0.5 text-[13px] text-cyan">POST /api/v1/analyses</code>
            ，并在请求头带上 API Key。密钥见
            <code className="mx-1 bg-black/50 px-1.5 py-0.5 text-[13px] text-cyan">data/.api-key</code>
            或环境变量 <code className="mx-1 bg-black/50 px-1.5 py-0.5 text-[13px] text-cyan">API_KEY</code>。
          </p>
        </div>
      ) : null}

      {status === "ready" && items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((item) => {
            const badge = dateBadge(item.analysisDate);
            const label = `${item.title}，分析日期 ${formatAnalysisDate(item.analysisDate)}`;
            return (
              <li key={item.id}>
                <Link
                  href={`/analyses/${item.id}`}
                  aria-label={label}
                  className="cyber-panel block min-h-12 px-4 py-4 transition-[box-shadow,border-color] hover:border-cyan hover:shadow-cyan md:grid md:grid-cols-[176px_1fr] md:gap-6 md:px-5"
                >
                  <div className="flex items-center gap-2">
                    <time dateTime={item.analysisDate} className="font-display text-[13px] tracking-wide text-cyan">
                      {formatAnalysisDate(item.analysisDate)}
                    </time>
                    {badge ? (
                      <span className="border border-acid/50 px-1.5 py-0.5 text-[11px] tracking-widest text-acid">
                        {badge}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 md:mt-0">
                    <p className="text-[16px] leading-6">{item.title}</p>
                    {item.summary ? (
                      <p className="mt-1 line-clamp-2 text-[14px] leading-6 text-muted">{item.summary}</p>
                    ) : null}
                    <p className="mt-2 text-[12px] tracking-wide text-muted">
                      {item.source === "ai" ? "AI UPLINK" : "MANUAL"}
                      <span className="mx-1.5 text-cyan">/</span>
                      WRITE {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}

      {status === "ready" && hasMore ? (
        <button
          type="button"
          disabled={loadingMore}
          onClick={() => void load(page + 1, true)}
          className="cyber-btn-ghost mt-4 flex min-h-11 w-full items-center justify-center text-[12px]"
        >
          {loadingMore ? "LOADING…" : "LOAD MORE"}
        </button>
      ) : null}
    </section>
  );
}
