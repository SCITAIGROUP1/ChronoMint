import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resetExportStorageDirCacheForTests,
  resolveExportStorageDir,
  shouldUseTmpExportStorage
} from "./export-job-storage.util";

describe("export-job-storage.util", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetExportStorageDirCacheForTests();
  });

  it("uses EXPORT_STORAGE_DIR when configured", () => {
    vi.stubEnv("EXPORT_STORAGE_DIR", "/data/exports");
    vi.stubEnv("RAILWAY_ENVIRONMENT", "production");

    expect(resolveExportStorageDir()).toBe("/data/exports");
  });

  it("uses /tmp on Railway and other ephemeral runtimes", () => {
    vi.stubEnv("EXPORT_STORAGE_DIR", "");
    vi.stubEnv("RAILWAY_ENVIRONMENT", "production");

    expect(shouldUseTmpExportStorage()).toBe(true);
    expect(resolveExportStorageDir()).toBe("/tmp/export-jobs");
  });

  it("uses local .export-jobs in development", () => {
    vi.stubEnv("EXPORT_STORAGE_DIR", "");
    vi.stubEnv("RAILWAY_ENVIRONMENT", "");
    vi.stubEnv("RAILWAY_PROJECT_ID", "");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("NODE_ENV", "development");

    expect(shouldUseTmpExportStorage()).toBe(false);
    expect(resolveExportStorageDir()).toMatch(/\.export-jobs$/);
  });
});
