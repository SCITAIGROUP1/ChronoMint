"use client";

import {
  type EffectivePermissionItemDto,
  type ManagedRole,
  type Permission,
  type PermissionCatalogItemDto,
  type PermissionRiskLevel,
  type PolicyConfigurationDto,
  type PolicyTargetDto,
  type ResourceScope
} from "@kloqra/contracts";
import {
  AppBar,
  Badge,
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  EmptyState,
  Input,
  Label,
  PermissionTriStateControl,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton
} from "@kloqra/ui";
import {
  ApiRequestError,
  canManageOrganization,
  usePermissionPolicy,
  usePermissionPolicyCatalog,
  usePrincipalPolicyDirectory,
  useRolePolicyDirectory,
  useSavePermissionPolicy
} from "@kloqra/web-shared";
import { ArrowLeft, ChevronDown, History, RotateCcw, Search, Undo2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { usePermissionDraftStore } from "./permission-draft.store";
import { useSessionStore } from "@/stores/session.store";

type StudioMode = "roles" | "members";
type FilterValue<T extends string> = "ALL" | T;

const SOURCE_LABELS: Record<EffectivePermissionItemDto["source"], string> = {
  SYSTEM_DENY: "System denial",
  PRINCIPAL_DENY: "Member denial",
  PRINCIPAL_ALLOW: "Member allowance",
  ROLE_POLICY: "Role override",
  CANONICAL_ROLE: "Role template",
  DEFAULT_DENY: "Default denial"
};

function policyTargetKey(target: PolicyTargetDto): string {
  return target.type === "ROLE" ? `role:${target.role}` : `principal:${target.principalId}`;
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function PermissionsStudioPage() {
  const session = useSessionStore((state) => state.session);
  const canManage = canManageOrganization(session);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mode: StudioMode = searchParams.get("view") === "members" ? "members" : "roles";
  const selectedId = searchParams.get("target");
  const [directorySearch, setDirectorySearch] = useState("");
  const [permissionSearch, setPermissionSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<FilterValue<ResourceScope>>("ALL");
  const [riskFilter, setRiskFilter] = useState<FilterValue<PermissionRiskLevel>>("ALL");
  const [reviewing, setReviewing] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmingHighRisk, setConfirmingHighRisk] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const directoryRef = useRef<HTMLElement | null>(null);
  const lastSelectedIdRef = useRef<string | null>(selectedId);
  const restoreDirectoryFocusRef = useRef(false);

  const directoryQuery = useMemo(
    () => ({
      page: 1,
      limit: 100,
      ...(directorySearch.trim() ? { search: directorySearch.trim() } : {})
    }),
    [directorySearch]
  );
  const roles = useRolePolicyDirectory(directoryQuery, canManage && mode === "roles");
  const members = usePrincipalPolicyDirectory(directoryQuery, canManage && mode === "members");
  const catalog = usePermissionPolicyCatalog(canManage);
  const directory = mode === "roles" ? roles.data?.items : members.data?.items;
  const selectedDirectoryItem = directory?.find((item) =>
    item.target.type === "ROLE"
      ? item.target.role === selectedId
      : item.target.principalId === selectedId
  );
  const target = selectedDirectoryItem?.target ?? null;
  const policy = usePermissionPolicy(target, canManage && Boolean(target));
  const savePolicy = useSavePermissionPolicy();
  const draft = usePermissionDraftStore((state) => state.values);
  const history = usePermissionDraftStore((state) => state.history);
  const beginDraft = usePermissionDraftStore((state) => state.begin);
  const setDraft = usePermissionDraftStore((state) => state.set);
  const undoDraft = usePermissionDraftStore((state) => state.undo);
  const discardDraft = usePermissionDraftStore((state) => state.discard);

  function updateLocation(nextMode: StudioMode, nextTarget?: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", nextMode);
    if (nextTarget) params.set("target", nextTarget);
    else params.delete("target");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    if (target && policy.data) {
      beginDraft(policyTargetKey(target), policy.data.revision);
      setReviewing(false);
      setConflictMessage(null);
    }
  }, [beginDraft, policy.data, target]);

  useEffect(() => {
    if (selectedId || !restoreDirectoryFocusRef.current) return;
    restoreDirectoryFocusRef.current = false;
    const lastId = lastSelectedIdRef.current;
    requestAnimationFrame(() => {
      const buttons =
        directoryRef.current?.querySelectorAll<HTMLButtonElement>("[data-policy-target]");
      [...(buttons ?? [])].find((button) => button.dataset.policyTarget === lastId)?.focus();
    });
  }, [directory, selectedId]);

  const configuredByPermission = useMemo(
    () => new Map(policy.data?.items.map((item) => [item.permission, item.configured]) ?? []),
    [policy.data]
  );
  const changedEntries = useMemo(
    () =>
      Object.entries(draft).filter(
        ([permission, configured]) =>
          configured !== undefined &&
          configuredByPermission.get(permission as Permission) !== configured
      ) as Array<[Permission, PolicyConfigurationDto]>,
    [configuredByPermission, draft]
  );
  const catalogByPermission = useMemo(
    () => new Map(catalog.data?.map((item) => [item.id, item]) ?? []),
    [catalog.data]
  );
  const highRiskChanges = changedEntries.filter(([permission]) => {
    const risk = catalogByPermission.get(permission)?.riskLevel;
    return risk === "high" || risk === "critical";
  });

  const visibleItems = useMemo(() => {
    const normalized = permissionSearch.trim().toLowerCase();
    return (policy.data?.items ?? []).filter((item) => {
      const meta = catalogByPermission.get(item.permission);
      if (!meta) return false;
      if (scopeFilter !== "ALL" && meta.resourceScope !== scopeFilter) return false;
      if (riskFilter !== "ALL" && meta.riskLevel !== riskFilter) return false;
      return (
        !normalized ||
        meta.label.toLowerCase().includes(normalized) ||
        meta.description.toLowerCase().includes(normalized) ||
        meta.id.toLowerCase().includes(normalized) ||
        meta.parentGroup.toLowerCase().includes(normalized)
      );
    });
  }, [catalogByPermission, permissionSearch, policy.data, riskFilter, scopeFilter]);

  const groups = useMemo(() => {
    const grouped = new Map<string, EffectivePermissionItemDto[]>();
    for (const item of visibleItems) {
      const group = catalogByPermission.get(item.permission)?.parentGroup ?? "Other";
      grouped.set(group, [...(grouped.get(group) ?? []), item]);
    }
    return [...grouped.entries()];
  }, [catalogByPermission, visibleItems]);

  const immutable =
    selectedDirectoryItem && "immutable" in selectedDirectoryItem
      ? selectedDirectoryItem.immutable
      : selectedDirectoryItem && "active" in selectedDirectoryItem
        ? !selectedDirectoryItem.active
        : false;
  const principalRoles =
    selectedDirectoryItem && "roles" in selectedDirectoryItem ? selectedDirectoryItem.roles : [];

  async function submitChanges() {
    if (!target || !policy.data || changedEntries.length === 0) return;
    if (reason.trim().length < 3) {
      toast.error("Add a reason of at least 3 characters.");
      return;
    }
    try {
      const idempotencyKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `studio-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await savePolicy.mutateAsync({
        expectedRevision: policy.data.revision,
        idempotencyKey,
        reason: reason.trim(),
        atomic: true,
        mutations: changedEntries.map(([permission, configured]) => ({
          permission,
          target,
          configured
        }))
      });
      discardDraft();
      setReviewing(false);
      setConfirmingHighRisk(false);
      setReason("");
      setAnnouncement(`${changedEntries.length} permission changes saved.`);
      toast.success(`${changedEntries.length} permission changes saved.`);
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        (error.status === 409 || error.code === "POLICY_CONFLICT")
      ) {
        setConflictMessage(
          "This policy changed in another session. The latest revision was loaded; review your draft and save again."
        );
        await policy.refetch();
        setAnnouncement("Revision conflict detected. Latest policy loaded.");
      } else {
        toast.error(error instanceof Error ? error.message : "Could not save policy changes.");
      }
    }
  }

  if (!canManage) {
    return (
      <EmptyState
        title="Permission Studio unavailable"
        description="Your current organization context does not expose permission policy management."
      />
    );
  }

  const directoryLoading = mode === "roles" ? roles.isLoading : members.isLoading;
  const directoryError = mode === "roles" ? roles.error : members.error;
  const directoryStale =
    mode === "roles" ? roles.isFetching && !!roles.data : members.isFetching && !!members.data;

  return (
    <div className="space-y-5">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      <AppBar
        title="Permission Studio"
        description="Configure authoritative role templates and member overrides with revision-safe batch changes."
        actions={
          <Button variant="outline" size="sm" asChild>
            <a href="/account/access-audit">
              <History className="mr-2 size-4" />
              Policy audit
            </a>
          </Button>
        }
        secondary={
          <div className="flex w-full min-w-0 flex-col gap-3 py-2 sm:flex-row sm:items-center">
            <div className="w-full shrink-0 sm:w-auto sm:max-w-md">
              <SegmentedControl
                value={mode}
                onChange={(next) => updateLocation(next)}
                options={[
                  { value: "roles", label: "Role templates" },
                  { value: "members", label: "Member overrides" }
                ]}
                fullWidth
              />
            </div>
            <div className="relative min-w-[12rem] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={directorySearch}
                onChange={(event) => setDirectorySearch(event.target.value)}
                className="pl-9"
                type="search"
                aria-label={`Search ${mode === "roles" ? "role templates" : "members"}`}
                placeholder={mode === "roles" ? "Search role templates…" : "Search members…"}
              />
            </div>
          </div>
        }
      />

      {directoryStale ? (
        <p className="rounded-lg border border-status-warning-border bg-status-warning-bg px-3 py-2 text-xs text-status-warning-fg">
          Refreshing policy directory. Displayed results may be stale.
        </p>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <aside
          ref={directoryRef}
          aria-label={mode === "roles" ? "Role template directory" : "Member directory"}
          className={selectedId ? "hidden lg:block" : "block"}
        >
          <Card className="overflow-hidden">
            <div className="border-b bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {mode === "roles" ? "Managed roles" : "People with access"}
              </p>
            </div>
            <div className="max-h-[calc(100vh-18rem)] overflow-y-auto p-2">
              {directoryLoading ? (
                <div className="space-y-2 p-2" aria-label="Loading policy directory">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-16" />
                  ))}
                </div>
              ) : directoryError ? (
                <div role="alert" className="p-4 text-sm text-destructive">
                  {directoryError.message}
                </div>
              ) : !directory?.length ? (
                <p className="p-5 text-center text-sm text-muted-foreground">
                  No {mode === "roles" ? "roles" : "members"} match this search.
                </p>
              ) : (
                <div className="space-y-1">
                  {directory.map((item) => {
                    const itemId =
                      item.target.type === "ROLE" ? item.target.role : item.target.principalId;
                    const selected = itemId === selectedId;
                    return (
                      <button
                        key={itemId}
                        type="button"
                        data-policy-target={itemId}
                        aria-current={selected ? "true" : undefined}
                        onClick={() => {
                          lastSelectedIdRef.current = itemId;
                          updateLocation(mode, itemId);
                        }}
                        className={`min-h-14 w-full rounded-lg border px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          selected
                            ? "border-primary bg-primary/10"
                            : "border-transparent hover:bg-muted/60"
                        }`}
                      >
                        <span className="block truncate text-sm font-medium">
                          {item.displayName}
                        </span>
                        <span className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="truncate">
                            {"roles" in item && item.roles.length
                              ? item.roles.map((role) => titleCase(role)).join(" · ")
                              : "email" in item
                                ? item.email
                                : titleCase(item.target.role)}
                          </span>
                          <Badge variant="secondary">{item.overrideCount}</Badge>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </aside>

        <main className={selectedId ? "block" : "hidden lg:block"}>
          {!target ? (
            <EmptyState
              title={`Select ${mode === "roles" ? "a role template" : "a member"}`}
              description="Choose an entry from the directory to inspect configured and effective access."
            />
          ) : policy.isLoading || catalog.isLoading ? (
            <div className="space-y-3" aria-label="Loading permission policy">
              <Skeleton className="h-32" />
              <Skeleton className="h-72" />
            </div>
          ) : policy.error || catalog.error ? (
            <Card>
              <CardContent className="space-y-4 p-6" role="alert">
                <p className="text-sm text-destructive">
                  {(policy.error ?? catalog.error)?.message ?? "Could not load permission policy."}
                </p>
                <Button variant="outline" onClick={() => void policy.refetch()}>
                  Try again
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="lg:hidden"
                onClick={() => {
                  restoreDirectoryFocusRef.current = true;
                  updateLocation(mode);
                }}
              >
                <ArrowLeft className="mr-2 size-4" />
                Choose another {mode === "roles" ? "role" : "member"}
              </Button>

              <Card className="sticky top-3 z-20 border-primary/20 shadow-md">
                <CardContent className="space-y-4 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold">
                          {selectedDirectoryItem?.displayName}
                        </h2>
                        {immutable ? <Badge variant="secondary">Read only</Badge> : null}
                        <Badge variant="outline">Revision {policy.data?.revision}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {target.type === "ROLE"
                          ? `${titleCase(target.role)} · ${target.scope} scope`
                          : `${
                              selectedDirectoryItem && "email" in selectedDirectoryItem
                                ? selectedDirectoryItem.email
                                : ""
                            } · ${target.scope} scope`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={history.length === 0 || savePolicy.isPending}
                        onClick={() => {
                          undoDraft();
                          setAnnouncement("Last draft change undone.");
                        }}
                      >
                        <Undo2 className="mr-2 size-4" />
                        Undo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={changedEntries.length === 0 || savePolicy.isPending}
                        onClick={() => {
                          discardDraft();
                          setReviewing(false);
                          setAnnouncement("Draft changes discarded.");
                        }}
                      >
                        <RotateCcw className="mr-2 size-4" />
                        Discard
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={changedEntries.length === 0 || immutable}
                        onClick={() => setReviewing(true)}
                      >
                        Review {changedEntries.length} change
                        {changedEntries.length === 1 ? "" : "s"}
                      </Button>
                    </div>
                  </div>

                  {conflictMessage ? (
                    <div
                      role="alert"
                      className="rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-fg"
                    >
                      {conflictMessage}
                    </div>
                  ) : null}

                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="relative sm:col-span-1">
                      <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
                      <Input
                        value={permissionSearch}
                        onChange={(event) => setPermissionSearch(event.target.value)}
                        className="pl-9"
                        type="search"
                        aria-label="Search permissions"
                        placeholder="Search permissions…"
                      />
                    </div>
                    <Select
                      value={scopeFilter}
                      onValueChange={(value) => setScopeFilter(value as FilterValue<ResourceScope>)}
                    >
                      <SelectTrigger aria-label="Filter permissions by scope">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All scopes</SelectItem>
                        {["platform", "tenant", "workspace", "project", "self"].map((scope) => (
                          <SelectItem key={scope} value={scope}>
                            {titleCase(scope)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={riskFilter}
                      onValueChange={(value) =>
                        setRiskFilter(value as FilterValue<PermissionRiskLevel>)
                      }
                    >
                      <SelectTrigger aria-label="Filter permissions by risk">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All risk levels</SelectItem>
                        {["low", "medium", "high", "critical"].map((risk) => (
                          <SelectItem key={risk} value={risk}>
                            {titleCase(risk)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {reviewing ? (
                <Card className="border-primary/30">
                  <CardContent className="space-y-4 p-5">
                    <div>
                      <h3 className="font-semibold">Review draft batch</h3>
                      <p className="text-sm text-muted-foreground">
                        {changedEntries.length} changes will be saved atomically against revision{" "}
                        {policy.data?.revision}.
                      </p>
                    </div>
                    <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                      {changedEntries.map(([permission, configured]) => (
                        <li key={permission} className="flex justify-between gap-3">
                          <span>{catalogByPermission.get(permission)?.label ?? permission}</span>
                          <Badge variant="outline">{configured}</Badge>
                        </li>
                      ))}
                    </ul>
                    <div className="space-y-2">
                      <Label htmlFor="policy-change-reason">Reason for change</Label>
                      <Input
                        id="policy-change-reason"
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="Explain why this access is changing"
                      />
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="outline" onClick={() => setReviewing(false)}>
                        Continue editing
                      </Button>
                      <Button
                        disabled={savePolicy.isPending || reason.trim().length < 3}
                        onClick={() =>
                          highRiskChanges.length
                            ? setConfirmingHighRisk(true)
                            : void submitChanges()
                        }
                      >
                        {savePolicy.isPending ? "Saving…" : "Save batch"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {groups.length === 0 ? (
                <EmptyState
                  title="No permissions found"
                  description="Adjust search, scope, or risk filters to see permissions."
                />
              ) : (
                groups.map(([group, items]) => (
                  <PermissionGroup
                    key={group}
                    name={group}
                    items={items}
                    catalog={catalogByPermission}
                    target={target}
                    principalRoles={principalRoles}
                    draft={draft}
                    immutable={Boolean(immutable)}
                    onChange={(permission, configured) => {
                      setDraft(permission, configured);
                      setAnnouncement(
                        `${catalogByPermission.get(permission)?.label ?? permission} set to ${configured.toLowerCase()}.`
                      );
                    }}
                  />
                ))
              )}
            </div>
          )}
        </main>
      </div>

      <ConfirmDialog
        open={confirmingHighRisk}
        title={`Confirm ${highRiskChanges.length} high-risk change${highRiskChanges.length === 1 ? "" : "s"}?`}
        description="These changes can expose sensitive data or administrative actions. Confirm that the review reason is complete."
        confirmLabel="Confirm and save"
        destructive
        onConfirm={() => void submitChanges()}
        onCancel={() => setConfirmingHighRisk(false)}
      />
    </div>
  );
}

function PermissionGroup({
  name,
  items,
  catalog,
  target,
  principalRoles,
  draft,
  immutable,
  onChange
}: {
  name: string;
  items: EffectivePermissionItemDto[];
  catalog: Map<Permission, PermissionCatalogItemDto>;
  target: PolicyTargetDto;
  principalRoles: ManagedRole[];
  draft: Partial<Record<Permission, PolicyConfigurationDto>>;
  immutable: boolean;
  onChange: (permission: Permission, configured: PolicyConfigurationDto) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between bg-muted/30 px-4 py-3 text-left font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span>{name}</span>
        <ChevronDown className={`size-4 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open ? (
        <div className="divide-y">
          {items.map((item) => {
            const meta = catalog.get(item.permission);
            if (!meta) return null;
            const applicable =
              target.type === "ROLE"
                ? meta.applicableTargetRoles.includes(target.role)
                : principalRoles.some((role) => meta.applicableTargetRoles.includes(role));
            const disabled = immutable || !meta.customizable || !applicable;
            const configured = draft[item.permission] ?? item.configured;
            return (
              <article
                key={item.permission}
                className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold">{meta.label}</h4>
                    <Badge variant="outline">{titleCase(meta.riskLevel)} risk</Badge>
                    <Badge variant={item.effective === "ALLOW" ? "default" : "secondary"}>
                      Effective: {titleCase(item.effective)}
                    </Badge>
                    <Badge variant="secondary">{SOURCE_LABELS[item.source]}</Badge>
                    {!applicable ? <Badge variant="secondary">Not applicable</Badge> : null}
                    {!meta.customizable ? <Badge variant="secondary">Managed</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{meta.description}</p>
                  <p className="break-all font-mono text-[11px] text-muted-foreground">{meta.id}</p>
                  <details className="text-xs">
                    <summary className="cursor-pointer font-medium text-primary">Why?</summary>
                    <p className="mt-2 rounded-md bg-muted/40 p-3 text-muted-foreground">
                      {item.reason ??
                        `${SOURCE_LABELS[item.source]} resolves this permission to ${item.effective.toLowerCase()}.`}
                      {item.sourceRole ? ` Source role: ${titleCase(item.sourceRole)}.` : ""}
                    </p>
                  </details>
                </div>
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-muted-foreground">
                    Configured: {titleCase(configured)}
                  </span>
                  <PermissionTriStateControl
                    value={configured}
                    onValueChange={(value) => onChange(item.permission, value)}
                    disabled={disabled}
                    aria-label={`Configure ${meta.label}`}
                    className="w-full xl:w-auto"
                  />
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
