"use client";

import { Check, ChevronDown, Star } from "lucide-react";
import * as React from "react";
import { getOptionSearchText, type FilterableOption } from "../../lib/filter-options.js";
import { useLockDialogBodyScroll } from "../../lib/use-lock-dialog-body-scroll.js";
import { cn } from "../../lib/utils.js";
import { Button } from "./button.js";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "./command.js";
import { Popover, PopoverContent, PopoverTrigger } from "./popover.js";

export type SearchableSelectOption = FilterableOption & {
  disabled?: boolean;
};

export type SearchableSelectGroup = {
  label: string;
  options: SearchableSelectOption[];
};

export type SearchableSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options?: SearchableSelectOption[];
  groups?: SearchableSelectGroup[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  renderOption?: (option: SearchableSelectOption) => React.ReactNode;
  renderValue?: (option: SearchableSelectOption | undefined) => React.ReactNode;
  /** Values currently marked as favorites (shows filled star). */
  favoritedValues?: readonly string[];
  /** When set, each option shows a star that toggles favorite without selecting. */
  onToggleFavorite?: (value: string) => void;
};

function flattenOptions(
  options: SearchableSelectOption[] | undefined,
  groups: SearchableSelectGroup[] | undefined
): SearchableSelectOption[] {
  if (groups?.length) return groups.flatMap((group) => group.options);
  return options ?? [];
}

function commandItemValue(option: SearchableSelectOption): string {
  return getOptionSearchText(option);
}

function SearchableSelectOptionRow({
  option,
  selected,
  favorited,
  showFavorite,
  onSelect,
  onToggleFavorite,
  renderOption
}: {
  option: SearchableSelectOption;
  selected: boolean;
  favorited: boolean;
  showFavorite: boolean;
  onSelect: (value: string) => void;
  onToggleFavorite?: (value: string) => void;
  renderOption?: (option: SearchableSelectOption) => React.ReactNode;
}) {
  return (
    <CommandItem
      key={option.value}
      value={commandItemValue(option)}
      disabled={option.disabled}
      onSelect={() => onSelect(option.value)}
      className={cn(showFavorite ? "pr-14" : "pr-8")}
    >
      {renderOption ? renderOption(option) : option.label}
      <span
        className={cn(
          "absolute right-2 flex items-center justify-center gap-1",
          showFavorite ? "h-6" : "h-3.5 w-3.5"
        )}
      >
        {showFavorite && onToggleFavorite ? (
          <button
            type="button"
            className="inline-flex size-6 items-center justify-center rounded-sm text-muted-foreground hover:text-amber-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label={favorited ? `Unfavorite ${option.label}` : `Favorite ${option.label}`}
            aria-pressed={favorited}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleFavorite(option.value);
            }}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <Star
              className={cn(
                "size-3.5",
                favorited ? "fill-amber-400 text-amber-500" : "text-muted-foreground"
              )}
              aria-hidden
            />
          </button>
        ) : null}
        <span className="flex h-3.5 w-3.5 items-center justify-center">
          <Check className={cn("h-4 w-4", selected ? "opacity-100" : "opacity-0")} aria-hidden />
        </span>
      </span>
    </CommandItem>
  );
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  groups,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No results found.",
  disabled = false,
  id,
  "aria-label": ariaLabel,
  className,
  triggerClassName,
  contentClassName,
  renderOption,
  renderValue,
  favoritedValues,
  onToggleFavorite
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  useLockDialogBodyScroll(open, triggerRef);
  const allOptions = React.useMemo(() => flattenOptions(options, groups), [options, groups]);
  const selectedOption = allOptions.find((option) => option.value === value);
  const showFavorite = Boolean(onToggleFavorite);

  function handleSelect(nextValue: string) {
    onValueChange(nextValue);
    setOpen(false);
  }

  const displayValue = renderValue
    ? renderValue(selectedOption)
    : (selectedOption?.label ?? placeholder);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between font-normal shadow-sm [&>span]:line-clamp-1",
            !selectedOption && "text-muted-foreground",
            triggerClassName,
            className
          )}
        >
          <span className="truncate">{displayValue}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-[var(--radix-popover-trigger-width)] overscroll-contain p-0",
          contentClassName
        )}
        align="start"
        onCloseAutoFocus={(event) => event.preventDefault()}
        onWheel={(event) => event.stopPropagation()}
      >
        <Command shouldFilter>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {groups?.length
              ? groups.map((group) => (
                  <CommandGroup key={group.label} heading={group.label}>
                    {group.options.map((option) => (
                      <SearchableSelectOptionRow
                        key={option.value}
                        option={option}
                        selected={value === option.value}
                        favorited={Boolean(favoritedValues?.includes(option.value))}
                        showFavorite={showFavorite}
                        onSelect={handleSelect}
                        onToggleFavorite={onToggleFavorite}
                        renderOption={renderOption}
                      />
                    ))}
                  </CommandGroup>
                ))
              : (options ?? []).map((option) => (
                  <SearchableSelectOptionRow
                    key={option.value}
                    option={option}
                    selected={value === option.value}
                    favorited={Boolean(favoritedValues?.includes(option.value))}
                    showFavorite={showFavorite}
                    onSelect={handleSelect}
                    onToggleFavorite={onToggleFavorite}
                    renderOption={renderOption}
                  />
                ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
