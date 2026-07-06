import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";

const LOCAL_DIR_NAME = ".export-jobs";
const TMP_STORAGE_DIR = join("/tmp", "export-jobs");

function configuredStorageDir(): string | null {
  const value = process.env.EXPORT_STORAGE_DIR?.trim();
  return value || null;
}

export function shouldUseTmpExportStorage(): boolean {
  return (
    process.env.VERCEL === "1" ||
    Boolean(process.env.RAILWAY_ENVIRONMENT) ||
    Boolean(process.env.RAILWAY_PROJECT_ID) ||
    Boolean(process.env.RENDER) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)
  );
}

export function resolveExportStorageDir(): string {
  const configured = configuredStorageDir();
  if (configured) {
    return configured;
  }
  if (shouldUseTmpExportStorage()) {
    return TMP_STORAGE_DIR;
  }
  return join(process.cwd(), LOCAL_DIR_NAME);
}

let ensuredDir: string | null = null;

export async function ensureExportStorageDir(): Promise<string> {
  if (ensuredDir) {
    return ensuredDir;
  }

  const primary = resolveExportStorageDir();
  try {
    await mkdir(primary, { recursive: true });
    ensuredDir = primary;
    return primary;
  } catch (err) {
    if (primary === TMP_STORAGE_DIR) {
      throw err;
    }
    await mkdir(TMP_STORAGE_DIR, { recursive: true });
    ensuredDir = TMP_STORAGE_DIR;
    return TMP_STORAGE_DIR;
  }
}

function storageDir(): string {
  return ensuredDir ?? resolveExportStorageDir();
}

export async function writeExportJobFile(storageKey: string, buffer: Buffer): Promise<void> {
  const dir = await ensureExportStorageDir();
  await writeFile(join(dir, storageKey), buffer);
}

export async function readExportJobFile(storageKey: string): Promise<Buffer> {
  const dir = storageDir();
  return readFile(join(dir, storageKey));
}

export async function deleteExportJobFile(storageKey: string): Promise<void> {
  const dir = storageDir();
  await rm(join(dir, storageKey), { force: true });
}

export function buildExportJobStorageKey(jobId: string, ext: string): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "") || "bin";
  return `${jobId}.${safeExt}`;
}

/** @internal Test helper — reset cached storage dir between tests. */
export function resetExportStorageDirCacheForTests(): void {
  ensuredDir = null;
}
