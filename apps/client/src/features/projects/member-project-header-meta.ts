/** Header meta for member project detail — keeps the title as name-only. */
export function memberProjectHeaderMeta(project: {
  clientName: string | null;
  isActive: boolean;
}): {
  /** Only surface status when inactive; Active is the default. */
  showInactiveBadge: boolean;
  /** Client name without a "Client:" prefix, or null when missing. */
  clientSubtitle: string | null;
} {
  const trimmed = project.clientName?.trim();
  return {
    showInactiveBadge: !project.isActive,
    clientSubtitle: trimmed ? trimmed : null
  };
}
