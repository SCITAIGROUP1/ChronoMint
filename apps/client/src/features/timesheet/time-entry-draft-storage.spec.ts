/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TimeEntryDraft } from "./time-entry-draft";
import {
  clearTimeEntryDraftStorage,
  readTimeEntryDraftStorage,
  serializeTimeEntryDraft,
  timeEntryDraftStorageKey,
  writeTimeEntryDraftStorage
} from "./time-entry-draft-storage";

const draft: TimeEntryDraft = {
  date: "2026-06-09",
  projectId: "proj-1",
  taskSelection: "task-1",
  startTime: "13:04",
  endTime: "14:04",
  description: "Code review",
  isBillable: true,
  recurrence: "none"
};

describe("time-entry-draft-storage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("scopes create and edit keys separately", () => {
    expect(timeEntryDraftStorageKey("ws-1")).toContain(":create");
    expect(timeEntryDraftStorageKey("ws-1", "log-1")).toContain(":edit:log-1");
  });

  it("round-trips a draft and clears on discard", () => {
    const key = timeEntryDraftStorageKey("ws-1");
    writeTimeEntryDraftStorage(key, draft);
    expect(readTimeEntryDraftStorage(key)).toEqual(draft);
    expect(serializeTimeEntryDraft(draft)).toBe(JSON.stringify(draft));
    clearTimeEntryDraftStorage(key);
    expect(readTimeEntryDraftStorage(key)).toBeNull();
  });
});
