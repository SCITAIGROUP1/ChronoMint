"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  UserAvatar,
  appBarIconButtonClass,
  appBarToolbarClass,
  cn
} from "@kloqra/ui";
import { BookOpen, Map, MessageCircle, Settings, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useSessionStore } from "../stores/session.store";
import { NotificationDropdown } from "./notification-dropdown";
import { PlatformNotificationDropdown } from "./platform-notification-dropdown";

export type ShellHeaderActionsDensity = "full" | "compact";

export type ShellHeaderActionsProps = {
  workspaceId?: string;
  profileHref?: string;
  settingsHref?: string;
  notificationsHref?: string;
  /** Override display name when not using tenant session (e.g. platform admin). */
  userName?: string;
  /** When true, use platform notification APIs instead of workspace notifications. */
  platformNotifications?: boolean;
  /** @deprecated Use onShowOnboardingWizard / onShowOnboardingTour instead */
  onShowOnboarding?: () => void;
  onShowOnboardingWizard?: () => void;
  onShowOnboardingTour?: () => void;
  onOpenAssistant?: () => void;
  onboardingReplayTourId?: string;
  /** Compact density: bell + account menu (help/settings folded in). */
  density?: ShellHeaderActionsDensity;
  className?: string;
};

const menuItemClass =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent/80 transition-colors";

function HelpMenuItems({
  onOpenAssistant,
  showWizard,
  showTour,
  onClose
}: {
  onOpenAssistant?: () => void;
  showWizard?: () => void;
  showTour?: () => void;
  onClose: () => void;
}) {
  return (
    <>
      {onOpenAssistant ? (
        <button
          type="button"
          aria-label="Ask Kloqra"
          className={menuItemClass}
          onClick={() => {
            onClose();
            onOpenAssistant();
          }}
        >
          <MessageCircle className="size-4 shrink-0 text-primary" strokeWidth={1.5} />
          <span>
            <span className="block font-medium">Ask Kloqra</span>
            <span className="block text-xs text-muted-foreground">Help assistant</span>
          </span>
        </button>
      ) : null}
      {showWizard ? (
        <button
          type="button"
          aria-label="Full setup guide"
          className={menuItemClass}
          onClick={() => {
            onClose();
            showWizard();
          }}
        >
          <BookOpen className="size-4 shrink-0 text-primary" strokeWidth={1.5} />
          <span>
            <span className="block font-medium">Full setup guide</span>
            <span className="block text-xs text-muted-foreground">5-step walkthrough</span>
          </span>
        </button>
      ) : null}
      {showTour ? (
        <button
          type="button"
          aria-label="Quick product tour"
          className={menuItemClass}
          onClick={() => {
            onClose();
            showTour();
          }}
        >
          <Map className="size-4 shrink-0 text-primary" strokeWidth={1.5} />
          <span>
            <span className="block font-medium">Quick product tour</span>
            <span className="block text-xs text-muted-foreground">Highlight key areas</span>
          </span>
        </button>
      ) : null}
    </>
  );
}

/** Global app bar actions: notifications, settings, profile avatar. */
export function ShellHeaderActions({
  workspaceId = "",
  profileHref = "/profile",
  settingsHref = "/settings",
  notificationsHref = "/notifications",
  onShowOnboarding,
  onShowOnboardingWizard,
  onShowOnboardingTour,
  onOpenAssistant,
  onboardingReplayTourId = "onboarding-replay",
  density = "full",
  className,
  userName: userNameOverride,
  platformNotifications = false
}: ShellHeaderActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const user = useSessionStore((s) => s.session?.user);
  const userName = userNameOverride ?? user?.name ?? "User";

  const showWizard = onShowOnboardingWizard ?? onShowOnboarding;
  const showTour = onShowOnboardingTour;
  const hasHelpMenu = Boolean(showWizard || showTour || onOpenAssistant);
  const compact = density === "compact";

  const notifications = platformNotifications ? (
    <PlatformNotificationDropdown viewAllHref={notificationsHref} />
  ) : (
    <NotificationDropdown workspaceId={workspaceId} viewAllHref={notificationsHref} />
  );

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {notifications}
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="rounded-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label="Account menu"
              title={userName}
            >
              <UserAvatar
                name={userName}
                firstName={user?.firstName}
                lastName={user?.lastName}
                size="xs"
              />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-1.5">
            <Link href={profileHref} className={menuItemClass} onClick={() => setMenuOpen(false)}>
              <UserRound className="size-4 shrink-0 text-primary" strokeWidth={1.5} />
              <span className="font-medium">Profile</span>
            </Link>
            <Link href={settingsHref} className={menuItemClass} onClick={() => setMenuOpen(false)}>
              <Settings className="size-4 shrink-0 text-primary" strokeWidth={1.5} />
              <span className="font-medium">Settings</span>
            </Link>
            {hasHelpMenu ? (
              <>
                <div className="my-1 h-px bg-border/80" aria-hidden />
                <HelpMenuItems
                  onOpenAssistant={onOpenAssistant}
                  showWizard={showWizard}
                  showTour={showTour}
                  onClose={() => setMenuOpen(false)}
                />
              </>
            ) : null}
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className={cn(appBarToolbarClass, className)}>
      {hasHelpMenu ? (
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={appBarIconButtonClass()}
              title="Help"
              aria-label="Help menu"
              data-tour={onboardingReplayTourId}
            >
              <Sparkles strokeWidth={1.5} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-1.5">
            <HelpMenuItems
              onOpenAssistant={onOpenAssistant}
              showWizard={showWizard}
              showTour={showTour}
              onClose={() => setMenuOpen(false)}
            />
          </PopoverContent>
        </Popover>
      ) : null}
      {notifications}
      <Link
        href={settingsHref}
        className={appBarIconButtonClass()}
        title="Settings"
        aria-label="Settings"
      >
        <Settings strokeWidth={1.5} />
      </Link>
      <UserAvatar
        name={userName}
        firstName={user?.firstName}
        lastName={user?.lastName}
        href={profileHref}
      />
    </div>
  );
}
