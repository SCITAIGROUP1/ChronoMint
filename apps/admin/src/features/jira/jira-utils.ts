export function jiraStatusColor(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("done") || s.includes("closed"))
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  if (s.includes("progress") || s.includes("review"))
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  return "bg-muted text-muted-foreground";
}

export function jiraSyncLogStatusColor(status: string): string {
  if (status === "SUCCESS")
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  if (status === "FAILED") return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
}
