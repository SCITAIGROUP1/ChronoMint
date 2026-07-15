/** @vitest-environment jsdom */
import type { AuthSessionDto } from "@kloqra/contracts";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRedirectIfAuthenticated } from "./use-redirect-if-authenticated";

const mockReplace = vi.fn();
const mockSearchParams = new URLSearchParams();
const mockBootstrapSession = vi.fn();
const mockClear = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams
}));

vi.mock("./bootstrap-session", () => ({
  bootstrapSession: (...args: unknown[]) => mockBootstrapSession(...args)
}));

vi.mock("../stores/session.store", () => ({
  useSessionStore: {
    getState: () => ({
      session: { user: { id: "owner-1" } },
      clear: (...args: unknown[]) => mockClear(...args)
    })
  },
  getAccessToken: () => "owner-token"
}));

const session = {
  user: { id: "owner-1", email: "owner@example.com", name: "Owner" }
} as AuthSessionDto;

describe("useRedirectIfAuthenticated", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockBootstrapSession.mockReset();
    mockClear.mockReset();
    mockSearchParams.forEach((_, key) => mockSearchParams.delete(key));
  });

  it("redirects to the post-auth path when a session is restored and no invite is present", async () => {
    mockBootstrapSession.mockResolvedValue({ ok: true, session, workspaces: [] });
    const resolvePath = vi.fn().mockResolvedValue("/select-context");

    renderHook(() => useRedirectIfAuthenticated({ resolvePath }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/select-context"));
    expect(resolvePath).toHaveBeenCalledWith(session);
    expect(mockClear).not.toHaveBeenCalled();
  });

  it("skips redirect when invite is present and does not clear the session", async () => {
    mockSearchParams.set("invite", "invite-token");
    mockBootstrapSession.mockResolvedValue({ ok: true, session, workspaces: [] });
    const resolvePath = vi.fn().mockResolvedValue("/select-context");

    const { result } = renderHook(() => useRedirectIfAuthenticated({ resolvePath }));

    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(mockBootstrapSession).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(resolvePath).not.toHaveBeenCalled();
    expect(mockClear).not.toHaveBeenCalled();
  });

  it("does not redirect when there is no session even with an invite", async () => {
    mockSearchParams.set("invite", "invite-token");
    const resolvePath = vi.fn();

    const { result } = renderHook(() => useRedirectIfAuthenticated({ resolvePath }));

    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(mockBootstrapSession).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("stops checking when bootstrap finds no session", async () => {
    mockBootstrapSession.mockResolvedValue({ ok: false, reason: "no_token" });
    const resolvePath = vi.fn();

    const { result } = renderHook(() => useRedirectIfAuthenticated({ resolvePath }));

    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
