import type { AssistantTurn } from "./assistant-provider";
import { useSessionStore } from "@/stores/session.store";

const LEGACY_TURNS_KEY = "kloqra-assistant-turns-v1";
const LEGACY_FEEDBACK_KEY = "kloqra-assistant-feedback-v1";
const MAX_STORED_TURNS = 20;

export type AssistantFeedback = { turnIndex: number; helpful: boolean };

function scopedKey(base: string): string | null {
  const userId = useSessionStore.getState().session?.user?.id;
  if (!userId) return null;
  return `kloqra:${"app"}:${userId}:${base}`;
}

function readMigrated(legacyKey: string, key: string | null): string | null {
  if (!key) return sessionStorage.getItem(legacyKey);
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const legacy = sessionStorage.getItem(legacyKey);
  if (legacy) {
    sessionStorage.setItem(key, legacy);
    sessionStorage.removeItem(legacyKey);
  }
  return legacy;
}

export function loadStoredTurns(): AssistantTurn[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = readMigrated(LEGACY_TURNS_KEY, scopedKey("assistant_turns"));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is AssistantTurn =>
          typeof item === "object" &&
          item !== null &&
          ((item as AssistantTurn).role === "user" ||
            (item as AssistantTurn).role === "assistant") &&
          typeof (item as AssistantTurn).content === "string"
      )
      .slice(-MAX_STORED_TURNS);
  } catch {
    return [];
  }
}

export function saveStoredTurns(turns: AssistantTurn[]) {
  if (typeof window === "undefined") return;
  clearStoredTurns();
  if (turns.length === 0) return;
  try {
    sessionStorage.setItem(
      scopedKey("assistant_turns") ?? LEGACY_TURNS_KEY,
      JSON.stringify(turns.slice(-MAX_STORED_TURNS))
    );
  } catch {
    // Ignore storage quota and privacy-mode failures.
  }
}

export function clearStoredTurns() {
  if (typeof window === "undefined") return;
  const key = scopedKey("assistant_turns");
  if (key) sessionStorage.removeItem(key);
  sessionStorage.removeItem(LEGACY_TURNS_KEY);
}

export function loadStoredFeedback(): AssistantFeedback[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = readMigrated(LEGACY_FEEDBACK_KEY, scopedKey("assistant_feedback"));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is AssistantFeedback =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as AssistantFeedback).turnIndex === "number" &&
            typeof (item as AssistantFeedback).helpful === "boolean"
        )
      : [];
  } catch {
    return [];
  }
}

export function saveStoredFeedback(feedback: AssistantFeedback[]) {
  if (typeof window === "undefined") return;
  clearStoredFeedback();
  if (feedback.length === 0) return;
  try {
    sessionStorage.setItem(
      scopedKey("assistant_feedback") ?? LEGACY_FEEDBACK_KEY,
      JSON.stringify(feedback)
    );
  } catch {
    // Ignore storage quota and privacy-mode failures.
  }
}

export function clearStoredFeedback() {
  if (typeof window === "undefined") return;
  const key = scopedKey("assistant_feedback");
  if (key) sessionStorage.removeItem(key);
  sessionStorage.removeItem(LEGACY_FEEDBACK_KEY);
}
