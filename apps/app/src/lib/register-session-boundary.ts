import { registerSessionBoundaryHandler } from "@kloqra/web-shared";
import { useAccountWidgetLayout } from "@/features/account/use-account-widget-layout";
import { useWidgetLayout } from "@/features/dashboard/use-widget-layout";
import { useActiveTimerSessionStore } from "@/stores/active-timer-session.store";
import { usePresenceStore } from "@/stores/presence.store";
import { useTimerStore } from "@/stores/timer.store";

registerSessionBoundaryHandler(({ level, prev }) => {
  if (level === "full") {
    usePresenceStore.getState().clear();
    useWidgetLayout.getState().clear();
    useAccountWidgetLayout.getState().clear();
    useActiveTimerSessionStore.getState().clear();
    useTimerStore.getState().clear();
    return;
  }

  if (level === "workspace" && prev?.workspaceId) {
    usePresenceStore.getState().clear();
    useWidgetLayout.getState().removeWorkspace(prev.workspaceId);
    useActiveTimerSessionStore.getState().removeWorkspace(prev.workspaceId);
    useTimerStore.getState().clear();
  }
});
