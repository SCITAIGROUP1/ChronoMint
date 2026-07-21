"use client";

import type { AssistantLinkDto } from "@kloqra/contracts";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  clearStoredFeedback,
  clearStoredTurns,
  loadStoredFeedback,
  loadStoredTurns,
  saveStoredFeedback,
  saveStoredTurns,
  type AssistantFeedback
} from "./assistant-storage";

export type AssistantView = "collapsed" | "expanded" | "minimized";
export type AssistantTurn = {
  role: "user" | "assistant";
  content: string;
  links?: AssistantLinkDto[];
};

type AssistantContextValue = {
  view: AssistantView;
  launcherSuppressed: boolean;
  suppressLauncher: () => () => void;
  openAssistant: () => void;
  minimizeAssistant: () => void;
  closeAssistant: () => void;
  toggleAssistant: () => void;
  turns: AssistantTurn[];
  appendTurn: (turn: AssistantTurn) => void;
  clearTurns: () => void;
  feedback: AssistantFeedback[];
  setTurnFeedback: (turnIndex: number, helpful: boolean) => void;
};

const AssistantContext = createContext<AssistantContextValue | null>(null);

function shouldIgnoreShortcut(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.tagName === "TEXTAREA" || target.isContentEditable) return true;
  return target.tagName === "INPUT" && target.getAttribute("aria-label") !== "Assistant message";
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<AssistantView>("collapsed");
  const [launcherSuppressCount, setLauncherSuppressCount] = useState(0);
  const [turns, setTurns] = useState<AssistantTurn[]>([]);
  const [feedback, setFeedback] = useState<AssistantFeedback[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTurns(loadStoredTurns());
    setFeedback(loadStoredFeedback());
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated) saveStoredTurns(turns);
  }, [turns, hydrated]);
  useEffect(() => {
    if (hydrated) saveStoredFeedback(feedback);
  }, [feedback, hydrated]);

  const openAssistant = useCallback(() => setView("expanded"), []);
  const minimizeAssistant = useCallback(() => setView("minimized"), []);
  const closeAssistant = useCallback(() => setView("collapsed"), []);
  const toggleAssistant = useCallback(
    () => setView((current) => (current === "expanded" ? "collapsed" : "expanded")),
    []
  );
  const suppressLauncher = useCallback(() => {
    setLauncherSuppressCount((count) => count + 1);
    return () => setLauncherSuppressCount((count) => Math.max(0, count - 1));
  }, []);
  const appendTurn = useCallback((turn: AssistantTurn) => setTurns((prev) => [...prev, turn]), []);
  const clearTurns = useCallback(() => {
    setTurns([]);
    setFeedback([]);
    clearStoredTurns();
    clearStoredFeedback();
  }, []);
  const setTurnFeedback = useCallback((turnIndex: number, helpful: boolean) => {
    setFeedback((prev) => [
      ...prev.filter((item) => item.turnIndex !== turnIndex),
      { turnIndex, helpful }
    ]);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || !(event.metaKey || event.ctrlKey)) return;
      if (shouldIgnoreShortcut(event.target)) return;
      event.preventDefault();
      toggleAssistant();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [toggleAssistant]);

  const value = useMemo(
    () => ({
      view,
      launcherSuppressed: launcherSuppressCount > 0,
      suppressLauncher,
      openAssistant,
      minimizeAssistant,
      closeAssistant,
      toggleAssistant,
      turns,
      appendTurn,
      clearTurns,
      feedback,
      setTurnFeedback
    }),
    [
      view,
      launcherSuppressCount,
      suppressLauncher,
      openAssistant,
      minimizeAssistant,
      closeAssistant,
      toggleAssistant,
      turns,
      appendTurn,
      clearTurns,
      feedback,
      setTurnFeedback
    ]
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) throw new Error("useAssistant must be used within AssistantProvider");
  return context;
}

export function useSuppressAssistantLauncher(active: boolean) {
  const { suppressLauncher } = useAssistant();
  useEffect(() => {
    if (active) return suppressLauncher();
  }, [active, suppressLauncher]);
}
