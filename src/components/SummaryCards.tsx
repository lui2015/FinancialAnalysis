"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatMoney, formatUpdatedAt } from "@/lib/format";
import type { Summary } from "@/lib/types";

type Status = "loading" | "ready" | "error";

export function SummaryCards() {
  const [status, setStatus] = useState<Status>("loading");
  const [summary, setSummary] = useState<Summary | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const response = await fetch("/api/v1/summary", { cache: "no-store" });
      if (!response.ok) throw new Error("failed");
      setSummary((await response.json()) as Summary);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (status === "loading") {
    return (
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3" aria-busy="true">
        <div className="cyber-panel col-span-2 h-36 animate-pulse md:order-3 md:col-span-1 md:h-40" />
        <div className="cyber-panel h-28 animate-pulse md:h-40" />
        <div className="cyber-panel-magenta cyber-panel h-28 animate-pulse md:h-40" />
      </section>
    );
  }

  if (status === "error" || !summary) {
    return (
      <section className="cyber-panel px-5 py-6">
        <p className="hud-label">SIGNAL LOST</p>
        <p className="mt-2 text-[15px]">总览暂时无法加载</p>
        <button type="button" onClick={() => void load()} className="neon-cyan mt-3 inline-flex min-h-11 items-center text-sm">
          重试链路
        </button>
      </section>
    );
  }

  const negative = summary.netWorth < 0;
  const hasDelta = summary.previousNetWorth !== null;
  const delta = hasDelta ? summary.netWorth - (summary.previousNetWorth ?? 0) : 0;
  const updated = formatUpdatedAt(summary.updatedAt);

  return (
    <section>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Link
          href="/assets"
          aria-label={`净资产 ${formatMoney(summary.netWorth)}${negative ? "，当前为负" : ""}`}
          className={`col-span-2 px-5 py-5 md:order-3 md:col-span-1 md:px-6 md:py-6 ${
            negative ? "cyber-panel cyber-panel-hot" : "cyber-panel"
          }`}
        >
          <p className="hud-label">Net Worth / 净资产</p>
          <p
            className={`font-display tabular mt-4 break-all text-[clamp(1.5rem,8vw,2.1rem)] font-semibold leading-none tracking-tight md:text-[26px] lg:text-[32px] ${
              negative ? "neon-hot" : "neon-cyan"
            }`}
          >
            {formatMoney(summary.netWorth)}
          </p>
          <p className="mt-3 text-[13px] text-muted">
            {negative ? "负债高于资产 // RISK" : "总资产减总负债 // STABLE"}
          </p>
        </Link>

        <Link
          href="/assets"
          aria-label={`总资产 ${formatMoney(summary.totalAssets)}`}
          className="cyber-panel px-4 py-4 md:px-5 md:py-6"
        >
          <p className="hud-label">Assets / 总资产</p>
          <p className="font-tech tabular neon-cyan mt-4 break-all text-[15px] leading-none sm:text-[18px] md:text-[22px]">
            {formatMoney(summary.totalAssets)}
          </p>
        </Link>

        <Link
          href="/assets"
          aria-label={`总负债 ${formatMoney(summary.totalLiabilities)}`}
          className="cyber-panel cyber-panel-magenta px-4 py-4 md:px-5 md:py-6"
        >
          <p className="hud-label">Debt / 总负债</p>
          <p className="font-tech tabular neon-magenta mt-4 break-all text-[15px] leading-none sm:text-[18px] md:text-[22px]">
            {formatMoney(summary.totalLiabilities)}
          </p>
        </Link>
      </div>

      <div className="mt-4 flex items-start justify-between gap-4 px-1 text-[13px] text-muted">
        <p className="min-w-0 leading-6">
          {updated ? `SYNC ${updated}` : "NO LEDGER DATA"}
          {hasDelta ? (
            <>
              <span className="mx-1.5 text-cyan">/</span>
              DELTA {delta >= 0 ? "+" : "-"}
              {formatMoney(Math.abs(delta))}
            </>
          ) : null}
        </p>
        <Link href="/assets" className="inline-flex min-h-11 shrink-0 items-center tracking-wider text-cyan">
          管理明细 →
        </Link>
      </div>
    </section>
  );
}
