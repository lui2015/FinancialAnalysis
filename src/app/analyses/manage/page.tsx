"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/base-path";
import { dateBadge, formatAnalysisDate, formatDateTime } from "@/lib/format";
import type { AnalysisMeta } from "@/lib/types";

interface ListResponse {
  items: AnalysisMeta[];
  total: number;
  page: number;
  pageSize: number;
}

interface FormState {
  id: string | null;
  title: string;
  analysisDate: string;
  summary: string;
  html: string;
  fileName: string;
}

const emptyForm = (): FormState => ({
  id: null,
  title: "",
  analysisDate: "",
  summary: "",
  html: "",
  fileName: "",
});

const MAX_HTML_BYTES = 2 * 1024 * 1024;

export default function ManageAnalysesPage() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [items, setItems] = useState<AnalysisMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [apiKey, setApiKey] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [listRes, authRes] = await Promise.all([
        fetch(api("/api/v1/analyses?page=1&pageSize=50"), { cache: "no-store" }),
        fetch(api("/api/v1/auth/info"), { cache: "no-store" }),
      ]);
      if (!listRes.ok) throw new Error("failed");
      const data = (await listRes.json()) as ListResponse;
      setItems(data.items);
      setTotal(data.total);
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

  const writeHeaders = (): Record<string, string> => ({
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  });

  const openCreate = () => {
    setFormError("");
    setMessage("");
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (item: AnalysisMeta) => {
    setFormError("");
    setMessage("");
    setForm({
      id: item.id,
      title: item.title,
      analysisDate: item.analysisDate,
      summary: item.summary ?? "",
      html: "",
      fileName: "",
    });
    setOpen(true);
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_HTML_BYTES) {
      setFormError("HTML 文件超过 2MB");
      return;
    }
    try {
      const text = await file.text();
      setForm((current) => ({
        ...current,
        html: text,
        fileName: file.name,
        title: current.title.trim() ? current.title : file.name.replace(/\.html?$/i, ""),
      }));
      setFormError("");
    } catch {
      setFormError("读取文件失败");
    }
  };

  const save = async () => {
    if (!form.title.trim()) {
      setFormError("标题必填");
      return;
    }
    if (!form.id && !form.html.trim()) {
      setFormError("请选择 HTML 文件，或粘贴 HTML 内容");
      return;
    }
    setSaving(true);
    setFormError("");
    const payload: Record<string, unknown> = {
      title: form.title,
      analysisDate: form.analysisDate,
      summary: form.summary,
    };
    if (form.html.trim()) payload.html = form.html;
    if (!form.id) payload.source = "manual";

    const path = form.id ? api(`/api/v1/analyses/${form.id}`) : api("/api/v1/analyses");
    const method = form.id ? "PUT" : "POST";
    try {
      const response = await fetch(path, {
        method,
        headers: writeHeaders(),
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setFormError(data.error ?? "保存失败");
        return;
      }
      setOpen(false);
      setMessage(form.id ? "已更新" : "已新增报告");
      await load();
    } catch {
      setFormError("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: AnalysisMeta) => {
    if (!window.confirm(`确定删除「${item.title}」？删除后不可恢复。`)) return;
    const response = await fetch(api(`/api/v1/analyses/${item.id}`), {
      method: "DELETE",
      headers: writeHeaders(),
    });
    if (response.ok) {
      setMessage("已删除");
      await load();
    }
  };

  return (
    <main>
      <header className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/" className="inline-flex min-h-11 items-center text-[13px] tracking-widest text-cyan">
            ← HOME
          </Link>
          <p className="hud-label">Archives Manager</p>
          <h1 className="font-display mt-1 text-[22px] font-semibold leading-none tracking-wide">报告管理</h1>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="cyber-btn inline-flex min-h-11 shrink-0 items-center px-4 text-[12px]"
        >
          新增报告
        </button>
      </header>

      <p className="mb-4 px-1 text-[13px] text-muted">
        共 <span className="font-tech text-cyan">{total}</span> 份报告（最多显示最近 50 份）。可新增、编辑标题 /
        日期 / 摘要与 HTML 内容，或删除报告。
      </p>

      {message ? <p className="mb-3 px-1 text-[13px] text-cyan">{message}</p> : null}

      {status === "loading" ? (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="cyber-panel h-[96px] animate-pulse" />
          ))}
        </div>
      ) : null}

      {status === "error" ? (
        <div className="cyber-panel px-5 py-6">
          <p className="text-[15px]">报告列表暂时无法加载</p>
          <button type="button" onClick={() => void load()} className="neon-cyan mt-3 inline-flex min-h-11 items-center text-sm">
            重试
          </button>
        </div>
      ) : null}

      {status === "ready" && items.length === 0 ? (
        <div className="cyber-panel px-5 py-8">
          <p className="hud-label">Empty Archive</p>
          <p className="mt-3 text-[15px] font-medium">还没有财务分析</p>
          <p className="mt-2 text-[15px] leading-6 text-muted">
            点击右上角「新增报告」上传一份 HTML 报告，或继续通过开放接口
            <code className="mx-1 bg-black/50 px-1.5 py-0.5 text-[13px] text-cyan">POST /api/v1/analyses</code>
            上传。
          </p>
        </div>
      ) : null}

      {status === "ready" && items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((item) => {
            const badge = dateBadge(item.analysisDate);
            return (
              <li key={item.id} className="cyber-panel px-4 py-4">
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
                <p className="mt-2 text-[16px] leading-6">{item.title}</p>
                {item.summary ? (
                  <p className="mt-1 line-clamp-2 text-[14px] leading-6 text-muted">{item.summary}</p>
                ) : null}
                <p className="mt-2 text-[12px] tracking-wide text-muted">
                  {item.source === "ai" ? "AI UPLINK" : "MANUAL"}
                  <span className="mx-1.5 text-cyan">/</span>
                  WRITE {formatDateTime(item.createdAt)}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
                  <a
                    href={api(`/analyses/${item.id}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center text-sm tracking-wider text-cyan"
                  >
                    查看
                  </a>
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="inline-flex min-h-11 items-center text-sm tracking-wider text-cyan"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(item)}
                    className="inline-flex min-h-11 items-center text-sm tracking-wider text-hot"
                  >
                    删除
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-20 bg-black/70 backdrop-blur-sm" onClick={() => (saving ? null : setOpen(false))}>
          <form
            className="cyber-panel absolute inset-x-0 bottom-0 max-h-[90dvh] overflow-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 md:inset-y-0 md:left-auto md:right-0 md:w-[480px] md:rounded-none"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <p className="hud-label">{form.id ? "Edit Archive" : "New Archive"}</p>
            <h2 className="font-display mt-1 text-lg tracking-wide">{form.id ? "编辑报告" : "新增报告"}</h2>

            <label className="mt-5 block text-[13px] text-muted">
              标题
              <input
                required
                maxLength={80}
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className="cyber-input mt-1 min-h-11 w-full px-3"
              />
            </label>

            <label className="mt-4 block text-[13px] text-muted">
              分析日期（YYYY-MM-DD，留空=今天）
              <input
                value={form.analysisDate}
                onChange={(event) => setForm((current) => ({ ...current, analysisDate: event.target.value }))}
                placeholder="2026-09-15"
                pattern="\d{4}-\d{2}-\d{2}"
                className="cyber-input tabular mt-1 min-h-11 w-full px-3"
              />
            </label>

            <label className="mt-4 block text-[13px] text-muted">
              摘要（可选，最多 200 字）
              <textarea
                maxLength={200}
                value={form.summary}
                onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                className="cyber-input mt-1 min-h-20 w-full px-3 py-2"
              />
            </label>

            <label className="mt-4 block text-[13px] text-muted">
              HTML 文件（{form.id ? "留空则保留原内容" : "必填"}，≤ 2MB）
              <input
                type="file"
                accept=".html,.htm,text/html"
                onChange={(event) => void pickFile(event.target.files?.[0])}
                className="cyber-input mt-1 min-h-11 w-full px-3 py-2 text-[13px]"
              />
            </label>
            {form.fileName ? (
              <p className="mt-1 text-[12px] text-cyan">已选择：{form.fileName}</p>
            ) : null}

            <label className="mt-4 block text-[13px] text-muted">
              或直接编辑 / 粘贴 HTML 源码
              <textarea
                value={form.html}
                onChange={(event) =>
                  setForm((current) => ({ ...current, html: event.target.value, fileName: "" }))
                }
                placeholder="<!DOCTYPE html> …"
                className="cyber-input font-tech mt-1 min-h-40 w-full px-3 py-2 text-[12px]"
              />
            </label>
            <p className="mt-1 text-[12px] text-muted">{form.html.length.toLocaleString()} 字符</p>

            {formError ? <p className="mt-3 text-[13px] text-hot">{formError}</p> : null}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="cyber-btn-ghost min-h-11 flex-1 text-[12px]"
                disabled={saving}
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving}
                className="cyber-btn min-h-11 flex-1 text-[12px] disabled:opacity-60"
              >
                {saving ? "保存中…" : "保存"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
