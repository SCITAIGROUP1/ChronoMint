"use client";

import {
  adminNotificationKeys,
  memberNotificationKeys,
  resolveEffectiveNotifications,
  type AdminNotificationKey,
  type MemberNotificationKey,
  type NotificationChannels,
  type NotificationPreferenceKey,
  type ResolvedUserNotifications,
  type UserProfileDto
} from "@kloqra/contracts";
import { Button } from "@kloqra/ui";
import {
  AlertTriangle,
  Bell,
  Briefcase,
  Building2,
  CheckSquare,
  ClipboardCheck,
  Clock,
  Download,
  Link2,
  Shield,
  Timer,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { isClientCommercialFeaturesEnabled } from "../../../../client-commercial-features";
import { NotificationChannelRow } from "../notification-channel-row";
import { SettingsCard } from "../settings-card";
import { SettingsSaveBar } from "../settings-save-bar";

type SettingsVariant =
  | "member"
  | "admin"
  | "workspace-admin"
  | "project-manager"
  | "tenant-admin-org";

/** Audience groups aligned with Workspace / My time sidebar IA. */
export type NotificationPreferenceSection = "workspace" | "my-time";

export const NOTIFICATION_PREFERENCE_SECTION_LABELS: Record<NotificationPreferenceSection, string> =
  {
    workspace: "Workspace",
    "my-time": "My time"
  };

const NOTIFICATION_PREFERENCE_SECTION_ORDER: readonly NotificationPreferenceSection[] = [
  "workspace",
  "my-time"
];

type NotificationPreferenceRow = {
  key: MemberNotificationKey | AdminNotificationKey;
  title: string;
  description: string;
  icon: LucideIcon;
  section: NotificationPreferenceSection;
};

const MEMBER_ROWS: NotificationPreferenceRow[] = [
  {
    key: "workspaceAdded",
    title: "Workspace Access",
    description: "When you are added to or removed from a workspace",
    icon: Users,
    section: "my-time"
  },
  {
    key: "projectAssignment",
    title: "Project Assignment",
    description: "When you are assigned to or removed from a project",
    icon: Briefcase,
    section: "my-time"
  },
  {
    key: "taskAssignment",
    title: "Task Assignment",
    description: "When you are assigned to or unassigned from a task",
    icon: CheckSquare,
    section: "my-time"
  },
  {
    key: "timesheetReminders",
    title: "Timesheet Reminders",
    description: "Reminders to submit timesheets",
    icon: Clock,
    section: "my-time"
  },
  {
    key: "timesheetStatus",
    title: "Timesheet Status",
    description: "When your timesheet is approved or rejected",
    icon: ClipboardCheck,
    section: "my-time"
  },
  {
    key: "roleChanges",
    title: "Role Changes",
    description: "When your workspace role is updated",
    icon: Shield,
    section: "my-time"
  },
  {
    key: "idleTimerAlert",
    title: "Idle Timer Alert",
    description: "When the idle timer is triggered",
    icon: Timer,
    section: "my-time"
  },
  {
    key: "jiraSyncUpdates",
    title: "Jira Sync Updates",
    description: "When Jira sync completes",
    icon: Link2,
    section: "my-time"
  }
];

const ADMIN_ROWS: NotificationPreferenceRow[] = [
  {
    key: "approvalRequest",
    title: "Approval Requests",
    description: "When a member submits a timesheet for review",
    icon: ClipboardCheck,
    section: "workspace"
  },
  {
    key: "memberChanges",
    title: "Team Changes",
    description: "When members join, leave, or change roles",
    icon: Users,
    section: "workspace"
  },
  {
    key: "workspaceCreated",
    title: "Workspace Creation",
    description: "When a new workspace is created in your organization",
    icon: Building2,
    section: "workspace"
  },
  {
    key: "missingTimesheets",
    title: "Missing Timesheets",
    description: "Weekly summary of unsubmitted timesheets",
    icon: ClipboardCheck,
    section: "workspace"
  },
  {
    key: "exportSchedule",
    title: "Exports & Backups",
    description: "When a scheduled export or organization data backup/import completes",
    icon: Download,
    section: "workspace"
  },
  {
    key: "budgetAlert",
    title: "Budget Alerts",
    description: "When a project approaches or exceeds budget",
    icon: AlertTriangle,
    section: "workspace"
  }
];

export type NotificationPreferenceGroup = {
  section: NotificationPreferenceSection;
  label: string;
  rows: NotificationPreferenceRow[];
};

/** Pure builder used by the UI and unit tests. */
export function buildNotificationPreferenceGroups(
  variant: SettingsVariant,
  options: { hideBudget?: boolean } = {}
): NotificationPreferenceGroup[] {
  const hideBudget = options.hideBudget ?? false;
  const withoutBudget = (list: NotificationPreferenceRow[]) =>
    hideBudget ? list.filter((row) => row.key !== "budgetAlert") : list;

  let rows: NotificationPreferenceRow[];
  if (variant === "tenant-admin-org") {
    const orgAdminRows = ADMIN_ROWS.filter(
      (row) =>
        row.key === "memberChanges" ||
        row.key === "workspaceCreated" ||
        row.key === "exportSchedule"
    );
    const personalOrgRows = MEMBER_ROWS.filter(
      (row) => row.key === "workspaceAdded" || row.key === "roleChanges"
    );
    rows = withoutBudget([...orgAdminRows, ...personalOrgRows]);
  } else if (variant === "project-manager") {
    const pmAdminRows = ADMIN_ROWS.filter(
      (row) =>
        row.key === "approvalRequest" ||
        row.key === "budgetAlert" ||
        row.key === "missingTimesheets"
    );
    rows = withoutBudget([...pmAdminRows, ...MEMBER_ROWS]);
  } else if (variant === "workspace-admin") {
    rows = withoutBudget([...ADMIN_ROWS, ...MEMBER_ROWS]);
  } else if (variant === "admin") {
    rows = withoutBudget(ADMIN_ROWS);
  } else {
    rows = withoutBudget(MEMBER_ROWS);
  }

  return NOTIFICATION_PREFERENCE_SECTION_ORDER.map((section) => {
    const sectionRows = rows.filter((row) => row.section === section);
    if (sectionRows.length === 0) return null;
    return {
      section,
      label: NOTIFICATION_PREFERENCE_SECTION_LABELS[section],
      rows: sectionRows
    };
  }).filter((group): group is NotificationPreferenceGroup => group !== null);
}

function MasterToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <Button type="button" size="sm" variant={enabled ? "default" : "outline"} onClick={onToggle}>
      {enabled ? "On" : "Off"}
    </Button>
  );
}

function serializeNotifications(state: ResolvedUserNotifications) {
  const keys = [
    ...memberNotificationKeys(),
    ...adminNotificationKeys()
  ] as NotificationPreferenceKey[];
  return {
    enabled: state.enabled,
    ...Object.fromEntries(keys.map((key) => [key, state[key]]))
  };
}

export function NotificationsSection({
  profile,
  onSavePreferences,
  variant = "member"
}: {
  profile: UserProfileDto;
  onSavePreferences: (prefs: Record<string, unknown>) => Promise<unknown>;
  variant?: SettingsVariant;
}) {
  const initial = resolveEffectiveNotifications(profile.preferences);
  const [state, setState] = useState<ResolvedUserNotifications>(initial);
  const [snapshot, setSnapshot] = useState(JSON.stringify(initial));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = resolveEffectiveNotifications(profile.preferences);
    setState(next);
    setSnapshot(JSON.stringify(next));
  }, [profile]);

  const isDirty = JSON.stringify(state) !== snapshot;
  const rowGroups = useMemo(
    () =>
      buildNotificationPreferenceGroups(variant, {
        hideBudget: !isClientCommercialFeaturesEnabled()
      }),
    [variant]
  );

  function updateKey(key: NotificationPreferenceKey, channels: NotificationChannels) {
    setState((prev) => ({ ...prev, [key]: channels }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSavePreferences({ notifications: serializeNotifications(state) });
      setSnapshot(JSON.stringify(state));
      toast.success("Notification preferences saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save notifications");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={Bell}
        title="Notifications Enabled"
        description="Master switch for all notifications"
        action={
          <MasterToggle
            enabled={state.enabled}
            onToggle={() => setState((s) => ({ ...s, enabled: !s.enabled }))}
          />
        }
      />

      {rowGroups.map((group) => (
        <div key={group.section} className="space-y-3">
          <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {group.label}
          </p>
          {group.rows.map(({ key, title, description, icon: Icon }) => (
            <SettingsCard
              key={key}
              icon={Icon}
              title={title}
              description={description}
              action={
                <NotificationChannelRow
                  channels={state[key]}
                  disabled={!state.enabled}
                  onChange={(channels) => updateKey(key, channels)}
                />
              }
            />
          ))}
        </div>
      ))}

      <SettingsSaveBar onSave={() => void handleSave()} saving={saving} disabled={!isDirty} />
    </div>
  );
}
