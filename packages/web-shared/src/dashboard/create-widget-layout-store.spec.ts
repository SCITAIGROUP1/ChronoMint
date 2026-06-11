import { describe, expect, it, vi, beforeEach } from "vitest";
import { createWidgetLayoutStore } from "./create-widget-layout-store";
import { fetchDashboardLayout, saveDashboardLayout } from "./dashboard-layout-api";

vi.mock("./dashboard-layout-api", () => ({
  fetchDashboardLayout: vi.fn(),
  saveDashboardLayout: vi.fn(),
  readLegacyLayouts: vi.fn(() => ({ layout: null, defaultLayout: null })),
  clearLegacyLayouts: vi.fn()
}));

const workspaceId = "ws-1";
const defaultLayout = [{ i: "stat_total_hours", x: 0, y: 0, w: 3, h: 2, visible: true }];
const registry = [
  {
    id: "stat_total_hours",
    defaultVisible: true,
    defaultSize: { w: 3, h: 2 }
  }
];

describe("createWidgetLayoutStore", () => {
  beforeEach(() => {
    vi.mocked(fetchDashboardLayout).mockReset();
    vi.mocked(saveDashboardLayout).mockReset();
  });

  it("loads remote layout on initialize", async () => {
    const remoteLayout = [{ i: "stat_total_hours", x: 1, y: 2, w: 4, h: 3, visible: false }];
    vi.mocked(fetchDashboardLayout).mockResolvedValue({
      layout: remoteLayout,
      defaultLayout: null
    });

    const store = createWidgetLayoutStore({
      app: "client",
      widgetRegistry: registry,
      defaultLayout,
      legacyStorage: {
        layoutKey: () => "layout",
        defaultKey: () => "default"
      }
    });

    await store.getState().initialize(workspaceId);

    expect(store.getState().layoutsByWorkspace[workspaceId]).toEqual(remoteLayout);
  });

  it("persists layout updates to the API", async () => {
    vi.mocked(fetchDashboardLayout).mockResolvedValue({
      layout: defaultLayout,
      defaultLayout: null
    });
    vi.mocked(saveDashboardLayout).mockResolvedValue({
      layout: defaultLayout,
      defaultLayout: null
    });

    const store = createWidgetLayoutStore({
      app: "admin",
      widgetRegistry: registry,
      defaultLayout,
      legacyStorage: {
        layoutKey: () => "layout",
        defaultKey: () => "default"
      }
    });

    await store.getState().initialize(workspaceId);
    await store.getState().persistLayout(workspaceId);

    expect(saveDashboardLayout).toHaveBeenCalledWith(workspaceId, {
      app: "admin",
      layout: defaultLayout
    });
  });
});
