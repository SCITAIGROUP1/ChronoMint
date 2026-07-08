import { registerSessionBoundaryHandler } from "@kloqra/web-shared";
import { clearAssistantStorage } from "@/features/assistant/assistant-storage";
import { useWidgetLayout } from "@/features/dashboard/use-widget-layout";
import { clearLegacyOnboardingStorage } from "@/features/onboarding/use-onboarding-status";
import { useActiveTimerSessionStore } from "@/stores/active-timer-session.store";
import { useProjectsStore } from "@/stores/projects.store";
import { useTimerStore } from "@/stores/timer.store";
import { useUiStore } from "@/stores/ui.store";

registerSessionBoundaryHandler(({ level, prev }) => {
  if (level === "full") {
    useProjectsStore.getState().clear();
    useTimerStore.getState().clear();
    useActiveTimerSessionStore.getState().clear();
    useWidgetLayout.getState().clear();
    useUiStore.getState().clear();
    clearAssistantStorage();
    clearLegacyOnboardingStorage();
    return;
  }

  if (level === "workspace" && prev?.workspaceId) {
    const workspaceId = prev.workspaceId;
    useProjectsStore.getState().clear();
    useTimerStore.getState().clear();
    useActiveTimerSessionStore.getState().removeWorkspace(workspaceId);
    useWidgetLayout.getState().removeWorkspace(workspaceId);
  }
});
