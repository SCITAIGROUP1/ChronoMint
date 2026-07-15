"use client";

import { ROUTES, DEFAULT_TABLE_PAGE_SIZE } from "@kloqra/contracts";
import type {
  ProvisionProjectTeamMembersResponseDto,
  TeamMemberDto,
  WorkspaceMemberDto
} from "@kloqra/contracts";
import {
  AppModal,
  Badge,
  Button,
  ConfirmDialog,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  EmptyState,
  Input,
  Label,
  SearchableSelect,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableHeader,
  TablePagination,
  TableRow,
  TableToolbar,
  TableLoadingState
} from "@kloqra/ui";
import {
  useSessionStore,
  buildTableQuery,
  apiDownloadGet,
  saveDownloadResponse
} from "@kloqra/web-shared";
import {
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  Plus,
  Upload,
  UserPlus,
  Users,
  X
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useProjectDetail } from "./project-detail-context";
import {
  buildProjectTeamApprovalsHref,
  formatProjectPendingApprovalsTitle,
  shouldShowProjectPendingApprovalsBanner
} from "./project-team-approvals.util";
import { formatBulkInviteJobToast, waitForBulkInviteJob } from "./project-team-invite-job";
import {
  buildInvitePerson,
  mergeInvitePeople,
  parseProjectProvisionLines,
  type ProjectProvisionLine
} from "./project-team-provision.util";
import { usePendingTimesheets } from "@/features/approvals/use-pending-timesheets";
import { api } from "@/lib/api";

function memberIsActive(m: TeamMemberDto): boolean {
  return m.isActive !== false;
}

function memberRoleLabel(role: TeamMemberDto["role"]): string {
  return role === "PROJECT_MANAGER" ? "Project manager" : "Member";
}

export function ProjectTeamTab() {
  const { workspaceId, projectId } = useProjectDetail();
  const workspaceRole = useSessionStore((s) => s.session?.workspaceRole);
  const canAssignLeadRole = workspaceRole === "ADMIN";
  const canProvisionOutside = workspaceRole === "ADMIN";
  const { pendingCount, loading: loadingPendingApprovals } = usePendingTimesheets(
    workspaceId,
    { projectId: [projectId], page: 1, limit: 1 },
    Boolean(workspaceId && projectId)
  );
  const approvalsHref = buildProjectTeamApprovalsHref(projectId);
  const showPendingApprovals = shouldShowProjectPendingApprovalsBanner(
    loadingPendingApprovals,
    pendingCount
  );
  const [teamMeta, setTeamMeta] = useState<{
    id: string;
    projectId: string;
    projectName: string;
  } | null>(null);
  const [members, setMembers] = useState<TeamMemberDto[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [limit, setLimit] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [error, setError] = useState<string | null>(null);
  const [memberBusyId, setMemberBusyId] = useState<string | null>(null);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<"workspace" | "invite">("workspace");
  const [invitePeople, setInvitePeople] = useState<ProjectProvisionLine[]>([]);
  const [inviteEmailDraft, setInviteEmailDraft] = useState("");
  const [inviteNameDraft, setInviteNameDraft] = useState("");
  const [inviteFieldError, setInviteFieldError] = useState<string | null>(null);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberDto[]>([]);
  const [loadingWorkspaceMembers, setLoadingWorkspaceMembers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TeamMemberDto | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const handleLimitChange = useCallback((nextLimit: number) => {
    setPage(1);
    setLimit(nextLimit);
  }, []);

  const loadTeam = useCallback(async () => {
    setLoadingTeam(true);
    try {
      const query = buildTableQuery(page, debouncedSearch, undefined, limit);
      const data = await api<{
        id: string;
        projectId: string;
        projectName: string;
        members: TeamMemberDto[];
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      }>(`${ROUTES.PROJECTS.TEAM(projectId)}?${query}`, { workspaceId });
      setTeamMeta({ id: data.id, projectId: data.projectId, projectName: data.projectName });
      setMembers(data.members);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      setTeamMeta(null);
      setMembers([]);
      setTotal(0);
      setTotalPages(0);
      toast.error("Could not load project team.");
    } finally {
      setLoadingTeam(false);
    }
  }, [workspaceId, projectId, page, debouncedSearch, limit]);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  const availableWorkspaceMembers = useMemo(() => {
    const onTeam = new Set(members.map((m) => m.userId));
    return workspaceMembers.filter((m) => !onTeam.has(m.userId));
  }, [workspaceMembers, members]);

  const selectedMember = useMemo(
    () => availableWorkspaceMembers.find((member) => member.userId === selectedUserId),
    [availableWorkspaceMembers, selectedUserId]
  );

  function resetInviteDraft() {
    setInvitePeople([]);
    setInviteEmailDraft("");
    setInviteNameDraft("");
    setInviteFieldError(null);
    setBulkFile(null);
  }

  function addInvitePerson(person: ProjectProvisionLine) {
    setInvitePeople((prev) => mergeInvitePeople(prev, [person]));
    setInviteEmailDraft("");
    setInviteNameDraft("");
    setInviteFieldError(null);
    if (error) setError(null);
  }

  function tryAddFromDraft() {
    const person = buildInvitePerson(inviteEmailDraft, inviteNameDraft);
    if (!person) {
      setInviteFieldError(
        inviteEmailDraft.trim() ? "Enter a valid email address." : "Email is required."
      );
      return;
    }
    addInvitePerson(person);
  }

  function removeInvitePerson(email: string) {
    setInvitePeople((prev) => prev.filter((p) => p.email !== email));
  }

  async function openAddModal() {
    setAddOpen(true);
    setAddMode("workspace");
    setSelectedUserId("");
    resetInviteDraft();
    setLoadingWorkspaceMembers(true);
    try {
      const list = await api<WorkspaceMemberDto[]>(ROUTES.WORKSPACES.MEMBERS(workspaceId), {
        workspaceId
      });
      setWorkspaceMembers(list);
    } catch {
      toast.error("Could not load workspace members.");
      setWorkspaceMembers([]);
    } finally {
      setLoadingWorkspaceMembers(false);
    }
  }

  async function addMember() {
    if (!selectedUserId) return;
    setAddingMember(true);
    setError(null);
    try {
      await api(ROUTES.PROJECTS.TEAM_MEMBERS(projectId), {
        method: "POST",
        workspaceId,
        body: JSON.stringify({ userId: selectedUserId })
      });
      setAddOpen(false);
      setSelectedUserId("");
      await loadTeam();
      toast.success("Member added to project team.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not add team member.";
      setError(message);
      toast.error(message);
    } finally {
      setAddingMember(false);
    }
  }

  async function provisionOutsideMembers() {
    if (invitePeople.length === 0) {
      setError("Add at least one person to invite.");
      return;
    }
    setAddingMember(true);
    setError(null);
    try {
      const result = await api<ProvisionProjectTeamMembersResponseDto>(
        ROUTES.PROJECTS.TEAM_MEMBERS_PROVISION(projectId),
        {
          method: "POST",
          workspaceId,
          body: JSON.stringify({ members: invitePeople })
        }
      );
      setAddOpen(false);
      resetInviteDraft();
      toast.info(
        result.enqueuedCount === 1 ? "Invite started…" : `${result.enqueuedCount} invites started…`
      );
      void (async () => {
        try {
          const status = await waitForBulkInviteJob({
            api,
            workspaceId,
            projectId,
            jobId: result.jobId
          });
          const toastInfo = formatBulkInviteJobToast(status);
          if (toastInfo.tone === "error") toast.error(toastInfo.message);
          else if (toastInfo.tone === "warning") toast.warning(toastInfo.message);
          else toast.success(toastInfo.message);
          await loadTeam();
        } catch (e) {
          toast.warning(e instanceof Error ? e.message : "Invite is still processing.");
          await loadTeam();
        }
      })();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not invite members.";
      setError(message);
      toast.error(message);
    } finally {
      setAddingMember(false);
    }
  }

  async function downloadBulkTemplate() {
    try {
      const res = await apiDownloadGet(
        ROUTES.PROJECTS.TEAM_MEMBERS_BULK_TEMPLATE(projectId),
        workspaceId
      );
      await saveDownloadResponse(res, "project_team_invite_template.xlsx");
      toast.success("Template downloaded.");
    } catch {
      toast.error("Could not download template.");
    }
  }

  async function uploadBulkInvite() {
    if (!bulkFile) {
      toast.error("Choose an Excel or CSV file first.");
      return;
    }
    setBulkUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", bulkFile);
      const res = await api<{ jobId: string; status: string; enqueuedCount: number }>(
        ROUTES.PROJECTS.TEAM_MEMBERS_BULK_UPLOAD(projectId),
        {
          method: "POST",
          workspaceId,
          body: formData
        }
      );
      toast.info(
        res.enqueuedCount === 1 ? "Import started…" : `Import started for ${res.enqueuedCount}…`
      );
      setAddOpen(false);
      resetInviteDraft();
      void (async () => {
        try {
          const status = await waitForBulkInviteJob({
            api,
            workspaceId,
            projectId,
            jobId: res.jobId
          });
          const toastInfo = formatBulkInviteJobToast(status);
          if (toastInfo.tone === "error") toast.error(toastInfo.message);
          else if (toastInfo.tone === "warning") toast.warning(toastInfo.message);
          else toast.success(toastInfo.message);
          await loadTeam();
        } catch (e) {
          toast.warning(e instanceof Error ? e.message : "Import is still processing.");
          await loadTeam();
        }
      })();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not upload invite file.";
      setError(message);
      toast.error(message);
    } finally {
      setBulkUploading(false);
    }
  }

  async function setMemberRole(member: TeamMemberDto, role: TeamMemberDto["role"]) {
    if (role === member.role) return;
    setMemberBusyId(member.id);
    setError(null);
    try {
      await api(ROUTES.PROJECTS.TEAM_MEMBER(projectId, member.id), {
        method: "PATCH",
        workspaceId,
        body: JSON.stringify({ role })
      });
      await loadTeam();
      toast.success(`Role updated to ${memberRoleLabel(role).toLowerCase()}.`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not update project role.";
      setError(message);
      toast.error(message);
    } finally {
      setMemberBusyId(null);
    }
  }

  async function setMemberActive(member: TeamMemberDto, isActive: boolean) {
    setMemberBusyId(member.id);
    setError(null);
    try {
      await api(ROUTES.PROJECTS.TEAM_MEMBER(projectId, member.id), {
        method: "PATCH",
        workspaceId,
        body: JSON.stringify({ isActive })
      });
      await loadTeam();
      toast.success(isActive ? "Member activated." : "Member deactivated.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not update team member.";
      setError(message);
      toast.error(message);
    } finally {
      setMemberBusyId(null);
    }
  }

  async function removeMember(member: TeamMemberDto) {
    setMemberBusyId(member.id);
    setError(null);
    try {
      await api(ROUTES.PROJECTS.TEAM_MEMBER(projectId, member.id), {
        method: "DELETE",
        workspaceId
      });
      setRemoveTarget(null);
      await loadTeam();
      toast.success(`${member.userName} removed from team.`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not remove team member.";
      setError(message);
      toast.error(message);
    } finally {
      setMemberBusyId(null);
    }
  }

  const activeCount = members.filter(memberIsActive).length;

  return (
    <div className="space-y-6">
      {showPendingApprovals ? (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardCheck className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                {formatProjectPendingApprovalsTitle(pendingCount)}
              </p>
              <p className="text-sm text-muted-foreground">
                Review submitted time for this project team.
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" className="h-9 shrink-0" asChild>
            <Link href={approvalsHref}>Review approvals</Link>
          </Button>
        </div>
      ) : null}

      <DataTableCard>
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search team members…"
          searchAriaLabel="Search project team members"
          actions={
            <Button type="button" className="h-10" onClick={() => void openAddModal()}>
              {canProvisionOutside ? "Add or invite" : "Add team member"}
            </Button>
          }
        />
        <div className="border-b border-border/60 px-6 py-3">
          <p className="text-sm text-muted-foreground">
            {loadingTeam
              ? "Loading members…"
              : teamMeta
                ? `${teamMeta.projectName} · ${activeCount} active on this page`
                : "Team members"}
          </p>
        </div>
        {loadingTeam ? (
          <TableLoadingState rows={5} columns={canAssignLeadRole ? 5 : 4} />
        ) : members.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No one on this team yet"
              description={
                canProvisionOutside
                  ? "Invite people by email, or add someone already in this workspace."
                  : "Ask a workspace admin to invite members, or add someone already in this workspace."
              }
              action={
                <Button type="button" onClick={() => void openAddModal()}>
                  {canProvisionOutside ? "Add or invite" : "Add team member"}
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <DataTableHeaderRow>
                  <DataTableHead>Member</DataTableHead>
                  <DataTableHead>Email</DataTableHead>
                  <DataTableHead>Role</DataTableHead>
                  <DataTableHead>Status</DataTableHead>
                  <DataTableHead className="text-right">Actions</DataTableHead>
                </DataTableHeaderRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <DataTableCell className="font-medium">{m.userName}</DataTableCell>
                    <DataTableCell className="text-muted-foreground">{m.userEmail}</DataTableCell>
                    <DataTableCell>
                      {canAssignLeadRole ? (
                        <Select
                          value={m.role}
                          disabled={memberBusyId === m.id}
                          onValueChange={(value) =>
                            void setMemberRole(m, value as TeamMemberDto["role"])
                          }
                        >
                          <SelectTrigger className="h-8 w-[9.5rem]" aria-label="Project role">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MEMBER">Member</SelectItem>
                            <SelectItem value="PROJECT_MANAGER">Project manager</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={m.role === "PROJECT_MANAGER" ? "default" : "secondary"}>
                          {memberRoleLabel(m.role)}
                        </Badge>
                      )}
                    </DataTableCell>
                    <DataTableCell>
                      <Badge variant={memberIsActive(m) ? "default" : "secondary"}>
                        {memberIsActive(m) ? "Active" : "Inactive"}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={memberBusyId === m.id}
                          onClick={() => setMemberActive(m, !memberIsActive(m))}
                        >
                          {memberIsActive(m) ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={memberBusyId === m.id}
                          onClick={() => setRemoveTarget(m)}
                        >
                          Remove
                        </Button>
                      </div>
                    </DataTableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={handleLimitChange}
              disabled={loadingTeam}
            />
          </>
        )}
      </DataTableCard>

      <AppModal
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) {
            setSelectedUserId("");
            resetInviteDraft();
            setAddMode("workspace");
            setError(null);
          }
        }}
        title={addMode === "invite" ? "Invite to project" : "Add team member"}
        description={
          addMode === "invite"
            ? "They join this workspace and project, then get one welcome email."
            : "Pick someone already in this workspace to assign to the project."
        }
        icon={<UserPlus className="size-5" />}
        size="lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            {addMode === "invite" ? (
              <Button
                type="button"
                disabled={addingMember || invitePeople.length === 0}
                onClick={() => void provisionOutsideMembers()}
              >
                {addingMember
                  ? "Sending…"
                  : invitePeople.length > 0
                    ? `Invite ${invitePeople.length}`
                    : "Invite"}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={!selectedUserId || addingMember || loadingWorkspaceMembers}
                onClick={() => void addMember()}
              >
                {addingMember ? "Adding…" : "Add member"}
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-4">
          {canProvisionOutside ? (
            <SegmentedControl
              fullWidth
              value={addMode}
              onChange={(mode) => {
                setAddMode(mode);
                setError(null);
                setInviteFieldError(null);
              }}
              options={[
                { value: "workspace" as const, label: "From workspace" },
                { value: "invite" as const, label: "Invite by email" }
              ]}
            />
          ) : null}

          {addMode === "invite" ? (
            <div className="space-y-4">
              <div className="grid items-end gap-2 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_auto]">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-email-draft">Email</Label>
                  <Input
                    id="invite-email-draft"
                    type="email"
                    autoComplete="off"
                    placeholder="ada@example.com"
                    value={inviteEmailDraft}
                    onChange={(e) => {
                      setInviteEmailDraft(e.target.value);
                      if (inviteFieldError) setInviteFieldError(null);
                    }}
                    onPaste={(e) => {
                      const text = e.clipboardData.getData("text");
                      if (!text.includes("\n") && !text.includes(",") && !text.includes(";")) {
                        return;
                      }
                      e.preventDefault();
                      const parsed = parseProjectProvisionLines(text);
                      if (parsed.members.length === 0) {
                        setInviteFieldError(parsed.errors[0] ?? "Could not parse pasted emails.");
                        return;
                      }
                      setInvitePeople((prev) => mergeInvitePeople(prev, parsed.members));
                      setInviteEmailDraft("");
                      setInviteNameDraft("");
                      setInviteFieldError(null);
                      toast.success(
                        parsed.members.length === 1
                          ? "Added 1 person from paste."
                          : `Added ${parsed.members.length} people from paste.`
                      );
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        tryAddFromDraft();
                      }
                    }}
                    aria-invalid={Boolean(inviteFieldError)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-name-draft">
                    Name <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="invite-name-draft"
                    autoComplete="off"
                    placeholder="Ada Lovelace"
                    value={inviteNameDraft}
                    onChange={(e) => setInviteNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        tryAddFromDraft();
                      }
                    }}
                  />
                </div>
                <Button type="button" variant="outline" onClick={() => tryAddFromDraft()}>
                  <Plus className="size-4" aria-hidden />
                  Add
                </Button>
              </div>
              {inviteFieldError ? (
                <p className="text-xs text-destructive">{inviteFieldError}</p>
              ) : null}

              {invitePeople.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {invitePeople.length} ready to invite
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setInvitePeople([])}
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                    {invitePeople.map((person) => (
                      <Badge
                        key={person.email}
                        variant="secondary"
                        className="max-w-full gap-1 py-1 pl-2 pr-0.5 font-normal"
                      >
                        <span className="min-w-0 truncate text-xs sm:text-sm">
                          <span className="font-medium">{person.name}</span>
                          <span className="text-muted-foreground"> · {person.email}</span>
                        </span>
                        <button
                          type="button"
                          className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label={`Remove ${person.name}`}
                          onClick={() => removeInvitePerson(person.email)}
                        >
                          <X className="size-3.5" aria-hidden />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              <details className="group rounded-md border border-border/60">
                <summary className="cursor-pointer list-none px-3 py-2 text-sm text-muted-foreground marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2">
                      <FileSpreadsheet className="size-3.5" aria-hidden />
                      Import from Excel or CSV
                    </span>
                    <span className="text-xs group-open:hidden">Optional</span>
                  </span>
                </summary>
                <div className="space-y-2 border-t border-border/60 px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 px-2 text-xs"
                      onClick={() => void downloadBulkTemplate()}
                    >
                      <Download className="size-3.5" aria-hidden />
                      Download template
                    </Button>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <label className="relative flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md border border-dashed border-border/80 px-3 py-2 hover:bg-muted/20">
                      <input
                        type="file"
                        accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                        className="absolute inset-0 cursor-pointer opacity-0"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          setBulkFile(file);
                        }}
                      />
                      <Upload className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <p className="truncate text-sm">
                        {bulkFile ? bulkFile.name : "Choose .xlsx or .csv"}
                      </p>
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled={!bulkFile || bulkUploading}
                      onClick={() => void uploadBulkInvite()}
                    >
                      {bulkUploading ? "Importing…" : "Import"}
                    </Button>
                  </div>
                </div>
              </details>
            </div>
          ) : (
            <div className="space-y-3">
              <Label htmlFor="member-search">Workspace member</Label>
              {loadingWorkspaceMembers ? (
                <p className="text-sm text-muted-foreground">Loading members…</p>
              ) : availableWorkspaceMembers.length === 0 ? (
                <div className="space-y-3 rounded-lg border border-dashed border-border px-4 py-5 text-center">
                  <Users className="mx-auto size-8 text-muted-foreground/70" aria-hidden />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">No one left to add</p>
                    <p className="text-sm text-muted-foreground">
                      Everyone in this workspace is already on the project, or the workspace is
                      empty.
                    </p>
                  </div>
                  {canProvisionOutside ? (
                    <Button type="button" size="sm" onClick={() => setAddMode("invite")}>
                      Invite someone by email
                    </Button>
                  ) : (
                    <Button type="button" size="sm" variant="outline" asChild>
                      <Link href="/team-management">Open Team Management</Link>
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <SearchableSelect
                    id="member-search"
                    value={selectedUserId}
                    onValueChange={setSelectedUserId}
                    options={availableWorkspaceMembers.map((member) => ({
                      value: member.userId,
                      label: member.userName,
                      keywords: member.userEmail
                    }))}
                    placeholder="Search by name or email…"
                    searchPlaceholder="Search by name or email…"
                    emptyMessage="No members match your search."
                    aria-label="Workspace member"
                    contentClassName="z-[100]"
                    renderOption={(option) => {
                      const member = availableWorkspaceMembers.find(
                        (item) => item.userId === option.value
                      );
                      return (
                        <span className="flex flex-col items-start gap-0.5">
                          <span className="font-medium">{option.label}</span>
                          {member ? (
                            <span className="text-xs text-muted-foreground">
                              {member.userEmail}
                            </span>
                          ) : null}
                        </span>
                      );
                    }}
                  />
                  {selectedMember ? (
                    <p className="rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                      Adding{" "}
                      <span className="font-medium text-foreground">{selectedMember.userName}</span>{" "}
                      ({selectedMember.userEmail}) to this project only.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          )}
        </div>
      </AppModal>

      <ConfirmDialog
        open={removeTarget !== null}
        title="Remove from project team?"
        description={
          removeTarget
            ? `${removeTarget.userName} will lose access to this project but remain in the workspace.`
            : undefined
        }
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (removeTarget) void removeMember(removeTarget);
        }}
        onCancel={() => setRemoveTarget(null)}
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
