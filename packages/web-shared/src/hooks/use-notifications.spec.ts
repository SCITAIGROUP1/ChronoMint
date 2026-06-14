/** @vitest-environment jsdom */
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  NOTIFICATIONS_UPDATED_EVENT,
  dispatchNotificationsUpdated,
  useNotificationUnreadCount
} from "./use-notifications";

const mockApi = vi.fn();

vi.mock("../api/client", () => ({
  api: (...args: unknown[]) => mockApi(...args)
}));

describe("useNotificationUnreadCount", () => {
  beforeEach(() => {
    mockApi.mockResolvedValue({ count: 3 });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("refreshes when notifications are updated elsewhere", async () => {
    const { result } = renderHook(() => useNotificationUnreadCount("ws1"));

    await waitFor(() => expect(result.current.count).toBe(3));
    expect(mockApi).toHaveBeenCalledTimes(1);

    mockApi.mockResolvedValueOnce({ count: 1 });
    dispatchNotificationsUpdated();

    await waitFor(() => expect(result.current.count).toBe(1));
    expect(mockApi).toHaveBeenCalledTimes(2);
  });

  it("uses a shared update event name", () => {
    expect(NOTIFICATIONS_UPDATED_EVENT).toBe("kloqra:notifications-updated");
  });
});
