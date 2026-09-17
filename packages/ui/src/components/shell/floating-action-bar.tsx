import type { ReactNode } from "react";
import { cn } from "../../lib/utils.js";

export function FloatingActionBar({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none sticky bottom-0 z-20 flex justify-center pb-4 pt-2",
        className
      )}
      data-testid="floating-action-bar"
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-2 shadow-lg">
        {children}
      </div>
    </div>
  );
}
