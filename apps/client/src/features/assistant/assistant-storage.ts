"use client";

import type { AssistantTurn } from "./assistant-provider";
import { useSessionStore } from "@/stores/session.store";

export const ASSISTANT_TURNS_STORAGE_KEY = "kloqra-assistant-turns-v1";
export const ASSISTANT_FEEDBACK_STORAGE_KEY = "kloqra-assistant-feedback-v1";
export const MAX_STORED_TURNS = 20;

const LEGACY_TURNS_KEY = ASSISTANT_TURNS_STORAGE_KEY;
const LEGACY_FEEDBACK_KEY = ASSISTANT_FEEDBACK_STORAGE_KEY;

export type AssistantFeedback = {
  turnIndex: number;
  helpful: boolean;
};

function scopedKey(base: string): string | null {
  const userId = useSessionStore.getState().session?.user?.id;
  if (!userId) return null;
  const scope = process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "client";
  return `kloqra:${scope}:${userId}:${base}`;
}

function migrateLegacySessionItem(legacyKey: string, scoped: string): string | null {
  const existing = sessionStorage.getItem(scoped);
  if (existing) return existing;
  const legacy = sessionStorage.getItem(legacyKey);
  if (!legacy) return null;
  sessionStorage.setItem(scoped, legacy);
  sessionStorage.removeItem(legacyKey);
  return legacy;
}

export function loadStoredTurns(): AssistantTurn[] {
  if (typeof window === "undefined") return [];
  const key = scopedKey("assistant_turns");
  try {
    const raw = key
      ? migrateLegacySessionItem(LEGACY_TURNS_KEY, key)
      : sessionStorage.getItem(LEGACY_TURNS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is AssistantTurn =>
          typeof item === "object" &&
          item !== null &&
          (item as AssistantTurn).role !== undefined &&
          typeof (item as AssistantTurn).content === "string"
      )
      .slice(-MAX_STORED_TURNS);
  } catch {
    return [];
  }
}

export function saveStoredTurns(turns: AssistantTurn[]): void {
  if (typeof window === "undefined") return;
  const key = scopedKey("assistant_turns");
  try {
    if (turns.length === 0) {
      clearStoredTurns();
      return;
    }
    const payload = JSON.stringify(turns.slice(-MAX_STORED_TURNS));
    if (key) {
      sessionStorage.setItem(key, payload);
      sessionStorage.removeItem(LEGACY_TURNS_KEY);
      return;
    }
    sessionStorage.setItem(LEGACY_TURNS_KEY, payload);
  } catch {
    // ignore quota errors
  }
}

export function clearStoredTurns(): void {
  if (typeof window === "undefined") return;
  const key = scopedKey("assistant_turns");
  if (key) sessionStorage.removeItem(key);
  sessionStorage.removeItem(LEGACY_TURNS_KEY);
}

export function loadStoredFeedback(): AssistantFeedback[] {
  if (typeof window === "undefined") return [];
  const key = scopedKey("assistant_feedback");
  try {
    const raw = key
      ? migrateLegacySessionItem(LEGACY_FEEDBACK_KEY, key)
      : sessionStorage.getItem(LEGACY_FEEDBACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is AssistantFeedback =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as AssistantFeedback).turnIndex === "number" &&
        typeof (item as AssistantFeedback).helpful === "boolean"
    );
  } catch {
    return [];
  }
}

export function saveStoredFeedback(feedback: AssistantFeedback[]): void {
  if (typeof window === "undefined") return;
  const key = scopedKey("assistant_feedback");
  try {
    if (feedback.length === 0) {
      clearStoredFeedback();
      return;
    }
    const payload = JSON.stringify(feedback);
    if (key) {
      sessionStorage.setItem(key, payload);
      sessionStorage.removeItem(LEGACY_FEEDBACK_KEY);
      return;
    }
    sessionStorage.setItem(LEGACY_FEEDBACK_KEY, payload);
  } catch {
    // ignore quota errors
  }
}

export function clearStoredFeedback(): void {
  if (typeof window === "undefined") return;
  const key = scopedKey("assistant_feedback");
  if (key) sessionStorage.removeItem(key);
  sessionStorage.removeItem(LEGACY_FEEDBACK_KEY);
}

export function clearAssistantStorage(): void {
  clearStoredTurns();
  clearStoredFeedback();
}
