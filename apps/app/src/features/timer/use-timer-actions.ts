"use client";

import { ROUTES, type ActiveTimerDto, type TimeLogDto } from "@kloqra/contracts";
import { useTimelogMutations } from "@kloqra/web-shared";
import { useCallback } from "react";
import { toast } from "sonner";
import { useActiveTimerSession } from "@/hooks/use-active-timer-session";
import { useIsImpersonating } from "@/hooks/use-is-impersonating";
import { api } from "@/lib/api";
import { useTimerStore } from "@/stores/timer.store";

export function useTimerActions(
  workspaceId: string,
  enabled = true,
  options: { notify?: boolean } = {}
) {
  const notify = options.notify !== false;
  const setActive = useTimerStore((state) => state.setActive);
  const isImpersonating = useIsImpersonating();
  const { refresh } = useActiveTimerSession(workspaceId, enabled);
  const timelogMutations = useTimelogMutations(workspaceId);

  const start = useCallback(
    async (taskId: string) => {
      if (!workspaceId || isImpersonating) return;
      const active = await api<ActiveTimerDto>(ROUTES.TIMER.START, {
        method: "POST",
        workspaceId,
        body: JSON.stringify({ taskId })
      });
      setActive(active);
      if (notify) toast.success("Timer started");
      return active;
    },
    [workspaceId, isImpersonating, setActive, notify]
  );

  const stop = useCallback(
    async (options: { description?: string; isBillable?: boolean } = {}) => {
      if (!workspaceId || isImpersonating) return;
      const created = await api<TimeLogDto>(ROUTES.TIMER.STOP, {
        method: "POST",
        workspaceId,
        body: JSON.stringify(options)
      });
      setActive(null);
      await timelogMutations.commitUpsert(created);
      if (notify) toast.success("Timer stopped");
      return created;
    },
    [workspaceId, isImpersonating, setActive, timelogMutations, notify]
  );

  const pause = useCallback(async () => {
    if (!workspaceId || isImpersonating) return;
    await api(ROUTES.TIMER.PAUSE, { method: "POST", workspaceId });
    await refresh();
  }, [workspaceId, isImpersonating, refresh]);

  const resume = useCallback(async () => {
    if (!workspaceId || isImpersonating) return;
    await api(ROUTES.TIMER.RESUME, { method: "POST", workspaceId });
    await refresh();
  }, [workspaceId, isImpersonating, refresh]);

  return { disabled: isImpersonating, start, stop, pause, resume };
}
