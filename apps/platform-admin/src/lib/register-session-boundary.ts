import { registerSessionBoundaryHandler } from "@kloqra/web-shared";
import { usePlatformWidgetLayout } from "@/features/ops/use-platform-widget-layout";
import { useHelpdeskStore } from "@/lib/stores/helpdesk-store";

registerSessionBoundaryHandler(({ level }) => {
  if (level === "full") {
    useHelpdeskStore.getState().clear();
    usePlatformWidgetLayout.getState().clear();
  }
});
