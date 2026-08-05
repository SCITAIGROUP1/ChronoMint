/**
 * Picks the single nav href that should appear active for the current path.
 * Exact matches win; otherwise the longest prefix match wins (e.g. `/account/organization`
 * over `/account`).
 *
 * Project detail under `/projects/:id` can be entered from My Projects (`?from=my-projects`);
 * in that case highlight `/my-projects` instead of workspace `/projects`.
 */
export function resolveActiveNavHref(
  pathname: string,
  hrefs: readonly string[],
  search: string = ""
): string | null {
  if (!pathname) return null;

  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (
    pathname.startsWith("/projects/") &&
    params.get("from") === "my-projects" &&
    hrefs.includes("/my-projects")
  ) {
    return "/my-projects";
  }

  const exact = hrefs.find((href) => pathname === href);
  if (exact) return exact;

  let best: string | null = null;
  for (const href of hrefs) {
    if (pathname.startsWith(`${href}/`) && (!best || href.length > best.length)) {
      best = href;
    }
  }
  return best;
}
