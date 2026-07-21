"use client";

import type { MemberPermissionsDto, Permission } from "@kloqra/contracts";
import { ROUTES } from "@kloqra/contracts";
import {
  AppBar,
  AppBarListToolbar,
  Badge,
  Button,
  Card,
  CardContent,
  DataTableCard,
  EmptyState,
  Input,
  TableLoadingState
} from "@kloqra/ui";
import { canManageOrganization, useTenantMembers } from "@kloqra/web-shared";
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldX
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getWorkspaceId, useSessionStore } from "@/stores/session.store";

type ActionDimension = "VIEW" | "CREATE" | "EDIT" | "DELETE" | "EXPORT";
const ACTION_DIMENSIONS: ActionDimension[] = ["VIEW", "CREATE", "EDIT", "DELETE", "EXPORT"];

export function PermissionsStudioPage() {
  const session = useSessionStore((s) => s.session);
  const ws = session?.workspaceId ?? getWorkspaceId() ?? "";
  const canManage = canManageOrganization(session);

  const { members, loading: loadingMembers } = useTenantMembers();
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const [memberPermissions, setMemberPermissions] = useState<MemberPermissionsDto | null>(null);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [busyPermission, setBusyPermission] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  // Accordion expanded state per parent group
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "Organization Settings": true,
    "Billing & Data Export": true,
    "Workspaces & API": true,
    "Projects & Tasks": true,
    "Time Tracking & Approvals": true
  });

  // Auto-select first member when members load
  useEffect(() => {
    if (members.length > 0 && !selectedMemberId) {
      setSelectedMemberId(members[0].id);
    }
  }, [members, selectedMemberId]);

  const loadMemberPermissions = useCallback(
    async (memberId: string) => {
      if (!ws || !memberId) return;
      setLoadingPermissions(true);
      try {
        const res = await api<MemberPermissionsDto>(ROUTES.TENANTS.MEMBER_PERMISSIONS(memberId), {
          workspaceId: ws
        });
        setMemberPermissions(res);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not load member permissions.");
      } finally {
        setLoadingPermissions(false);
      }
    },
    [ws]
  );

  useEffect(() => {
    if (selectedMemberId) {
      void loadMemberPermissions(selectedMemberId);
    }
  }, [selectedMemberId, loadMemberPermissions]);

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return members;
    return members.filter(
      (m) => m.userName.toLowerCase().includes(query) || m.userEmail.toLowerCase().includes(query)
    );
  }, [members, memberSearch]);

  const selectedMember = useMemo(() => {
    return members.find((m) => m.id === selectedMemberId);
  }, [members, selectedMemberId]);

  const toggleMemberPermission = async (permissionId: Permission, currentAllowed: boolean) => {
    if (!ws || !selectedMemberId) return;
    const nextAllowed = !currentAllowed;
    setBusyPermission(permissionId);

    // Optimistic UI update
    setMemberPermissions((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.id === permissionId
            ? { ...item, allowed: nextAllowed, isCustomOverride: true }
            : item
        )
      };
    });

    try {
      const updated = await api<MemberPermissionsDto>(
        ROUTES.TENANTS.MEMBER_PERMISSIONS(selectedMemberId),
        {
          method: "PATCH",
          workspaceId: ws,
          body: JSON.stringify({ permission: permissionId, allowed: nextAllowed })
        }
      );
      setMemberPermissions(updated);
      toast.success(
        `${permissionId} ${nextAllowed ? "granted to" : "revoked from"} ${selectedMember?.userName}.`
      );
    } catch (err) {
      void loadMemberPermissions(selectedMemberId);
      toast.error(err instanceof Error ? err.message : "Could not update permission.");
    } finally {
      setBusyPermission(null);
    }
  };

  const restoreRoleDefaults = async () => {
    if (!ws || !selectedMemberId) return;
    setRestoring(true);
    try {
      const updated = await api<MemberPermissionsDto>(
        ROUTES.TENANTS.MEMBER_RESTORE_ROLE_DEFAULTS(selectedMemberId),
        {
          method: "POST",
          workspaceId: ws
        }
      );
      setMemberPermissions(updated);
      toast.success(`Restored canonical role defaults for ${selectedMember?.userName}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not restore role defaults.");
    } finally {
      setRestoring(false);
    }
  };

  // Group items by parentGroup
  const groupedItems = useMemo(() => {
    if (!memberPermissions) return {};
    const groups: Record<string, typeof memberPermissions.items> = {};
    for (const item of memberPermissions.items) {
      const groupName = item.parentGroup || "General Settings";
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(item);
    }
    return groups;
  }, [memberPermissions]);

  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
        <ShieldX className="size-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Organization owner or admin access is required to view and configure member permissions
          studio.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AppBar
        title="Permissions studio"
        description="Inspect, customize, and manage granular endpoint capabilities per member with action-dimension controls."
        secondary={
          <AppBarListToolbar
            searchValue=""
            onSearchChange={() => {}}
            searchPlaceholder=""
            searchAriaLabel="Search permissions studio"
            action={
              <Button type="button" variant="outline" size="sm" asChild>
                <Link href="/account/access-audit" className="gap-1.5">
                  <ClipboardList className="size-4" /> Access Audit Log
                </Link>
              </Button>
            }
          />
        }
      />

      {/* Main Studio 2-Column Interface */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Searchable Member Directory */}
        <div className="md:col-span-4 lg:col-span-3 border rounded-xl bg-card overflow-hidden shadow-sm">
          <div className="p-3.5 border-b bg-muted/20 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Organization Members ({members.length})
            </span>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search agents or teams…"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>
          </div>

          <div className="max-h-[650px] overflow-y-auto divide-y">
            {loadingMembers ? (
              <div className="p-4 space-y-2">
                <TableLoadingState rows={5} columns={1} />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No members match query.
              </div>
            ) : (
              filteredMembers.map((m) => {
                const active = m.id === selectedMemberId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMemberId(m.id)}
                    className={`w-full text-left p-3 flex items-center justify-between transition-colors ${
                      active
                        ? "bg-primary/10 border-l-4 border-primary pl-2.5 font-medium"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                        {m.userName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="truncate space-y-0.5">
                        <p className="text-xs font-medium truncate">{m.userName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{m.userEmail}</p>
                      </div>
                    </div>
                    <Badge
                      variant={m.role === "OWNER" ? "default" : "secondary"}
                      className="text-[9px] px-1.5 py-0 shrink-0"
                    >
                      {m.role === "OWNER" ? "Owner" : "Admin"}
                    </Badge>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Member Profile Header & Action-Dimension Matrix Table */}
        <div className="md:col-span-8 lg:col-span-9 space-y-4">
          {selectedMember && (
            <Card className="border shadow-sm">
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="size-12 rounded-full bg-primary/15 text-primary flex items-center justify-center text-base font-bold shrink-0">
                    {selectedMember.userName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold">{selectedMember.userName}</h2>
                      <Badge variant="outline" className="text-xs font-mono">
                        {selectedMember.role === "OWNER"
                          ? "Organization Owner"
                          : "Organization Admin"}
                      </Badge>
                      {memberPermissions && memberPermissions.customOverridesCount > 0 && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-200"
                        >
                          {memberPermissions.customOverridesCount} Custom Overrides
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{selectedMember.userEmail}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={restoring || loadingPermissions}
                    onClick={() => void restoreRoleDefaults()}
                    className="gap-1.5 text-xs"
                  >
                    <RotateCcw className="size-3.5" />
                    Restore role defaults
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action-Dimension Matrix Grid */}
          <DataTableCard>
            {loadingPermissions ? (
              <div className="p-6">
                <TableLoadingState rows={8} columns={6} />
              </div>
            ) : !memberPermissions ? (
              <div className="p-10">
                <EmptyState
                  title="Select a member"
                  description="Select an organization member from the directory to configure their granular permission matrix."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                      <th className="p-3 w-1/3">Permission Domain</th>
                      {ACTION_DIMENSIONS.map((dim) => (
                        <th key={dim} className="p-3 text-center w-24 tracking-wider">
                          {dim}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Object.entries(groupedItems).map(([groupName, groupItems]) => {
                      const expanded = expandedGroups[groupName] ?? true;

                      // Calculate Indeterminate / Partial grant state for parent accordion
                      const totalAllowed = groupItems.filter((i) => i.allowed).length;
                      const allAllowed = totalAllowed === groupItems.length;
                      const noneAllowed = totalAllowed === 0;
                      const isPartial = !allAllowed && !noneAllowed;

                      return (
                        <FragmentContainer key={groupName}>
                          {/* Parent Group Header Row */}
                          <tr
                            onClick={() =>
                              setExpandedGroups((prev) => ({
                                ...prev,
                                [groupName]: !expanded
                              }))
                            }
                            className="bg-muted/20 hover:bg-muted/40 cursor-pointer font-medium select-none"
                          >
                            <td className="p-3 font-semibold flex items-center gap-2 text-foreground">
                              {expanded ? (
                                <ChevronDown className="size-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="size-4 text-muted-foreground" />
                              )}
                              <span>{groupName}</span>
                              {isPartial && (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] px-1.5 bg-blue-500/10 text-blue-600 border-blue-200"
                                >
                                  • Partial ({totalAllowed}/{groupItems.length})
                                </Badge>
                              )}
                            </td>
                            {ACTION_DIMENSIONS.map((dim) => {
                              const dimItems = groupItems.filter((i) => i.actionDimension === dim);
                              const dimAllowed = dimItems.filter((i) => i.allowed).length;
                              const dimPartial = dimAllowed > 0 && dimAllowed < dimItems.length;

                              return (
                                <td key={dim} className="p-3 text-center align-middle">
                                  {dimItems.length === 0 ? (
                                    <span className="text-muted-foreground/30">—</span>
                                  ) : dimPartial ? (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] px-1 font-mono text-amber-600 border-amber-300"
                                    >
                                      -
                                    </Badge>
                                  ) : dimAllowed > 0 ? (
                                    <span className="text-emerald-600 font-bold">✓ Yes</span>
                                  ) : (
                                    <span className="text-muted-foreground/40">No</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>

                          {/* Child Item Rows (Rendered when expanded) */}
                          {expanded &&
                            groupItems.map((item) => (
                              <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                                <td className="p-3 pl-8">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-foreground">
                                        {item.label}
                                      </span>
                                      {item.isCustomOverride && (
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] px-1 text-primary border-primary/30"
                                        >
                                          Override
                                        </Badge>
                                      )}
                                      {item.riskLevel === "high" && (
                                        <Badge
                                          variant="destructive"
                                          className="text-[9px] px-1 py-0 gap-0.5"
                                        >
                                          <ShieldAlert className="size-2.5" /> High Risk
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="font-mono text-[10px] text-muted-foreground">
                                      {item.id}
                                    </p>
                                  </div>
                                </td>

                                {ACTION_DIMENSIONS.map((dim) => {
                                  const matchesDim = item.actionDimension === dim;
                                  if (!matchesDim) {
                                    return (
                                      <td
                                        key={dim}
                                        className="p-3 text-center align-middle text-muted-foreground/20"
                                      >
                                        —
                                      </td>
                                    );
                                  }

                                  const busy = busyPermission === item.id;

                                  return (
                                    <td key={dim} className="p-3 text-center align-middle">
                                      <div className="flex items-center justify-center gap-1.5">
                                        <input
                                          type="checkbox"
                                          checked={item.allowed}
                                          disabled={busy}
                                          onChange={() =>
                                            void toggleMemberPermission(item.id, item.allowed)
                                          }
                                          className="size-4 rounded border-muted-foreground/30 accent-primary cursor-pointer disabled:cursor-not-allowed"
                                        />
                                        <span
                                          className={
                                            item.allowed
                                              ? "text-emerald-700 font-semibold"
                                              : "text-muted-foreground/60"
                                          }
                                        >
                                          {item.allowed ? "Yes" : "No"}
                                        </span>
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                        </FragmentContainer>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </DataTableCard>
        </div>
      </div>
    </div>
  );
}

function FragmentContainer({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
