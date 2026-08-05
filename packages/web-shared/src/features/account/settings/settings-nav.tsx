"use client";

import { cn } from "@kloqra/ui";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SettingsSectionId = "appearance" | "time" | "notifications" | "security" | "account";

export type SettingsNavSection = "preferences" | "security";

export const SETTINGS_NAV_SECTION_LABELS: Record<SettingsNavSection, string> = {
  preferences: "Preferences",
  security: "Security"
};

export type SettingsNavItem = {
  id: SettingsSectionId;
  label: string;
  icon: LucideIcon;
  section: SettingsNavSection;
};

const SECTION_ORDER: SettingsNavSection[] = ["preferences", "security"];

export function SettingsNav({
  items,
  active,
  onChange
}: {
  items: SettingsNavItem[];
  active: SettingsSectionId;
  onChange: (id: SettingsSectionId) => void;
}) {
  const sections = SECTION_ORDER.map((sectionId) => {
    const sectionItems = items.filter((item) => item.section === sectionId);
    if (sectionItems.length === 0) return null;
    return { id: sectionId, label: SETTINGS_NAV_SECTION_LABELS[sectionId], items: sectionItems };
  }).filter((section): section is NonNullable<typeof section> => section !== null);

  return (
    <nav className="flex flex-col gap-4" aria-label="Settings">
      {sections.map((section) => (
        <div key={section.id} className="flex flex-col gap-1">
          <p
            className="px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
            aria-hidden
          >
            {section.label}
          </p>
          {section.items.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChange(id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="flex-1">{label}</span>
                {isActive ? <ChevronRight className="size-4 shrink-0" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
