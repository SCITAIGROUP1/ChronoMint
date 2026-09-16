"use client";

import { cn } from "@kloqra/ui";
import { MessageCircle } from "lucide-react";
import { useAssistant } from "./assistant-provider";

export function AssistantLauncher() {
  const { view, openAssistant, launcherSuppressed } = useAssistant();
  const hidden = view === "expanded" || launcherSuppressed;
  return (
    <button
      type="button"
      className={cn(
        "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-50 flex size-14 items-center justify-center rounded-full border border-primary/20 bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        hidden && "pointer-events-none scale-0 opacity-0"
      )}
      aria-label="Open help assistant"
      aria-expanded={view === "expanded"}
      aria-hidden={hidden}
      aria-controls="assistant-chat-panel"
      onClick={openAssistant}
    >
      <MessageCircle className="size-6" aria-hidden />
    </button>
  );
}
