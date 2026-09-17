"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type ShellPageTitleContextValue = {
  title: string | null;
  setTitle: (title: string | null) => void;
};

const ShellPageTitleContext = createContext<ShellPageTitleContextValue | null>(null);

export function ShellPageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string | null>(null);
  const value = useMemo(() => ({ title, setTitle }), [title]);
  return <ShellPageTitleContext.Provider value={value}>{children}</ShellPageTitleContext.Provider>;
}

export function useShellPageTitle() {
  return useContext(ShellPageTitleContext);
}

export function resolveShellPageTitleLabel(title: ReactNode, titleLabel?: string): string | null {
  if (titleLabel) return titleLabel;
  if (typeof title === "string") return title;
  return null;
}

/** Registers the current page title on the compact shell header. No-ops outside a shell. */
export function useRegisterShellPageTitle(title: ReactNode, titleLabel?: string) {
  const ctx = useShellPageTitle();
  const label = resolveShellPageTitleLabel(title, titleLabel);

  useEffect(() => {
    if (!ctx) return;
    ctx.setTitle(label);
    return () => ctx.setTitle(null);
  }, [ctx, label]);
}
