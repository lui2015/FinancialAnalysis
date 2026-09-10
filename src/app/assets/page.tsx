"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/format";
import {
  ASSET_CATEGORIES,
  LIABILITY_CATEGORIES,
  type LedgerItem,
} from "@/lib/types";

type Kind = "assets" | "liabilities";

interface FormState {
  name: string;
  category: string;
  amount: string;
  note: string;
}

const emptyForm = (kind: Kind): FormState => ({
  name: "",
  category: kind === "assets" ? ASSET_CATEGORIES[0] : LIABILITY_CATEGORIES[0],
  amount: "",
  note: "",
});

export default function AssetsPage() {
  const [kind, setKind] = useState<Kind>("assets");
  const [assets, setAssets] = useState<LedgerItem[]>([]);
  const [liabilities, setLiabilities] = useState<LedgerItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [editing, setEditing] = useState<LedgerItem | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm("assets"));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const categories = kind === "assets" ? ASSET_CATEGORIES : LIABILITY_CATEGORIES;
  const items = kind === "assets" ? assets : liabilities;

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [assetRes, liabilityRes] = await Promise.all([
        fetch("/api/v1/assets", { cache: "no-store" }),
        fetch("/api/v1/liabilities", { cache: "no-store" }),
      ]);
      if (!assetRes.ok || !liabilityRes.ok) throw new Error("failed");
      setAssets(((await assetRes.json()) as { items: LedgerItem[] }).items);
      setLiabilities(((await liabilityRes.json()) as { items: LedgerItem[] }).items);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(
    () => ({
      assets: assets.reduce((sum, item) => sum + item.amount, 0),
      liabilities: liabilities.reduce((sum, item) => sum + item.amount, 0),
    }),
    [assets, liabilities],
  );

  const openCreate = () => {
    setEditing(null);
    setMessage("");
    setForm(emptyForm(kind));
    setOpen(true);
  };

  const openEdit = (item: LedgerItem) => {
    setMessage("");
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category,
      amount: item.amount.toFixed(2),
      note: item.note ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setMessage("");
    const payload = {
      name: form.name,
      category: form.category,
      amount: Number(form.amount),
      note: form.note,
    };
    const path = editing ? `/api/v1/${kind}/${editing.id}` : `/api/v1/${kind}`;
    const method = editing ? "PUT" : "POST";
    try {
      const response = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(data.error ?? "保存失败");
        return;
      }
      setOpen(false);
      setMessage(editing ? "已更新" : "已添加");
      await load();
    } catch {
      setMessage("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: LedgerItem) => {
    if (!window.confirm(`确定删除「${item.name}」？删除后不可恢复。`)) return;
    const response = await fetch(`/api/v1/${kind}/${item.id}`, { method: "DELETE" });
    if (response.ok) {
      setMessage("已删除");
      await load();
    }
  };

  return (
    <main>
      <header className="mb-6 flex min-h-11 items-center justify-between gap-4">
        <div>
          <Link href="/" className="inline-flex min-h-11 items-center text-[13px] tracking-widest text-cyan">
            ← HOME
          </Link>
          <p className="hud-label">Ledger Editor</p>
          <h1 className="font-display mt-1 text-[22px] font-semibold leading-none tracking-wide">资产管理</h1>
        </div>
        <button type="button" onClick={openCreate} className="cyber-btn inline-flex min-h-11 items-center px-4 text-[12px]">
          添加
        </button>
      </header>

      <div className="cyber-panel mb-4 grid grid-cols-2 p-1">
        {(["assets", "liabilities"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            className={`min-h-11 px-2 py-2 text-sm ${
              kind === value
                ? value === "assets"
                  ? "bg-cyan/15 text-cyan"
                  : "bg-magenta/15 text-magenta"
                : "text-muted"
            }`}
          >
            <span className="hud-label block">{value === "assets" ? "Assets" : "Debt"}</span>
            <span className="tabular mt-1 block text-[13px]">
              {formatMoney(value === "assets" ? totals.assets : totals.liabilities)}
            </span>
          </button>
        ))}
      </div>

      {message ? <p className="mb-3 px-1 text-[13px] text-cyan">{message}</p> : null}

      {status === "loading" ? (
        <div className="space-y-3">
          <div className="cyber-panel h-20 animate-pulse" />
          <div className="cyber-panel h-20 animate-pulse" />
        </div>
      ) : null}

      {status === "error" ? (
        <div className="cyber-panel px-5 py-6">
          <p>明细暂时无法加载</p>
          <button type="button" onClick={() => void load()} className="neon-cyan mt-3 min-h-11 text-sm">
            重试
          </button>
        </div>
      ) : null}

      {status === "ready" && items.length === 0 ? (
        <div className="cyber-panel px-5 py-8">
          <p className="text-[15px] font-medium">
            {kind === "assets" ? "还没有资产明细" : "还没有负债明细"}
          </p>
          <p className="mt-2 text-[15px] leading-6 text-muted">
            添加后，首页的总资产、总负债和净资产会按明细自动汇总。
          </p>
        </div>
      ) : null}

      {status === "ready" && items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className={`px-4 py-4 ${kind === "assets" ? "cyber-panel" : "cyber-panel cyber-panel-magenta"}`}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[16px]">{item.name}</p>
                  <p className="mt-1 text-[13px] text-muted">{item.category}</p>
                </div>
                <p
                  className={`font-display tabular text-[18px] sm:shrink-0 sm:text-right ${
                    kind === "assets" ? "neon-cyan" : "neon-magenta"
                  }`}
                >
                  {formatMoney(item.amount)}
                </p>
              </div>
              {item.note ? <p className="mt-2 text-[14px] text-muted">{item.note}</p> : null}
              <div className="mt-3 flex gap-4">
                <button type="button" onClick={() => openEdit(item)} className="min-h-11 text-sm tracking-wider text-cyan">
                  编辑
                </button>
                <button type="button" onClick={() => void remove(item)} className="min-h-11 text-sm tracking-wider text-hot">
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-20 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <form
            className="cyber-panel absolute inset-x-0 bottom-0 max-h-[90dvh] overflow-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 md:inset-y-0 md:left-auto md:right-0 md:w-[420px] md:rounded-none"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <p className="hud-label">{editing ? "Edit Node" : "New Node"}</p>
            <h2 className="font-display mt-1 text-lg tracking-wide">{editing ? "编辑明细" : "添加明细"}</h2>
            <label className="mt-5 block text-[13px] text-muted">
              名称
              <input
                required
                maxLength={40}
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="cyber-input mt-1 min-h-11 w-full px-3"
              />
            </label>
            <label className="mt-4 block text-[13px] text-muted">
              分类
              <select
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                className="cyber-input mt-1 min-h-11 w-full px-3"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-4 block text-[13px] text-muted">
              金额（元）
              <input
                required
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                className="cyber-input tabular mt-1 min-h-11 w-full px-3"
              />
            </label>
            <label className="mt-4 block text-[13px] text-muted">
              备注（可选）
              <textarea
                maxLength={120}
                value={form.note}
                onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                className="cyber-input mt-1 min-h-24 w-full px-3 py-2"
              />
            </label>
            {message && open ? <p className="mt-3 text-[13px] text-hot">{message}</p> : null}
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setOpen(false)} className="cyber-btn-ghost min-h-11 flex-1 text-[12px]">
                取消
              </button>
              <button type="submit" disabled={saving} className="cyber-btn min-h-11 flex-1 text-[12px] disabled:opacity-60">
                {saving ? "保存中…" : "保存"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
