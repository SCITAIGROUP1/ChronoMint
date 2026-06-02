import { cn } from "../lib/utils.js";

export function normalizeDisplayColor(color: string): string {
  return color.trim().toLowerCase();
}

export function ProjectColorDot({
  color,
  className,
  size = "sm"
}: {
  color: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/15",
        size === "sm" && "size-2.5",
        size === "md" && "size-3.5",
        size === "lg" && "size-6",
        className
      )}
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}

export function ProjectColorPicker({
  value,
  onChange,
  colors,
  className
}: {
  value: string;
  onChange: (color: string) => void;
  colors: readonly string[];
  className?: string;
}) {
  const current = normalizeDisplayColor(value);

  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="radiogroup" aria-label="Project color">
      {colors.map((c) => {
        const selected = projectColorsMatchLocal(current, c);
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={selected ? `Current color ${c}` : `Set color to ${c}`}
            title={c}
            className={cn(
              "relative size-8 rounded-full transition-[transform,box-shadow] hover:scale-105",
              selected
                ? "scale-110 ring-[3px] ring-foreground ring-offset-2 ring-offset-background shadow-sm"
                : "ring-1 ring-border/60 ring-offset-1 ring-offset-background"
            )}
            style={{ backgroundColor: c }}
            onClick={() => onChange(c)}
          >
            {selected ? (
              <span className="absolute inset-0 flex items-center justify-center">
                <svg
                  viewBox="0 0 16 16"
                  className="size-4 text-white drop-shadow-sm"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden
                >
                  <path d="M3.5 8.5 6.5 11.5 12.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function projectColorsMatchLocal(a: string, b: string): boolean {
  return normalizeDisplayColor(a) === normalizeDisplayColor(b);
}

/** Shows the one assigned color, then a single-choice palette to change it. */
export function ProjectColorEditor({
  value,
  onChange,
  colors,
  className
}: {
  value: string;
  onChange: (color: string) => void;
  colors: readonly string[];
  className?: string;
}) {
  const inPalette = colors.some((c) => projectColorsMatchLocal(value, c));

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2.5">
        <ProjectColorDot color={value} size="lg" />
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Current color</p>
          <p className="font-mono text-sm">{normalizeDisplayColor(value)}</p>
        </div>
      </div>
      {!inPalette ? (
        <p className="text-xs text-muted-foreground">
          This project uses a color outside the palette. Pick one below to update it.
        </p>
      ) : null}
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Change color (one per project)</p>
        <ProjectColorPicker value={value} onChange={onChange} colors={colors} />
      </div>
    </div>
  );
}

export function ProjectNameWithColor({
  name,
  color,
  className
}: {
  name: string;
  color: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <ProjectColorDot color={color} />
      <span>{name}</span>
    </span>
  );
}
