import type { PermissionMatrixDto, UpdatePermissionMatrixPolicyDto } from "@kloqra/contracts";
import { ROUTES } from "@kloqra/contracts";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getWorkspaceId, useSessionStore } from "@/stores/session.store";

export function usePermissionMatrix() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [matrix, setMatrix] = useState<PermissionMatrixDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ws) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api<PermissionMatrixDto>(ROUTES.TENANTS.PERMISSION_MATRIX, {
        workspaceId: ws
      });
      setMatrix(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load permission matrix.");
    } finally {
      setLoading(false);
    }
  }, [ws]);

  useEffect(() => {
    void load();
  }, [load]);

  const togglePolicy = async (
    role: UpdatePermissionMatrixPolicyDto["role"],
    permission: UpdatePermissionMatrixPolicyDto["permission"],
    nextAllowed: boolean
  ) => {
    if (!ws) return;
    const key = `${role}:${permission}`;
    setBusyKey(key);

    // Optimistic UI update
    setMatrix((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((item) => {
          if (item.id === permission) {
            return {
              ...item,
              rolePermissions: {
                ...item.rolePermissions,
                [role]: nextAllowed
              }
            };
          }
          return item;
        })
      };
    });

    try {
      const updated = await api<PermissionMatrixDto>(ROUTES.TENANTS.PERMISSION_MATRIX, {
        method: "PATCH",
        workspaceId: ws,
        body: JSON.stringify({ role, permission, allowed: nextAllowed })
      });
      setMatrix(updated);
      toast.success(
        `${permission} permission ${nextAllowed ? "granted to" : "revoked from"} ${role}.`
      );
    } catch (err) {
      // Rollback on failure
      void load();
      toast.error(err instanceof Error ? err.message : "Could not update permission policy.");
    } finally {
      setBusyKey(null);
    }
  };

  return {
    matrix,
    loading,
    error,
    busyKey,
    togglePolicy,
    reload: load
  };
}
