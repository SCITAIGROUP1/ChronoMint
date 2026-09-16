"use client";

import type {
  ApplyTenantHolidayResponseDto,
  CreateTenantActivityTypeDto,
  CreateTenantHolidayDto,
  ListTenantActivityTypesResponseDto,
  ListTenantHolidaysResponseDto,
  TenantActivityTypeDto,
  TenantHolidayDto,
  UpdateTenantActivityTypeDto
} from "@kloqra/contracts";
import { groupTenantActivityTypes, ROUTES } from "@kloqra/contracts";
import {
  AppModal,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  cn
} from "@kloqra/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export function AccountOrganizationCatalogs({ canManage }: { canManage: boolean }) {
  const [holidays, setHolidays] = useState<TenantHolidayDto[]>([]);
  const [activityTypes, setActivityTypes] = useState<TenantActivityTypeDto[]>([]);
  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [activityName, setActivityName] = useState("");
  const [activityColor, setActivityColor] = useState("#0d9488");
  const [subDrafts, setSubDrafts] = useState<Record<string, { name: string; color: string }>>({});
  const [editing, setEditing] = useState<TenantActivityTypeDto | null>(null);
  const [saving, setSaving] = useState(false);
  const { roots, childrenByParentId } = useMemo(
    () => groupTenantActivityTypes(activityTypes),
    [activityTypes]
  );

  const reload = useCallback(async () => {
    const [holidayRes, activityRes] = await Promise.all([
      api<ListTenantHolidaysResponseDto>(ROUTES.TENANTS.HOLIDAYS),
      api<ListTenantActivityTypesResponseDto>(ROUTES.TENANTS.ACTIVITY_TYPES)
    ]);
    setHolidays(holidayRes.items);
    setActivityTypes(activityRes.items);
  }, []);

  useEffect(() => {
    void reload().catch(() => toast.error("Could not load organization catalogs."));
  }, [reload]);

  async function addHoliday(e: React.FormEvent) {
    e.preventDefault();
    if (!holidayName.trim() || !holidayDate) return;
    setSaving(true);
    try {
      const body: CreateTenantHolidayDto = { name: holidayName.trim(), date: holidayDate };
      await api(ROUTES.TENANTS.HOLIDAYS, { method: "POST", body: JSON.stringify(body) });
      setHolidayName("");
      setHolidayDate("");
      await reload();
      toast.success("Holiday added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add holiday");
    } finally {
      setSaving(false);
    }
  }

  async function applyHoliday(id: string) {
    setSaving(true);
    try {
      const res = await api<ApplyTenantHolidayResponseDto>(ROUTES.TENANTS.HOLIDAY_APPLY(id), {
        method: "POST"
      });
      toast.success(
        `Applied to ${res.createdCount} member${res.createdCount === 1 ? "" : "s"}${
          res.skippedCount ? ` · skipped ${res.skippedCount}` : ""
        }`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not apply holiday");
    } finally {
      setSaving(false);
    }
  }

  async function removeHoliday(id: string) {
    setSaving(true);
    try {
      await api(ROUTES.TENANTS.HOLIDAY(id), { method: "DELETE" });
      await reload();
      toast.success("Holiday removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove holiday");
    } finally {
      setSaving(false);
    }
  }

  async function addActivity(e: React.FormEvent, parentId?: string) {
    e.preventDefault();
    const draft = parentId ? subDrafts[parentId] : undefined;
    const name = (parentId ? (draft?.name ?? "") : activityName).trim();
    const color = parentId ? (draft?.color ?? activityColor) : activityColor;
    if (!name) return;
    setSaving(true);
    try {
      const body: CreateTenantActivityTypeDto = {
        name,
        color,
        ...(parentId ? { parentId } : {})
      };
      await api(ROUTES.TENANTS.ACTIVITY_TYPES, { method: "POST", body: JSON.stringify(body) });
      if (parentId) {
        setSubDrafts((current) => ({ ...current, [parentId]: { name: "", color } }));
      } else {
        setActivityName("");
      }
      await reload();
      toast.success(parentId ? "Sub-activity added" : "Activity type added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add activity type");
    } finally {
      setSaving(false);
    }
  }

  async function saveActivity(id: string, body: UpdateTenantActivityTypeDto) {
    setSaving(true);
    try {
      await api(ROUTES.TENANTS.ACTIVITY_TYPE(id), { method: "PATCH", body: JSON.stringify(body) });
      setEditing(null);
      await reload();
      toast.success("Activity type updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update activity type");
    } finally {
      setSaving(false);
    }
  }

  async function removeActivity(type: TenantActivityTypeDto) {
    if (type.isSystem) return;
    setSaving(true);
    try {
      await api(ROUTES.TENANTS.ACTIVITY_TYPE(type.id), { method: "DELETE" });
      await reload();
      toast.success("Activity type removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove activity type");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card data-testid="org-holiday-calendar">
        <CardHeader>
          <CardTitle className="text-base">Holiday calendar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-xs text-muted-foreground">
            Organization-wide dates shown on every workspace timesheet. Apply creates a public
            holiday log for each member.
          </p>
          {canManage ? (
            <form onSubmit={addHoliday} className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="space-y-1">
                <Label htmlFor="holiday-date">Date</Label>
                <Input
                  id="holiday-date"
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  required
                />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <Label htmlFor="holiday-name">Name</Label>
                <Input
                  id="holiday-name"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  placeholder="Public holiday"
                  required
                />
              </div>
              <Button type="submit" disabled={saving}>
                Add
              </Button>
            </form>
          ) : null}
          <ul className="space-y-2">
            {holidays.length === 0 ? (
              <li className="text-muted-foreground">No holidays yet.</li>
            ) : (
              holidays.map((holiday) => (
                <li
                  key={holiday.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                >
                  <span>
                    <span className="font-medium">{holiday.name}</span>
                    <span className="ml-2 text-muted-foreground">{holiday.date}</span>
                  </span>
                  {canManage ? (
                    <span className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={saving || !holiday.isActive}
                        onClick={() => void applyHoliday(holiday.id)}
                      >
                        Apply to members
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={saving}
                        onClick={() => void removeHoliday(holiday.id)}
                      >
                        Remove
                      </Button>
                    </span>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </CardContent>
      </Card>

      <Card data-testid="org-activity-types">
        <CardHeader>
          <CardTitle className="text-base">Organization activities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-xs text-muted-foreground">
            Create, edit, or remove the catalog members pick when logging organization time. If a
            type is already used on entries, deactivate it instead of deleting.
          </p>
          {canManage ? (
            <form
              onSubmit={(e) => void addActivity(e)}
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <Label htmlFor="activity-name">Main activity</Label>
                <Input
                  id="activity-name"
                  value={activityName}
                  onChange={(e) => setActivityName(e.target.value)}
                  placeholder="Training"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="activity-color">Color</Label>
                <Input
                  id="activity-color"
                  type="color"
                  value={activityColor}
                  onChange={(e) => setActivityColor(e.target.value)}
                  className="h-10 w-14 p-1"
                />
              </div>
              <Button type="submit" disabled={saving}>
                Add
              </Button>
            </form>
          ) : null}
          <ul className="space-y-3">
            {roots.map((type) => {
              const children = childrenByParentId.get(type.id) ?? [];
              const subDraft = subDrafts[type.id] ?? { name: "", color: type.color };
              return (
                <li
                  key={type.id}
                  data-testid={type.slug ? `org-activity-type-${type.slug}` : undefined}
                  className="rounded-md border border-border"
                >
                  <ActivityTypeSummary
                    type={type}
                    childCount={children.length}
                    canManage={canManage}
                    saving={saving}
                    onEdit={() => setEditing(type)}
                    onRemove={() => void removeActivity(type)}
                  />
                  <ul
                    className="space-y-1 border-t border-border bg-muted/30 px-3 py-2"
                    data-testid={
                      type.slug
                        ? `org-activity-children-${type.slug}`
                        : `org-activity-children-${type.id}`
                    }
                  >
                    {children.length === 0 ? (
                      <li className="text-xs text-muted-foreground">No sub-activities yet.</li>
                    ) : (
                      children.map((child) => (
                        <li
                          key={child.id}
                          data-testid={child.slug ? `org-activity-type-${child.slug}` : undefined}
                          className="rounded-md bg-background"
                        >
                          <ActivityTypeSummary
                            type={child}
                            compact
                            canManage={canManage}
                            saving={saving}
                            onEdit={() => setEditing(child)}
                            onRemove={() => void removeActivity(child)}
                          />
                        </li>
                      ))
                    )}
                    {canManage ? (
                      <li>
                        <form
                          onSubmit={(e) => void addActivity(e, type.id)}
                          className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center"
                        >
                          <Label htmlFor={`activity-sub-name-${type.id}`} className="sr-only">
                            Sub-activity of {type.name}
                          </Label>
                          <Input
                            id={`activity-sub-name-${type.id}`}
                            value={subDraft.name}
                            onChange={(e) =>
                              setSubDrafts((current) => ({
                                ...current,
                                [type.id]: { ...subDraft, name: e.target.value }
                              }))
                            }
                            placeholder={`Add under ${type.name}`}
                            className="h-8 bg-background"
                          />
                          <Input
                            id={`activity-sub-color-${type.id}`}
                            type="color"
                            value={subDraft.color}
                            onChange={(e) =>
                              setSubDrafts((current) => ({
                                ...current,
                                [type.id]: { ...subDraft, color: e.target.value }
                              }))
                            }
                            className="h-8 w-12 p-1"
                            aria-label={`Color for sub-activity of ${type.name}`}
                          />
                          <Button
                            type="submit"
                            size="sm"
                            disabled={saving || !subDraft.name.trim()}
                          >
                            Add sub
                          </Button>
                        </form>
                      </li>
                    ) : null}
                  </ul>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {editing ? (
        <ActivityTypeEditDialog
          type={editing}
          roots={roots}
          childCount={childrenByParentId.get(editing.id)?.length ?? 0}
          saving={saving}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          onSave={(body) => void saveActivity(editing.id, body)}
        />
      ) : null}
    </div>
  );
}

function ActivityTypeSummary({
  type,
  childCount,
  compact = false,
  canManage,
  saving,
  onEdit,
  onRemove
}: {
  type: TenantActivityTypeDto;
  childCount?: number;
  compact?: boolean;
  canManage: boolean;
  saving: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 px-3 py-2",
        compact && "px-2 py-1.5",
        !type.isActive && "text-muted-foreground"
      )}
    >
      <span className="flex min-w-0 items-center gap-2 font-medium">
        <span
          className={cn("shrink-0 rounded-full", compact ? "size-2.5" : "size-3")}
          style={{ backgroundColor: type.color }}
          aria-hidden
        />
        <span className="truncate">{type.name}</span>
        {type.isSystem ? (
          <span className="text-[11px] font-normal text-muted-foreground">System</span>
        ) : null}
        {!type.isActive ? (
          <span className="text-[11px] font-normal text-muted-foreground">Inactive</span>
        ) : null}
        {childCount !== undefined ? (
          <span className="text-[11px] font-normal text-muted-foreground">{childCount} sub</span>
        ) : null}
      </span>
      {canManage ? (
        <span className="flex shrink-0 gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={onEdit}
            data-testid={type.slug ? `org-activity-edit-${type.slug}` : undefined}
          >
            Edit
          </Button>
          {!type.isSystem ? (
            <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={onRemove}>
              Remove
            </Button>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

function ActivityTypeEditDialog({
  type,
  roots,
  childCount,
  saving,
  onOpenChange,
  onSave
}: {
  type: TenantActivityTypeDto;
  roots: TenantActivityTypeDto[];
  childCount: number;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (body: UpdateTenantActivityTypeDto) => void;
}) {
  const canReparent = !type.isSystem && childCount === 0;
  const [name, setName] = useState(type.name);
  const [color, setColor] = useState(type.color);
  const [isActive, setIsActive] = useState(type.isActive);
  const [parentId, setParentId] = useState(type.parentId ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const body: UpdateTenantActivityTypeDto = {
      color,
      isActive,
      ...(type.isSystem ? {} : { name: name.trim() }),
      ...(canReparent ? { parentId: parentId || null } : {})
    };
    onSave(body);
  }

  return (
    <AppModal
      open
      onOpenChange={onOpenChange}
      title={type.isSystem ? `Edit ${type.name}` : "Edit activity"}
      description={
        type.isSystem
          ? "System types stay top-level and keep their name. You can still change color or hide them from logging."
          : "Rename, recolor, hide from logging, or move this type under another main activity."
      }
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="activity-type-edit-form" disabled={saving || !name.trim()}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      <form id="activity-type-edit-form" onSubmit={submit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="activity-edit-name">Name</Label>
          <Input
            id="activity-edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={type.isSystem}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="activity-edit-color">Color</Label>
          <Input
            id="activity-edit-color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-14 p-1"
          />
        </div>
        {canReparent ? (
          <div className="space-y-1">
            <Label htmlFor="activity-edit-parent">Parent</Label>
            <select
              id="activity-edit-parent"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Main activity</option>
              {roots
                .filter((root) => root.id !== type.id)
                .map((root) => (
                  <option key={root.id} value={root.id}>
                    {root.name}
                  </option>
                ))}
            </select>
          </div>
        ) : null}
        <label className="flex items-center gap-2 text-sm">
          <input
            id="activity-edit-active"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Available when logging time
        </label>
      </form>
    </AppModal>
  );
}
