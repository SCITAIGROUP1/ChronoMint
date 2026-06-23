"use client";

import { ROUTES, type PlatformPlanListResponseDto } from "@kloqra/contracts";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";

export function usePlatformPlans() {
  const [plans, setPlans] = useState<PlatformPlanListResponseDto["items"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<PlatformPlanListResponseDto>(ROUTES.PLATFORM.PLANS);
      setPlans(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load plans");
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { plans, loading, error, reload };
}
