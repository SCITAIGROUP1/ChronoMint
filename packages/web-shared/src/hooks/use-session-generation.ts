"use client";

import { useSyncExternalStore } from "react";
import { getSessionGeneration, subscribeSessionGeneration } from "../auth/session-boundary";

export function useSessionGeneration(): number {
  return useSyncExternalStore(
    subscribeSessionGeneration,
    getSessionGeneration,
    getSessionGeneration
  );
}
