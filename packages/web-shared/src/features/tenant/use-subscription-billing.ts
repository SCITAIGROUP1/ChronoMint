"use client";

import {
  ROUTES,
  type CheckoutSessionResponseDto,
  type CreateCheckoutSessionDto,
  type PortalSessionResponseDto
} from "@kloqra/contracts";
import { useCallback, useState } from "react";
import { api } from "../../api/client";
import { getWorkspaceId, useSessionStore } from "../../stores/session.store";

export function useCreateCheckoutSession() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCheckout = useCallback(
    async (input: CreateCheckoutSessionDto) => {
      if (!ws) return null;
      setLoading(true);
      setError(null);
      try {
        const result = await api<CheckoutSessionResponseDto>(ROUTES.TENANTS.CHECKOUT, {
          method: "POST",
          workspaceId: ws,
          body: JSON.stringify(input)
        });
        return result.url;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start checkout");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [ws]
  );

  return { createCheckout, loading, error };
}

export function useCreatePortalSession() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPortal = useCallback(async () => {
    if (!ws) return null;
    setLoading(true);
    setError(null);
    try {
      const result = await api<PortalSessionResponseDto>(ROUTES.TENANTS.PORTAL, {
        method: "POST",
        workspaceId: ws
      });
      return result.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open billing portal");
      return null;
    } finally {
      setLoading(false);
    }
  }, [ws]);

  return { createPortal, loading, error };
}
