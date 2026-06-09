"use client";

import { Badge, Card, CardContent, PageHeader, SegmentedControl } from "@chronomint/ui";
import { Calendar, DollarSign, Mail, Target } from "lucide-react";
import { useState } from "react";
import { useSessionStore } from "../../stores/session.store";
import { ChangePasswordSection } from "./change-password-section";
import { PreferencesSection } from "./preferences-section";
import { ProfileSection } from "./profile-section";
import { useUserProfile } from "./use-user-profile";

type AccountTab = "profile" | "preferences" | "security";

const TAB_OPTIONS: { value: AccountTab; label: string }[] = [
  { value: "profile", label: "Profile" },
  { value: "preferences", label: "Preferences" },
  { value: "security", label: "Security" }
];

const PANEL_DESCRIPTION: Record<AccountTab, string> = {
  profile: "Update how your name appears across ChronoMint.",
  preferences: "Set your daily goals, timezone, and calendar week.",
  security: "Change your password and keep your account secure."
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatMemberSince(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      year: "numeric"
    });
  } catch {
    return "—";
  }
}

function StatItem({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Target;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-background text-muted-foreground">
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-semibold tabular-nums truncate">{value}</p>
      </div>
    </div>
  );
}

export function AccountSettingsPage() {
  const isImpersonating = Boolean(useSessionStore((s) => s.session?.impersonatorId));
  const [tab, setTab] = useState<AccountTab>("profile");
  const {
    profile,
    loading,
    error,
    updateName,
    updatePreferences,
    changePassword,
    workspaceRole,
    workspaceName
  } = useUserProfile();

  const visibleTabs = isImpersonating
    ? TAB_OPTIONS.filter((t) => t.value !== "security")
    : TAB_OPTIONS;

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="h-16 animate-pulse rounded-lg bg-muted" />
        <div className="h-[28rem] animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <Card className="border-destructive/40 bg-destructive/5 shadow-sm">
          <CardContent className="py-8 text-sm text-destructive">
            {error ?? "Could not load account settings"}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        title="Account"
        description="Manage your profile, work preferences, and sign-in security."
      />

      <Card className="overflow-hidden gap-0 border-border bg-card py-0 shadow-md">
        {/* Identity band */}
        <div className="border-b border-border bg-muted/40 px-6 py-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div
                className="flex size-14 shrink-0 aspect-square items-center justify-center rounded-2xl bg-primary text-lg font-semibold leading-none text-primary-foreground shadow-md shadow-primary/25"
                aria-hidden
              >
                {getInitials(profile.name)}
              </div>
              <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                <h2 className="text-base font-semibold tracking-tight truncate leading-tight">
                  {profile.name}
                </h2>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                  <Mail className="size-3.5 shrink-0" />
                  <span className="truncate">{profile.email}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {workspaceRole && (
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                      {workspaceRole}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {workspaceName ?? "Workspace"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-3 lg:w-auto lg:shrink-0 lg:gap-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <StatItem
                icon={Target}
                label="Daily target"
                value={`${profile.effectiveDailyTargetHours}h`}
              />
              <StatItem
                icon={DollarSign}
                label="Hourly rate"
                value={profile.defaultHourlyRate != null ? `$${profile.defaultHourlyRate}/hr` : "—"}
              />
              <StatItem
                icon={Calendar}
                label="Member since"
                value={formatMemberSince(profile.createdAt)}
              />
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="border-b border-border bg-muted/25 px-6 py-3">
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={visibleTabs}
            size="md"
            fullWidth
          />
        </div>

        {/* Panel */}
        <div className="px-6 py-6">
          <p className="mb-6 text-sm text-muted-foreground">{PANEL_DESCRIPTION[tab]}</p>

          {tab === "profile" && <ProfileSection profile={profile} onSaveName={updateName} />}
          {tab === "preferences" && (
            <PreferencesSection profile={profile} onSavePreferences={updatePreferences} />
          )}
          {tab === "security" && <ChangePasswordSection onChangePassword={changePassword} />}
        </div>
      </Card>
    </div>
  );
}
