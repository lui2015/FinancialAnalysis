"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/base-path";
import { formatMoney } from "@/lib/format";
import {
  ASSET_CATEGORIES,
  LIABILITY_CATEGORIES,
  type LedgerItem,
  type Snapshot,
} from "@/lib/types";
import { OpenApiPanel } from "@/components/OpenApiPanel";

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
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [editing, setEditing] = useState<LedgerItem | null>(null);
  const [open, setOpen] = useState(false);
  const [snapOpen, setSnapOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm("assets"));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [apiKey, setApiKey] = useState("");

  const categories = kind === "assets" ? ASSET_CATEGORIES : LIABILITY_CATEGORIES;
  const items = kind === "assets" ? assets : liabilities;

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [assetRes, liabilityRes, snapRes, authRes] = await Promise.all([
        fetch(api("/api/v1/assets"), { cache: "no-store" }),
        fetch(api("/api/v1/liabilities"), { cache: "no-store" }),
        fetch(api("/api/v1/snapshots"), { cache: "no-store" }),
        fetch(api("/api/v1/auth/info"), { cache: "no-store" }),
      ]);
      if (!assetRes.ok || !liabilityRes.ok) throw new Error("failed");
      setAssets(((await assetRes.json()) as { items: LedgerItem[] }).items);
      setLiabilities(((await liabilityRes.json()) as { items: LedgerItem[] }).items);
      if (snapRes.ok) {
        setSnapshots(((await snapRes.json()) as { items: Snapshot[] }).items);
      }
      if (authRes.ok) {
        setApiKey(((await authRes.json()) as { apiKey: string }).apiKey);
      }
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

  const writeHeaders = (): Record<string, string> => ({
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  });

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
    const path = api(editing ? `/api/v1/${kind}/${editing.id}` : `/api/v1/${kind}`);
    const method = editing ? "PUT" : "POST";
    try {
      const response = await fetch(path, {
        method,
        headers: writeHeaders(),
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
    const response = await fetch(api(`/api/v1/${kind}/${item.id}`), {
      method: "DELETE",
      headers: writeHeaders(),
    });
    if (response.ok) {
      setMessage("已删除");
      await load();
    }
  };

  const [snapForm, setSnapForm] = useState({
    date: "",
    totalAssets: "",
    totalLiabilities: "",
    netWorth: "",
    note: "",
  });
  const [snapSaving, setSnapSaving] = useState(false);
  const [snapError, setSnapError] = useState("");

  const openSnapCreate = () => {
    setSnapError("");
    setSnapForm({ date: "", totalAssets: "", totalLiabilities: "", netWorth: "", note: "" });
    setSnapOpen(true);
  };

  const removeSnapshot = async (snapshot: Snapshot) => {
    if (!window.confirm(`确定删除 ${snapshot.date} 的汇总快照？删除后首页会回退到明细汇总。`))
      return;
    const response = await fetch(api(`/api/v1/snapshots/${snapshot.id}`), {
      method: "DELETE",
      headers: writeHeaders(),
    });
    if (response.ok) {
      setMessage("已删除快照");
      await load();
    }
  };

  const saveSnapshot = async () => {
    setSnapSaving(true);
    setSnapError("");
    const payload: Record<string, unknown> = {};
    if (snapForm.date.trim()) payload.date = snapForm.date.trim();
    const ta = Number(snapForm.totalAssets);
    const tl = Number(snapForm.totalLiabilities);
    if (!Number.isFinite(ta) || ta < 0) {
      setSnapError("总资产必须是 ≥ 0 的数字");
      setSnapSaving(false);
      return;
    }
    if (!Number.isFinite(tl) || tl < 0) {
      setSnapError("总负债必须是 ≥ 0 的数字");
      setSnapSaving(false);
      return;
    }
    payload.totalAssets = ta;
    payload.totalLiabilities = tl;
    if (snapForm.netWorth.trim()) {
      const nw = Number(snapForm.netWorth);
      if (!Number.isFinite(nw) || nw < 0) {
        setSnapError("净资产必须是 ≥ 0 的数字");
        setSnapSaving(false);
        return;
      }
      payload.netWorth = nw;
    }
    if (snapForm.note.trim()) payload.note = snapForm.note.trim();

    try {
      const response = await fetch(api("/api/v1/snapshots"), {
        method: "POST",
        headers: writeHeaders(),
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setSnapError(data.error ?? "保存失败");
        return;
      }
      setSnapOpen(false);
      setMessage("已记录汇总，首页会按此快照显示");
      await load();
    } catch {
      setSnapError("保存失败");
    } finally {
      setSnapSaving(false);
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openSnapCreate}
            className="cyber-btn-ghost inline-flex min-h-11 items-center px-3 text-[12px]"
          >
            上传汇总
          </button>
          <button type="button" onClick={openCreate} className="cyber-btn inline-flex min-h-11 items-center px-4 text-[12px]">
            添加
          </button>
        </div>
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

      {status === "ready" && snapshots.length > 0 ? (
        <section className="mt-8">
          <p className="hud-label">Snapshots // 汇总快照</p>
          <h2 className="font-display mt-1 text-lg tracking-wide">按日期记录的总账</h2>
          <p className="mt-2 text-[13px] text-muted">
            最新一条快照会覆盖首页「总资产 / 总负债 / 净资产」；同一天再次上传会覆盖该天。
          </p>
          <ul className="mt-3 space-y-3">
            {snapshots.map((snap) => (
              <li key={snap.id} className="cyber-panel px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-display text-[15px] tracking-wide text-cyan">
                      {snap.date}
                    </p>
                    {snap.note ? <p className="mt-1 text-[13px] text-muted">{snap.note}</p> : null}
                  </div>
                  <p className="font-display tabular text-[18px] sm:shrink-0 sm:text-right neon-cyan">
                    {formatMoney(snap.netWorth)}
                  </p>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[13px]">
                  <p className="text-muted">
                    总资产 <span className="font-tech tabular ml-1 text-ink">{formatMoney(snap.totalAssets)}</span>
                  </p>
                  <p className="text-muted">
                    总负债 <span className="font-tech tabular ml-1 text-magenta">{formatMoney(snap.totalLiabilities)}</span>
                  </p>
                </div>
                <div className="mt-2 flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSnapError("");
                      setSnapForm({
                        date: snap.date,
                        totalAssets: snap.totalAssets.toFixed(2),
                        totalLiabilities: snap.totalLiabilities.toFixed(2),
                        netWorth: snap.netWorth.toFixed(2),
                        note: snap.note ?? "",
                      });
                      setSnapOpen(true);
                    }}
                    className="min-h-11 text-sm tracking-wider text-cyan"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeSnapshot(snap)}
                    className="min-h-11 text-sm tracking-wider text-hot"
                  >
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <OpenApiPanel />

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

      {snapOpen ? (
        <div
          className="fixed inset-0 z-20 bg-black/70 backdrop-blur-sm"
          onClick={() => {
            if (!snapSaving) setSnapOpen(false);
          }}
        >
          <form
            className="cyber-panel absolute inset-x-0 bottom-0 max-h-[90dvh] overflow-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 md:inset-y-0 md:left-auto md:right-0 md:w-[420px] md:rounded-none"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              void saveSnapshot();
            }}
          >
            <p className="hud-label">Snapshot // 汇总</p>
            <h2 className="font-display mt-1 text-lg tracking-wide">记录总资产 / 总负债</h2>
            <p className="mt-2 text-[12px] text-muted">
              填日期和总额后保存。同一天再次保存会覆盖；首页会按最新一条快照展示。
            </p>
            <label className="mt-5 block text-[13px] text-muted">
              日期（YYYY-MM-DD，留空=今天）
              <input
                value={snapForm.date}
                onChange={(event) => setSnapForm((current) => ({ ...current, date: event.target.value }))}
                placeholder="2026-09-10"
                pattern="\d{4}-\d{2}-\d{2}"
                className="cyber-input mt-1 min-h-11 w-full px-3"
              />
            </label>
            <label className="mt-4 block text-[13px] text-muted">
              总资产（元）
              <input
                required
                inputMode="decimal"
                min="0"
                step="0.01"
                value={snapForm.totalAssets}
                onChange={(event) =>
                  setSnapForm((current) => ({ ...current, totalAssets: event.target.value }))
                }
                className="cyber-input tabular mt-1 min-h-11 w-full px-3"
              />
            </label>
            <label className="mt-4 block text-[13px] text-muted">
              总负债（元）
              <input
                required
                inputMode="decimal"
                min="0"
                step="0.01"
                value={snapForm.totalLiabilities}
                onChange={(event) =>
                  setSnapForm((current) => ({ ...current, totalLiabilities: event.target.value }))
                }
                className="cyber-input tabular mt-1 min-h-11 w-full px-3"
              />
            </label>
            <label className="mt-4 block text-[13px] text-muted">
              净资产（元，留空自动 = 总资产 − 总负债）
              <input
                inputMode="decimal"
                min="0"
                step="0.01"
                value={snapForm.netWorth}
                onChange={(event) =>
                  setSnapForm((current) => ({ ...current, netWorth: event.target.value }))
                }
                className="cyber-input tabular mt-1 min-h-11 w-full px-3"
              />
            </label>
            <label className="mt-4 block text-[13px] text-muted">
              备注（可选）
              <textarea
                maxLength={200}
                value={snapForm.note}
                onChange={(event) => setSnapForm((current) => ({ ...current, note: event.target.value }))}
                className="cyber-input mt-1 min-h-20 w-full px-3 py-2"
              />
            </label>
            {snapError ? <p className="mt-3 text-[13px] text-hot">{snapError}</p> : null}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setSnapOpen(false)}
                className="cyber-btn-ghost min-h-11 flex-1 text-[12px]"
                disabled={snapSaving}
              >
                取消
              </button>
              <button
                type="submit"
                disabled={snapSaving}
                className="cyber-btn min-h-11 flex-1 text-[12px] disabled:opacity-60"
              >
                {snapSaving ? "保存中…" : "保存"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
