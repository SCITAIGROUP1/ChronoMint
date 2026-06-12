export function jiraStatusColor(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("done") || s.includes("closed"))
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  if (s.includes("progress") || s.includes("review"))
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  return "bg-muted text-muted-foreground";
}

export function jiraPriorityColor(priority: string | null): string {
  if (!priority) return "text-muted-foreground";
  const p = priority.toLowerCase();
  if (p === "highest" || p === "blocker") return "text-red-500";
  if (p === "high") return "text-orange-500";
  if (p === "medium") return "text-amber-500";
  return "text-muted-foreground";
}
