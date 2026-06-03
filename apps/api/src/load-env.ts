import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ENV_KEYS_TO_NORMALIZE = [
  "DATABASE_URL",
  "REDIS_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "FRONTEND_ORIGIN"
] as const;

/** Railway Raw Editor paste sometimes includes wrapping "quotes" — strip them. */
export function normalizeEnvQuotes(): void {
  for (const key of ENV_KEYS_TO_NORMALIZE) {
    const raw = process.env[key];
    if (!raw) continue;
    const trimmed = raw.trim();
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      process.env[key] = trimmed.slice(1, -1);
    }
  }
}

/** Load DATABASE_URL from prisma/.env (written by docker-entrypoint when Railway injects it). */
export function loadPrismaEnvFile(): void {
  if (process.env.DATABASE_URL?.trim()) return;

  const envPath = resolve(__dirname, "../prisma/.env");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key !== "DATABASE_URL") continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env.DATABASE_URL = value;
    return;
  }
}

export function logMissingProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") return;
  for (const key of ["DATABASE_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"] as const) {
    if (!process.env[key]?.trim()) {
      console.error(`WARN: ${key} is not set — auth and database routes will fail.`);
    }
  }
  const db = process.env.DATABASE_URL?.trim();
  if (db?.startsWith('"') || db?.startsWith("'")) {
    console.error(
      'WARN: DATABASE_URL still has quote characters — remove wrapping quotes in Railway Variables (value only, no ").'
    );
  }
  if (db) {
    try {
      const host = new URL(db).hostname;
      console.log(`Database host: ${host}`);
    } catch {
      console.error("WARN: DATABASE_URL is not a valid URL after normalization.");
    }
  }
}
