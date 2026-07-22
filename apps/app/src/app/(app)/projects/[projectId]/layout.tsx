import { Suspense } from "react";
import { ProjectDetailShell } from "@/features/projects/project-detail-shell";

export default function ProjectDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ProjectDetailShell>{children}</ProjectDetailShell>
    </Suspense>
  );
}
