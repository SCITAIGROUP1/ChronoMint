"use client";

import { PageLayout, Badge, Button, EmptyState, ProjectNameWithColor, Skeleton } from "@kloqra/ui";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { ProjectDetailProvider, useProjectDetail } from "./project-detail-context";
import {
  ProjectDetailNav,
  isMyProjectsListSource,
  projectsListBackHref,
  projectsListBackLabel,
  resolveProjectDetailSection,
  resolveProjectListSource,
  type ProjectDetailSectionId
} from "./project-detail-nav";
import { resolveProjectDetailExperience } from "@/features/unified-routes/route-composition";
import { useSessionStore } from "@/stores/session.store";

const WORKSPACE_SECTION_COPY: Record<
  ProjectDetailSectionId,
  { title: string; description: string }
> = {
  overview: {
    title: "Overview",
    description: "Time logged on this project across the team for the selected period."
  },
  tasks: {
    title: "Tasks",
    description: "Define the task list members choose when logging time on this project."
  },
  team: {
    title: "Team",
    description: "Invite members and manage who can log time on this project."
  },
  settings: {
    title: "Settings",
    description: "Update project details, approval rules, and color."
  }
};

const PERSONAL_SECTION_COPY: Record<
  Exclude<ProjectDetailSectionId, "settings">,
  { title: string; description: string }
> = {
  overview: {
    title: "Overview",
    description: "Your time on this project for the selected period."
  },
  tasks: {
    title: "Tasks",
    description: "Tasks you can choose when logging time on this project."
  },
  team: {
    title: "Team",
    description: "People on this project with you."
  }
};

function ProjectDetailShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { project, loading, error } = useProjectDetail();
  const session = useSessionStore((state) => state.session);
  const activeSection = resolveProjectDetailSection(pathname);
  const listSource = resolveProjectListSource(searchParams.get("from"), "projects");
  const forcePersonal = isMyProjectsListSource(listSource);
  const experience = session
    ? resolveProjectDetailExperience(session, project?.id ?? "", { forcePersonal })
    : { mode: "personal" as const };
  const personal = experience.mode === "personal";
  const copy = personal
    ? (PERSONAL_SECTION_COPY[activeSection === "settings" ? "overview" : activeSection] ??
      PERSONAL_SECTION_COPY.overview)
    : WORKSPACE_SECTION_COPY[activeSection];
  const listHref = projectsListBackHref(listSource);
  const listLabel = projectsListBackLabel(listSource);

  if (loading) {
    return (
      <PageLayout title="Project" description="Loading project details…">
        <div className="flex min-h-0 flex-1 flex-col gap-4 @min-[720px]/shell:flex-row">
          <Skeleton className="h-48 w-full rounded-xl @min-[720px]/shell:w-56" />
          <Skeleton className="h-64 flex-1 rounded-xl" />
        </div>
      </PageLayout>
    );
  }

  if (error || !project) {
    return (
      <EmptyState
        title="Project not found"
        description={error ?? "This project may have been removed or you lack access."}
        action={
          <Button asChild variant="outline">
            <Link href={listHref}>Back to {listLabel}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <PageLayout
      title={
        <span className="inline-flex flex-wrap items-center gap-3">
          <ProjectNameWithColor
            name={project.name}
            color={project.color}
            className="text-xl font-semibold tracking-tight"
          />
          <Badge variant={project.isActive ? "default" : "secondary"}>
            {project.isActive ? "Active" : "Inactive"}
          </Badge>
        </span>
      }
      titleLabel={project.name}
      description={
        project.clientName ? `Client: ${project.clientName}. ${copy.description}` : copy.description
      }
      actions={
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-10 gap-1.5 border-border/80 bg-card shadow-none"
        >
          <Link href={listHref}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {listLabel}
          </Link>
        </Button>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 @min-[720px]/shell:flex-row @min-[720px]/shell:items-start">
        <aside className="w-full shrink-0 rounded-xl border border-border bg-card p-3 shadow-sm @min-[720px]/shell:w-56">
          <ProjectDetailNav
            projectId={project.id}
            includeSettings={!personal}
            listSource={listSource}
          />
        </aside>

        <section className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</section>
      </div>
    </PageLayout>
  );
}

export function ProjectDetailShell({ children }: { children: ReactNode }) {
  const params = useParams();
  const projectId = typeof params.projectId === "string" ? params.projectId : "";

  if (!projectId) {
    return (
      <EmptyState
        title="Invalid project"
        description="Choose a project from your projects list."
        action={
          <Button asChild variant="outline">
            <Link href="/my-projects">View My Projects</Link>
          </Button>
        }
      />
    );
  }

  return (
    <ProjectDetailProvider projectId={projectId}>
      <ProjectDetailShellInner>{children}</ProjectDetailShellInner>
    </ProjectDetailProvider>
  );
}
