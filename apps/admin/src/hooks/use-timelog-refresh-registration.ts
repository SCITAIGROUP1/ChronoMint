"use client";

import { useEffect } from "react";
import { registerTimelogRefreshHandler } from "@/lib/timelog-refresh-registry";

export function useTimelogRefreshRegistration(refresh: () => void) {
  useEffect(() => registerTimelogRefreshHandler(refresh), [refresh]);
}
