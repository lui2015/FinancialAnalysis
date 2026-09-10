import { randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const KEY_FILE = path.join(DATA_DIR, ".api-key");

function ensureKey(): string {
  if (process.env.API_KEY?.trim()) {
    return process.env.API_KEY.trim();
  }

  mkdirSync(DATA_DIR, { recursive: true });
  if (existsSync(KEY_FILE)) {
    const existing = readFileSync(KEY_FILE, "utf8").trim();
    if (existing) return existing;
  }

  const generated = `fa_${randomBytes(24).toString("hex")}`;
  writeFileSync(KEY_FILE, generated, { encoding: "utf8", mode: 0o600 });
  return generated;
}

export function getApiKey(): string {
  return ensureKey();
}

export function isEnvManagedKey(): boolean {
  return Boolean(process.env.API_KEY?.trim());
}

export function rotateApiKey(): string {
  if (process.env.API_KEY?.trim()) {
    throw new Error("API_KEY 由环境变量管理，无法重新生成");
  }
  mkdirSync(DATA_DIR, { recursive: true });
  const generated = `fa_${randomBytes(24).toString("hex")}`;
  writeFileSync(KEY_FILE, generated, { encoding: "utf8", mode: 0o600 });
  return generated;
}

export function extractBearer(header: string | null): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

export function isAuthorized(header: string | null): boolean {
  const token = extractBearer(header);
  return Boolean(token && token === getApiKey());
}
