"use client";

import {
  DEFAULT_LANGUAGE,
  type StartupPagePreference,
  type UserProfileDto
} from "@kloqra/contracts";
import {
  SearchableSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@kloqra/ui";
import { Globe, Home, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSessionStore } from "../../../../stores/session.store";
import { useWorkspacesStore } from "../../../../stores/workspaces.store";
import {
  canUseManagementDashboard,
  resolveEffectiveStartupPreference,
  startupPageSelectOptions
} from "../../../../utils/startup-page";
import { SettingsCard } from "../settings-card";
import { SettingsSaveBar } from "../settings-save-bar";

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" }
];

export function AccountPreferencesSection({
  profile,
  onSavePreferences,
  isAdminApp
}: {
  profile: UserProfileDto;
  onSavePreferences: (prefs: Record<string, unknown>) => Promise<unknown>;
  isAdminApp?: boolean;
}) {
  const workspaces = useWorkspacesStore((s) => s.workspaces);
  const session = useSessionStore((s) => s.session);
  const canUseDashboard = canUseManagementDashboard(session);
  const startupOptions = startupPageSelectOptions(canUseDashboard);
  const [language, setLanguage] = useState(profile.preferences.language ?? DEFAULT_LANGUAGE);
  const [defaultWorkspaceId, setDefaultWorkspaceId] = useState(
    profile.preferences.defaultWorkspaceId ?? ""
  );
  const [startupPage, setStartupPage] = useState<StartupPagePreference>(
    resolveEffectiveStartupPreference(profile.preferences.startupPage, canUseDashboard)
  );
  const [snapshot, setSnapshot] = useState({
    language: profile.preferences.language ?? DEFAULT_LANGUAGE,
    defaultWorkspaceId: profile.preferences.defaultWorkspaceId ?? "",
    startupPage: resolveEffectiveStartupPreference(profile.preferences.startupPage, canUseDashboard)
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = {
      language: profile.preferences.language ?? DEFAULT_LANGUAGE,
      defaultWorkspaceId: profile.preferences.defaultWorkspaceId ?? "",
      startupPage: resolveEffectiveStartupPreference(
        profile.preferences.startupPage,
        canUseDashboard
      )
    };
    setLanguage(next.language);
    setDefaultWorkspaceId(next.defaultWorkspaceId);
    setStartupPage(next.startupPage);
    setSnapshot(next);
  }, [profile, canUseDashboard]);

  const isDirty =
    language !== snapshot.language ||
    defaultWorkspaceId !== snapshot.defaultWorkspaceId ||
    startupPage !== snapshot.startupPage;

  async function handleSave() {
    setSaving(true);
    try {
      await onSavePreferences({
        language,
        defaultWorkspaceId: defaultWorkspaceId || undefined,
        startupPage
      });
      setSnapshot({ language, defaultWorkspaceId, startupPage });
      toast.success("Account preferences saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save preferences");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <SettingsCard icon={Globe} title="Language" description="Select your preferred language">
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="h-10 max-w-md bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsCard>

      <SettingsCard
        icon={Monitor}
        title="Default Workspace"
        description="Set your default workspace"
      >
        <SearchableSelect
          value={defaultWorkspaceId || "__none__"}
          onValueChange={(v) => setDefaultWorkspaceId(v === "__none__" ? "" : v)}
          options={[
            { value: "__none__", label: "Current workspace" },
            ...workspaces.map((ws) => ({ value: ws.id, label: ws.name }))
          ]}
          placeholder="Select workspace"
          searchPlaceholder="Search workspaces…"
          triggerClassName="h-10 max-w-md bg-background"
          aria-label="Default workspace"
        />
      </SettingsCard>

      {!isAdminApp ? (
        <SettingsCard
          icon={Home}
          title="Startup Page"
          description="Choose the page you see when you log in"
        >
          <Select
            value={startupPage}
            onValueChange={(v) => setStartupPage(v as StartupPagePreference)}
          >
            <SelectTrigger className="h-10 max-w-md bg-background" aria-label="Startup page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {startupOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsCard>
      ) : null}

      <SettingsSaveBar onSave={() => void handleSave()} saving={saving} disabled={!isDirty} />
    </div>
  );
}
