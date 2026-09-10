export const ASSET_CATEGORIES = [
  "现金及存款",
  "投资",
  "固定资产",
  "其他资产",
] as const;

export const LIABILITY_CATEGORIES = [
  "房贷",
  "车贷 / 消费贷",
  "信用卡及应付",
  "其他负债",
] as const;

export type AssetCategory = (typeof ASSET_CATEGORIES)[number];
export type LiabilityCategory = (typeof LIABILITY_CATEGORIES)[number];
export type AnalysisSource = "ai" | "manual";

export interface LedgerItem {
  id: string;
  name: string;
  category: string;
  amount: number;
  note?: string;
  updatedAt: string;
}

export interface Analysis {
  id: string;
  title: string;
  analysisDate: string;
  summary?: string;
  html: string;
  source: AnalysisSource;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisMeta {
  id: string;
  title: string;
  analysisDate: string;
  summary?: string;
  source: AnalysisSource;
  createdAt: string;
  updatedAt: string;
}

export interface Summary {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  updatedAt: string | null;
  previousNetWorth: number | null;
  source: "snapshot" | "ledger" | "empty";
  snapshotDate: string | null;
}

export interface Snapshot {
  id: string;
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoreData {
  assets: LedgerItem[];
  liabilities: LedgerItem[];
  analyses: Analysis[];
  snapshots: Snapshot[];
  previousNetWorth: number | null;
  lastRecordedNetWorth: number | null;
  idempotency: Record<string, { createdAt: string; body: unknown }>;
}
