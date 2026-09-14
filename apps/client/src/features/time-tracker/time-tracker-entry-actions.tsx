"use client";

import type { TimeLogDto } from "@kloqra/contracts";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ShellMenuItem,
  ShellMenuPanel,
  cn
} from "@kloqra/ui";
import { MoreVertical } from "lucide-react";
import { useState } from "react";

type TimeTrackerEntryActionsProps = {
  log: TimeLogDto;
  locked: boolean;
  onEdit: (log: TimeLogDto) => void;
  onDelete: (log: TimeLogDto) => void;
  onDuplicate?: (log: TimeLogDto) => void;
};

export function TimeTrackerEntryActions({
  log,
  locked,
  onEdit,
  onDelete,
  onDuplicate
}: TimeTrackerEntryActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  function run(action: (next: TimeLogDto) => void) {
    setMenuOpen(false);
    action(log);
  }

  return (
    <Popover open={menuOpen} onOpenChange={setMenuOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 opacity-70 hover:opacity-100"
          aria-label="Entry actions"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <MoreVertical className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" sideOffset={4} className="w-auto p-0">
        <ShellMenuPanel
          className={cn(
            "static right-auto top-auto mt-0 min-w-[8rem] border-0 bg-transparent p-1 shadow-none animate-none"
          )}
        >
          {locked ? (
            <ShellMenuItem onClick={() => run(onEdit)}>View</ShellMenuItem>
          ) : (
            <ShellMenuItem onClick={() => run(onEdit)}>Edit</ShellMenuItem>
          )}
          {onDuplicate ? (
            <ShellMenuItem onClick={() => run(onDuplicate)}>Duplicate</ShellMenuItem>
          ) : null}
          {locked ? null : (
            <ShellMenuItem tone="destructive" onClick={() => run(onDelete)}>
              Delete
            </ShellMenuItem>
          )}
        </ShellMenuPanel>
      </PopoverContent>
    </Popover>
  );
}
