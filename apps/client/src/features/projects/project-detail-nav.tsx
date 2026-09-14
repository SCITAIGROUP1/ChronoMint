"use client";

import { cn } from "@kloqra/ui";
import { BarChart3, ChevronRight, ListTodo, Settings, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type ProjectDetailSectionId = "overview" | "tasks" | "team" | "settings";

export type ProjectDetailNavItem = {
  id: ProjectDetailSectionId;
  label: string;
  icon: LucideIcon;
  href: string;
};

const DEFAULT_ITEMS: Omit<ProjectDetailNavItem, "href">[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "team", label: "Team", icon: Users },
  { id: "settings", label: "Settings", icon: Settings }
];

export function buildProjectDetailNavItems(
  projectId: string,
  options: { includeSettings?: boolean } = {}
): ProjectDetailNavItem[] {
  const includeSettings = options.includeSettings ?? true;
  return DEFAULT_ITEMS.filter((item) => includeSettings || item.id !== "settings").map((item) => ({
    ...item,
    href: `/projects/${projectId}/${item.id}`
  }));
}

export type ProjectListSource = "my-projects" | "projects";

const FROM_QUERY = "from";

/** Default landing route when opening a project from a list. */
export function projectListHref(
  projectId: string,
  options: { from?: ProjectListSource } = {}
): string {
  return projectDetailSectionHref(projectId, "overview", options.from);
}

export function projectDetailSectionHref(
  projectId: string,
  section: ProjectDetailSectionId,
  from?: ProjectListSource | null
): string {
  const base = `/projects/${projectId}/${section}`;
  return from === "my-projects" ? `${base}?${FROM_QUERY}=my-projects` : base;
}

export function resolveProjectListSource(
  fromParam: string | null | undefined,
  fallback: ProjectListSource = "projects"
): ProjectListSource {
  return fromParam === "my-projects" ? "my-projects" : fallback;
}

export function isMyProjectsListSource(source: ProjectListSource): boolean {
  return source === "my-projects";
}

export function projectsListBackHref(source: ProjectListSource): string {
  return source === "my-projects" ? "/my-projects" : "/projects";
}

export function projectsListBackLabel(source: ProjectListSource): string {
  return source === "my-projects" ? "My Projects" : "Projects";
}

export function resolveProjectDetailSection(pathname: string): ProjectDetailSectionId {
  if (pathname.includes("/team")) return "team";
  if (pathname.includes("/settings")) return "settings";
  if (pathname.includes("/tasks")) return "tasks";
  return "overview";
}

export function ProjectDetailNav({
  projectId,
  items,
  includeSettings = true,
  listSource = "projects"
}: {
  projectId: string;
  items?: ProjectDetailNavItem[];
  includeSettings?: boolean;
  listSource?: ProjectListSource;
}) {
  const pathname = usePathname();
  const active = resolveProjectDetailSection(pathname);
  const navItems = items ?? buildProjectDetailNavItems(projectId, { includeSettings });
  const visibleItems = includeSettings
    ? navItems
    : navItems.filter((item) => item.id !== "settings");

  return (
    <nav className="flex flex-col gap-1" aria-label="Project sections">
      {visibleItems.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        const href = projectDetailSectionHref(projectId, id, listSource);
        return (
          <Link
            key={id}
            href={href}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="flex-1">{label}</span>
            {isActive ? <ChevronRight className="size-4 shrink-0" aria-hidden /> : null}
          </Link>
        );
      })}
    </nav>
  );
}
