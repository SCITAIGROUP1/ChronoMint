"use client";

import type { AssistantChatMessageDto } from "@kloqra/contracts";
import { Button, cn } from "@kloqra/ui";
import {
  ArrowRight,
  Loader2,
  MessageCircle,
  Minus,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getContextualPrompts } from "./assistant-prompts";
import { useAssistant } from "./assistant-provider";
import { useAssistantChat } from "./use-assistant-chat";
import { useSessionStore } from "@/stores/session.store";

export function AssistantChat() {
  const pathname = usePathname();
  const firstName = useSessionStore((state) => state.session?.user.firstName?.trim() || "there");
  const {
    view,
    openAssistant,
    minimizeAssistant,
    closeAssistant,
    turns,
    appendTurn,
    clearTurns,
    feedback,
    setTurnFeedback
  } = useAssistant();
  const { sendMessage, loading, error, clearError } = useAssistantChat();
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const requestPendingRef = useRef(false);
  const [failedRequest, setFailedRequest] = useState<{
    history: AssistantChatMessageDto[];
    content: string;
  } | null>(null);
  const expanded = view === "expanded";
  const minimized = view === "minimized";

  useEffect(() => {
    if (!expanded) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    inputRef.current?.focus();
    return () => {
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [expanded]);

  const handlePanelKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!expanded) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeAssistant();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((element) => element.getAttribute("aria-hidden") !== "true");
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [closeAssistant, expanded]
  );

  async function submit(
    text: string,
    options?: { history?: AssistantChatMessageDto[]; appendUserTurn?: boolean }
  ) {
    const content = text.trim();
    if (!content || loading || requestPendingRef.current) return;
    requestPendingRef.current = true;
    setDraft("");
    clearError();
    setFailedRequest(null);
    const history =
      options?.history ??
      turns.map((turn) => ({
        role: turn.role,
        content: turn.content
      }));
    if (options?.appendUserTurn !== false) appendTurn({ role: "user", content });
    try {
      const response = await sendMessage(history, content);
      if (response) {
        appendTurn({ role: "assistant", content: response.reply, links: response.links });
      } else {
        setFailedRequest({ history, content });
      }
    } finally {
      requestPendingRef.current = false;
    }
  }

  if (view === "collapsed") return null;

  return (
    <div
      ref={panelRef}
      id="assistant-chat-panel"
      className={cn(
        "fixed bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.5rem)] right-[max(1rem,env(safe-area-inset-right))] z-50 flex w-[min(calc(100vw-2rem),380px)] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl",
        minimized ? "h-auto" : "h-[min(520px,calc(100vh-8rem))]"
      )}
      role={expanded ? "dialog" : undefined}
      aria-label="Help assistant"
      aria-modal={expanded ? true : undefined}
      tabIndex={expanded ? -1 : undefined}
      onKeyDown={handlePanelKeyDown}
    >
      <div className="h-1 bg-primary" aria-hidden />
      <header className="flex items-center justify-between border-b px-4 py-3">
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-medium"
          onClick={minimized ? openAssistant : undefined}
          aria-label={minimized ? "Expand help assistant" : undefined}
        >
          <MessageCircle className="size-4 text-primary" aria-hidden />
          Ask Kloqra
        </button>
        <div className="flex items-center gap-1">
          {!minimized ? (
            <>
              <button
                type="button"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
                aria-label="Start new chat"
                disabled={loading || turns.length === 0}
                onClick={() => {
                  clearTurns();
                  clearError();
                  setFailedRequest(null);
                }}
              >
                <RotateCcw className="size-4" />
              </button>
              <button
                type="button"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
                aria-label="Minimize help assistant"
                onClick={minimizeAssistant}
              >
                <Minus className="size-4" />
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
            aria-label="Close help assistant"
            onClick={closeAssistant}
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      {!minimized ? (
        <>
          <div
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
            aria-live="polite"
          >
            {turns.length === 0 ? (
              <div>
                <p className="text-sm font-medium">Hi {firstName}!</p>
                <p className="text-sm text-muted-foreground">
                  Ask how to track time, submit timesheets, or find features in Kloqra.
                </p>
              </div>
            ) : null}
            {turns.map((turn, index) => {
              const turnFeedback = feedback.find((item) => item.turnIndex === index);
              return (
                <div
                  key={`${turn.role}-${index}`}
                  className={cn("flex flex-col gap-2", turn.role === "user" && "items-end")}
                >
                  <div
                    className={cn(
                      "max-w-[90%] rounded-2xl px-3 py-2.5 text-sm",
                      turn.role === "user" ? "bg-primary/10" : "bg-muted"
                    )}
                  >
                    {turn.content}
                  </div>
                  {turn.links?.map((link) => (
                    <Button key={link.href} variant="outline" size="sm" asChild>
                      <Link href={link.href} onClick={minimizeAssistant}>
                        {link.label} <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  ))}
                  {turn.role === "assistant" ? (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        aria-label="Helpful response"
                        aria-pressed={turnFeedback?.helpful === true}
                        className="rounded p-1 text-muted-foreground hover:bg-accent"
                        onClick={() => setTurnFeedback(index, true)}
                      >
                        <ThumbsUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Unhelpful response"
                        aria-pressed={turnFeedback?.helpful === false}
                        className="rounded p-1 text-muted-foreground hover:bg-accent"
                        onClick={() => setTurnFeedback(index, false)}
                      >
                        <ThumbsDown className="size-3.5" />
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
            {loading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Thinking…
              </p>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {failedRequest && !loading ? (
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() =>
                  void submit(failedRequest.content, {
                    history: failedRequest.history,
                    appendUserTurn: false
                  })
                }
              >
                Retry message
              </Button>
            ) : null}
            {turns.length === 0 && !loading
              ? getContextualPrompts(pathname).map((prompt) => (
                  <Button
                    key={prompt}
                    variant="outline"
                    size="sm"
                    className="h-auto justify-start whitespace-normal text-left text-xs"
                    onClick={() => void submit(prompt)}
                  >
                    {prompt}
                  </Button>
                ))
              : null}
          </div>
          <form
            className="flex gap-2 border-t p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submit(draft);
            }}
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder="Ask a question…"
              aria-label="Assistant message"
              maxLength={2000}
              disabled={loading}
            />
            <Button type="submit" size="sm" disabled={loading || !draft.trim()}>
              Send
            </Button>
          </form>
        </>
      ) : null}
    </div>
  );
}
