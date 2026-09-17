import type { ReactNode } from "react";
import { cn } from "../../lib/utils.js";
import { statStripClass } from "./page-density.js";

export function StatStrip({
  children,
  className,
  "data-testid": dataTestId
}: {
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
}) {
  return (
    <div className={cn(statStripClass, className)} data-testid={dataTestId ?? "stat-strip"}>
      {children}
    </div>
  );
}
