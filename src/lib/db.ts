import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type { Analysis, AnalysisMeta, LedgerItem, StoreData, Summary } from "./types";
import { roundMoney, shanghaiNowIso } from "./format";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

const emptyStore = (): StoreData => ({
  assets: [],
  liabilities: [],
  analyses: [],
  previousNetWorth: null,
  lastRecordedNetWorth: null,
  idempotency: {},
});

let writeChain = Promise.resolve();

function withLock<T>(fn: () => T): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function readStore(): StoreData {
  if (!existsSync(STORE_FILE)) {
    return emptyStore();
  }
  try {
    const parsed = JSON.parse(readFileSync(STORE_FILE, "utf8")) as Partial<StoreData>;
    return {
      ...emptyStore(),
      ...parsed,
      assets: parsed.assets ?? [],
      liabilities: parsed.liabilities ?? [],
      analyses: parsed.analyses ?? [],
      idempotency: parsed.idempotency ?? {},
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: StoreData) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

function sumAmount(items: LedgerItem[]): number {
  return roundMoney(items.reduce((total, item) => total + item.amount, 0));
}

function latestUpdatedAt(store: StoreData): string | null {
  const times = [...store.assets, ...store.liabilities].map((item) => item.updatedAt);
  if (times.length === 0) return null;
  return times.sort().at(-1) ?? null;
}

export function computeSummary(store: StoreData = readStore()): Summary {
  const totalAssets = sumAmount(store.assets);
  const totalLiabilities = sumAmount(store.liabilities);
  return {
    totalAssets,
    totalLiabilities,
    netWorth: roundMoney(totalAssets - totalLiabilities),
    updatedAt: latestUpdatedAt(store),
    previousNetWorth: store.previousNetWorth,
  };
}

function recordNetWorth(store: StoreData) {
  const current = computeSummary(store).netWorth;
  if (store.lastRecordedNetWorth !== null && store.lastRecordedNetWorth !== current) {
    store.previousNetWorth = store.lastRecordedNetWorth;
  }
  store.lastRecordedNetWorth = current;
}

export async function getStore(): Promise<StoreData> {
  return withLock(() => readStore());
}

export async function getSummary(): Promise<Summary> {
  return withLock(() => computeSummary(readStore()));
}

export async function listAssets(): Promise<LedgerItem[]> {
  return withLock(() => readStore().assets);
}

export async function listLiabilities(): Promise<LedgerItem[]> {
  return withLock(() => readStore().liabilities);
}

export async function upsertLedger(
  kind: "assets" | "liabilities",
  item: LedgerItem,
): Promise<LedgerItem> {
  return withLock(() => {
    const store = readStore();
    const list = store[kind];
    const index = list.findIndex((row) => row.id === item.id);
    if (index >= 0) {
      list[index] = item;
    } else {
      list.push(item);
    }
    recordNetWorth(store);
    writeStore(store);
    return item;
  });
}

export async function deleteLedger(kind: "assets" | "liabilities", id: string): Promise<boolean> {
  return withLock(() => {
    const store = readStore();
    const before = store[kind].length;
    store[kind] = store[kind].filter((row) => row.id !== id);
    if (store[kind].length === before) return false;
    recordNetWorth(store);
    writeStore(store);
    return true;
  });
}

export function toMeta(analysis: Analysis): AnalysisMeta {
  const { html: _html, ...meta } = analysis;
  return meta;
}

export async function listAnalyses(params: {
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
}): Promise<{ items: AnalysisMeta[]; total: number; page: number; pageSize: number }> {
  return withLock(() => {
    const store = readStore();
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 20));
    const sorted = [...store.analyses].sort((a, b) => {
      if (a.analysisDate !== b.analysisDate) {
        return a.analysisDate < b.analysisDate ? 1 : -1;
      }
      return a.createdAt < b.createdAt ? 1 : -1;
    });
    const filtered = sorted.filter((item) => {
      if (params.from && item.analysisDate < params.from) return false;
      if (params.to && item.analysisDate > params.to) return false;
      return true;
    });
    const start = (page - 1) * pageSize;
    return {
      items: filtered.slice(start, start + pageSize).map(toMeta),
      total: filtered.length,
      page,
      pageSize,
    };
  });
}

export async function getAnalysis(id: string): Promise<Analysis | null> {
  return withLock(() => readStore().analyses.find((item) => item.id === id) ?? null);
}

function nextAnalysisId(store: StoreData, analysisDate: string): string {
  const stamp = analysisDate.replace(/-/g, "");
  const prefix = `anl_${stamp}_`;
  const seqs = store.analyses
    .filter((item) => item.id.startsWith(prefix))
    .map((item) => Number(item.id.slice(prefix.length)))
    .filter((value) => Number.isFinite(value));
  const next = (seqs.length ? Math.max(...seqs) : 0) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export async function createAnalysis(input: Omit<Analysis, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<Analysis> {
  return withLock(() => {
    const store = readStore();
    const now = shanghaiNowIso();
    const analysis: Analysis = {
      id: input.id ?? nextAnalysisId(store, input.analysisDate),
      title: input.title,
      analysisDate: input.analysisDate,
      summary: input.summary,
      html: input.html,
      source: input.source,
      createdAt: now,
      updatedAt: now,
    };
    store.analyses.push(analysis);
    writeStore(store);
    return analysis;
  });
}

export async function deleteAnalysis(id: string): Promise<boolean> {
  return withLock(() => {
    const store = readStore();
    const before = store.analyses.length;
    store.analyses = store.analyses.filter((item) => item.id !== id);
    if (store.analyses.length === before) return false;
    writeStore(store);
    return true;
  });
}

export async function getIdempotent(key: string): Promise<unknown | null> {
  return withLock(() => readStore().idempotency[key]?.body ?? null);
}

export async function saveIdempotent(key: string, body: unknown): Promise<void> {
  return withLock(() => {
    const store = readStore();
    const entries = Object.entries(store.idempotency);
    const trimmed = entries
      .sort((a, b) => a[1].createdAt.localeCompare(b[1].createdAt))
      .slice(-99);
    store.idempotency = Object.fromEntries(trimmed);
    store.idempotency[key] = { createdAt: shanghaiNowIso(), body };
    writeStore(store);
  });
}
