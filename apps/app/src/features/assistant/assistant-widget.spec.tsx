/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantProvider } from "./assistant-provider";
import { AssistantWidget } from "./assistant-widget";

const sendMessage = vi.fn().mockResolvedValue({
  reply: "Open Timer and click Start.",
  links: [{ label: "Timer", href: "/timer" }]
});

vi.mock("./use-assistant-chat", () => ({
  useAssistantChat: () => ({
    sendMessage,
    loading: false,
    error: null,
    clearError: vi.fn()
  })
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/timer" }));
vi.mock("@/stores/session.store", () => {
  const state = { session: { user: { id: "user-1", firstName: "Sam" } } };
  return {
    useSessionStore: Object.assign(
      (selector: (value: typeof state) => unknown) => selector(state),
      { getState: () => state }
    )
  };
});

describe("AssistantWidget", () => {
  beforeEach(() => {
    sessionStorage.clear();
    sendMessage.mockReset().mockResolvedValue({
      reply: "Open Timer and click Start.",
      links: [{ label: "Timer", href: "/timer" }]
    });
  });
  afterEach(cleanup);

  it("opens from the unified-shell launcher and sends contextual prompts", async () => {
    render(
      <AssistantProvider>
        <AssistantWidget />
      </AssistantProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "Open help assistant" }));
    fireEvent.click(screen.getByRole("button", { name: "How do I start a timer?" }));
    await waitFor(() => expect(screen.getByText("Open Timer and click Start.")).toBeTruthy());
  });

  it("persists conversation under the unified app scope", async () => {
    render(
      <AssistantProvider>
        <AssistantWidget />
      </AssistantProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "Open help assistant" }));
    fireEvent.click(screen.getByRole("button", { name: "How do I start a timer?" }));
    await waitFor(() => {
      expect(sessionStorage.getItem("kloqra:app:user-1:assistant_turns")).toContain(
        "Open Timer and click Start."
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "Helpful response" }));
    await waitFor(() => {
      expect(sessionStorage.getItem("kloqra:app:user-1:assistant_feedback")).toContain(
        '"helpful":true'
      );
    });
  });

  it("retries the failed message without adding another user turn", async () => {
    sendMessage
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ reply: "Recovered response.", links: [] });
    render(
      <AssistantProvider>
        <AssistantWidget />
      </AssistantProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Open help assistant" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Assistant message" }), {
      target: { value: "How do I submit time?" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Retry message" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Retry message" }));

    await waitFor(() => expect(screen.getByText("Recovered response.")).toBeTruthy());
    expect(screen.getAllByText("How do I submit time?")).toHaveLength(1);
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  it("prevents duplicate submissions while a request is pending", async () => {
    let resolveRequest!: (value: { reply: string; links: never[] }) => void;
    sendMessage.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
    );
    render(
      <AssistantProvider>
        <AssistantWidget />
      </AssistantProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Open help assistant" }));
    const input = screen.getByRole("textbox", { name: "Assistant message" });
    fireEvent.change(input, { target: { value: "One request only" } });
    const form = input.closest("form");
    expect(form).toBeTruthy();
    fireEvent.submit(form!);
    fireEvent.submit(form!);

    expect(sendMessage).toHaveBeenCalledTimes(1);
    resolveRequest({ reply: "Done.", links: [] });
    await waitFor(() => expect(screen.getByText("Done.")).toBeTruthy());
  });

  it("traps focus in the expanded dialog, closes on Escape, and restores focus", () => {
    render(
      <AssistantProvider>
        <AssistantWidget />
      </AssistantProvider>
    );
    const launcher = screen.getByRole("button", { name: "Open help assistant" });
    launcher.focus();
    fireEvent.click(launcher);

    const dialog = screen.getByRole("dialog", { name: "Help assistant" });
    const input = screen.getByRole("textbox", { name: "Assistant message" });
    expect(document.activeElement).toBe(input);

    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      )
    );
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    last.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(first);
    first.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Help assistant" })).toBeNull();
    expect(document.activeElement).toBe(launcher);
  });
});
