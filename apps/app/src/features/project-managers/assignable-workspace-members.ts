import type { WorkspaceMemberPickerDto } from "@kloqra/contracts";

type AssignableMemberRow = WorkspaceMemberPickerDto & {
  role?: "ADMIN" | "MEMBER";
  isActive?: boolean;
};

/** Members eligible to promote to project manager on a project. */
export function assignableWorkspaceMembers(
  rows: AssignableMemberRow[]
): WorkspaceMemberPickerDto[] {
  return rows.filter((member) => {
    if (member.isActive === false) return false;
    if (member.role !== undefined && member.role !== "MEMBER") return false;
    return Boolean(member.userId && member.userName);
  });
}
