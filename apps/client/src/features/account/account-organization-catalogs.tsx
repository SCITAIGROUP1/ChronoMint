"use client";

import type {
  ApplyTenantHolidayResponseDto,
  CreateTenantActivityTypeDto,
  CreateTenantHolidayDto,
  ListTenantActivityTypesResponseDto,
  ListTenantHolidaysResponseDto,
  TenantActivityTypeDto,
  TenantHolidayDto
} from "@kloqra/contracts";
import { ROUTES } from "@kloqra/contracts";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@kloqra/ui";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export function AccountOrganizationCatalogs({ canManage }: { canManage: boolean }) {
  const [holidays, setHolidays] = useState<TenantHolidayDto[]>([]);
  const [activityTypes, setActivityTypes] = useState<TenantActivityTypeDto[]>([]);
  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [activityName, setActivityName] = useState("");
  const [activityColor, setActivityColor] = useState("#0d9488");
  const [saving, setSaving] = useState(false);

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

  async function addActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!activityName.trim()) return;
    setSaving(true);
    try {
      const body: CreateTenantActivityTypeDto = {
        name: activityName.trim(),
        color: activityColor
      };
      await api(ROUTES.TENANTS.ACTIVITY_TYPES, { method: "POST", body: JSON.stringify(body) });
      setActivityName("");
      await reload();
      toast.success("Activity type added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add activity type");
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
            Organizational and Recreational are built in, along with Office Event and Office
            Meeting. Custom types are available in every workspace.
          </p>
          {canManage ? (
            <form onSubmit={addActivity} className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-1">
                <Label htmlFor="activity-name">Name</Label>
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
          <ul className="space-y-2">
            {activityTypes.map((type) => (
              <li
                key={type.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: type.color }}
                    aria-hidden
                  />
                  {type.name}
                  {type.isSystem ? (
                    <span className="text-[11px] text-muted-foreground">System</span>
                  ) : null}
                </span>
                {canManage && !type.isSystem ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={saving}
                    onClick={() => void removeActivity(type)}
                  >
                    Remove
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
