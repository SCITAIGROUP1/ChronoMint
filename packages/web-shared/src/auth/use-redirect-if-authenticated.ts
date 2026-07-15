"use client";

import type { AuthSessionDto } from "@kloqra/contracts";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { bootstrapSession, type BootstrapOptions } from "./bootstrap-session";

type UseRedirectIfAuthenticatedOptions = {
  resolvePath: (session: AuthSessionDto) => Promise<string>;
  bootstrapOptions?: BootstrapOptions;
};

/**
 * On auth screens: if a session can be restored, replace to the post-auth path
 * instead of showing the login form.
 *
 * Invite handoff links (`?invite=`) skip this redirect so a logged-in owner/admin
 * can still reach set-password for the invitee. The existing session is left
 * untouched until set-password succeeds and establishes the invitee session.
 */
export function useRedirectIfAuthenticated({
  resolvePath,
  bootstrapOptions
}: UseRedirectIfAuthenticatedOptions): { checking: boolean } {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const [checking, setChecking] = useState(() => !inviteToken);
  const resolvePathRef = useRef(resolvePath);
  const bootstrapOptionsRef = useRef(bootstrapOptions);
  resolvePathRef.current = resolvePath;
  bootstrapOptionsRef.current = bootstrapOptions;

  useEffect(() => {
    if (inviteToken) {
      setChecking(false);
      return;
    }

    let cancelled = false;

    void bootstrapSession(bootstrapOptionsRef.current ?? {})
      .then(async (result) => {
        if (cancelled) return;
        if (!result.ok) {
          setChecking(false);
          return;
        }
        const path = await resolvePathRef.current(result.session);
        if (cancelled) return;
        router.replace(path);
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router, inviteToken]);

  return { checking };
}
