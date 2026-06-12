"use client";

import { AppBar, Card, CardContent, SegmentedControl } from "@kloqra/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { PersonalInfoSection } from "./profile/personal-info-section";
import { ProfileHero } from "./profile/profile-hero";
import { WorkDetailsSection } from "./profile/work-details-section";
import { useUserProfile } from "./use-user-profile";

type ExtraTab = { value: string; label: string; content: ReactNode };

export function ProfilePage({ extraTabs }: { extraTabs?: ExtraTab[] }) {
  const [tab, setTab] = useState<string>("personal");
  const { profile, loading, error, updateProfile, workspaceRole, workspaceName } = useUserProfile();

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="h-28 animate-pulse rounded-xl bg-muted" />
        <div className="h-[24rem] animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <Card className="border-destructive/40 bg-destructive/5 shadow-sm">
          <CardContent className="py-8 text-sm text-destructive">
            {error ?? "Could not load profile"}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AppBar
        title="Profile"
        description="Manage your account and personal information."
        actions={
          <Link
            href="/settings?section=security"
            className="text-sm font-medium text-primary hover:underline"
          >
            Security settings
          </Link>
        }
      />

      <div className="mx-auto w-full max-w-4xl space-y-4">
        <ProfileHero
          profile={profile}
          workspaceRole={workspaceRole}
          workspaceName={workspaceName}
          onUpdateAvatar={async (avatarUrl) => {
            await updateProfile({ avatarUrl });
          }}
        />

        <div className="rounded-xl border border-border bg-muted/25 p-1">
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: "personal", label: "Personal Info" },
              { value: "work", label: "Work Details" },
              ...(extraTabs ?? []).map((t) => ({ value: t.value, label: t.label }))
            ]}
            size="md"
            fullWidth
          />
        </div>

        {tab === "personal" ? (
          <PersonalInfoSection
            profile={profile}
            onSave={async (data) => {
              await updateProfile(data);
            }}
          />
        ) : tab === "work" ? (
          <WorkDetailsSection
            profile={profile}
            onSave={async (data) => {
              await updateProfile(data);
            }}
          />
        ) : (
          ((extraTabs ?? []).find((t) => t.value === tab)?.content ?? null)
        )}
      </div>
    </div>
  );
}
