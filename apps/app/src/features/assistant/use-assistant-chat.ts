"use client";

import {
  assistantChatResponseSchema,
  ROUTES,
  type AssistantChatMessageDto,
  type AssistantChatResponseDto
} from "@kloqra/contracts";
import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session.store";

export function useAssistantChat() {
  const workspaceId = useSessionStore((state) => state.session?.workspaceId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clearError = useCallback(() => setError(null), []);

  const sendMessage = useCallback(
    async (
      history: AssistantChatMessageDto[],
      userContent: string
    ): Promise<AssistantChatResponseDto | null> => {
      if (!workspaceId) return null;
      setLoading(true);
      setError(null);
      try {
        const raw = await api<unknown>(ROUTES.ASSISTANT.CHAT, {
          method: "POST",
          workspaceId,
          body: JSON.stringify({
            messages: [...history, { role: "user" as const, content: userContent }].slice(-10)
          })
        });
        const parsed = assistantChatResponseSchema.safeParse(raw);
        if (!parsed.success) throw new Error("Unexpected assistant response");
        return parsed.data;
      } catch {
        setError("Could not reach the help assistant. Try again in a moment.");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [workspaceId]
  );

  return { sendMessage, loading, error, clearError };
}
