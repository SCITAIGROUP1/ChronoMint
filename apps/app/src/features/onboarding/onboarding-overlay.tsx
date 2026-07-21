"use client";

import { Button, Dialog, DialogBody, DialogContent, DialogTitle } from "@kloqra/ui";
import { sessionCan } from "@kloqra/web-shared";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FINISH_HIGHLIGHTS,
  ONBOARDING_STEP_IDS,
  PROJECTS_DASHBOARD_CARDS,
  TOTAL_ONBOARDING_STEPS,
  TRACK_TIME_CARDS,
  getStepTitle
} from "./onboarding-steps";
import { useOnboardingStatus } from "./use-onboarding-status";
import { useIsImpersonating } from "@/hooks/use-is-impersonating";
import { useSessionStore } from "@/stores/session.store";

export function OnboardingOverlay({
  onComplete,
  forceOpen,
  replay = false,
  onOpenChange
}: {
  onComplete?: (options: { startTour: boolean }) => void;
  forceOpen?: boolean;
  replay?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const session = useSessionStore((state) => state.session);
  const isImpersonating = useIsImpersonating();
  const { profileLoading, wizardDone, markWizardDone } = useOnboardingStatus();
  const [show, setShow] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [completedThisSession, setCompletedThisSession] = useState(false);
  const step = ONBOARDING_STEP_IDS[stepIndex] ?? "welcome";
  const canCreateProject = sessionCan(session, "workspace:CreateProject");

  useEffect(() => {
    if (isImpersonating) return;
    if (!session?.workspaceId) {
      setShow(false);
      return;
    }
    if (forceOpen !== undefined) {
      setShow(forceOpen);
      if (forceOpen && replay) setStepIndex(0);
      return;
    }
    if (profileLoading || !session || replay) return;
    if (wizardDone || completedThisSession) {
      setShow(false);
      return;
    }
    setShow(true);
  }, [
    forceOpen,
    replay,
    isImpersonating,
    profileLoading,
    session,
    wizardDone,
    completedThisSession
  ]);

  function complete(startTour: boolean) {
    if (!replay) void markWizardDone();
    setCompletedThisSession(true);
    setShow(false);
    onOpenChange?.(false);
    onComplete?.({ startTour });
  }

  if (!show) return null;
  const title = getStepTitle(step, session?.user.name ?? "there", canCreateProject);
  const cards =
    step === "track-time"
      ? TRACK_TIME_CARDS
      : step === "projects-dashboard"
        ? PROJECTS_DASHBOARD_CARDS
        : [];

  return (
    <Dialog open>
      <DialogContent
        size="xl"
        showClose={false}
        className="min-h-[500px]"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogBody className="flex min-h-[500px] flex-col justify-between py-6">
          <div>
            <div className="mb-6 flex items-center justify-between border-b pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Getting Started
              </span>
              <span className="text-xs text-muted-foreground">
                Step {stepIndex + 1} of {TOTAL_ONBOARDING_STEPS}
              </span>
            </div>
            <div className="space-y-4">
              {step === "welcome" ? <Sparkles className="size-10 text-primary" /> : null}
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              {step === "welcome" ? (
                <p className="text-muted-foreground">
                  Track time, submit timesheets, and work with projects in one capability-aware
                  Kloqra workspace.
                </p>
              ) : null}
              {step === "workspace" ? (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    {canCreateProject
                      ? "Project and workspace management appears alongside your personal work."
                      : "Only projects and tasks assigned to you appear in your personal catalog. Ask a workspace manager to add you to a project when you need access."}
                  </p>
                  {canCreateProject ? (
                    <Button asChild>
                      <Link href="/projects?create=1">Create your first project</Link>
                    </Button>
                  ) : null}
                </div>
              ) : null}
              {cards.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  {cards.map(({ icon: Icon, title: cardTitle, description, route }) => (
                    <div key={cardTitle} className="rounded-lg border bg-muted/20 p-4">
                      <Icon className="mb-2 size-5 text-primary" />
                      <p className="font-semibold">{cardTitle}</p>
                      <p className="text-xs text-muted-foreground">{route}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
                    </div>
                  ))}
                </div>
              ) : null}
              {step === "finish" ? (
                <div className="space-y-3">
                  {FINISH_HIGHLIGHTS.map(({ icon: Icon, text }) => (
                    <p key={text} className="flex gap-2 text-sm text-muted-foreground">
                      <Icon className="size-4 shrink-0 text-primary" /> {text}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex justify-between border-t pt-4">
            <Button
              variant="ghost"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
            >
              Back
            </Button>
            <div className="flex gap-2">
              {step !== "finish" ? (
                <>
                  <Button variant="outline" onClick={() => complete(false)}>
                    Skip onboarding
                  </Button>
                  <Button onClick={() => setStepIndex((index) => index + 1)}>
                    Next <ArrowRight className="size-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => complete(false)}>
                    Go to Timer
                  </Button>
                  <Button onClick={() => complete(true)}>Take the quick tour</Button>
                </>
              )}
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
