import { MemberProjectDetailShell } from "@/features/projects/member-project-detail-shell";

export default function MyProjectDetailLayout({ children }: { children: React.ReactNode }) {
  return <MemberProjectDetailShell>{children}</MemberProjectDetailShell>;
}
