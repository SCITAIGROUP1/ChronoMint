/** Curated palette — distinct on light and dark backgrounds */
export const PROJECT_COLORS = [
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#ec4899",
  "#14b8a6"
] as const;

export const DEFAULT_PROJECT_COLOR = PROJECT_COLORS[0];

export function pickDefaultProjectColor(index: number): string {
  return PROJECT_COLORS[index % PROJECT_COLORS.length]!;
}

export function normalizeProjectColor(color: string): string {
  return color.trim().toLowerCase();
}

export function projectColorsMatch(a: string, b: string): boolean {
  return normalizeProjectColor(a) === normalizeProjectColor(b);
}
