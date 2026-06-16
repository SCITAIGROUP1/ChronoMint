import type { SendMailResult } from "./mailer.service";

export const MEMBER_EMAIL_TIMEOUT_MS = 12_000;

export type MemberEmailDelivery = {
  emailSent: boolean;
  emailSkipReason?: "smtp_unconfigured" | "send_failed";
};

export function mapMailResultToDelivery(result: SendMailResult): MemberEmailDelivery {
  if (result.sent) return { emailSent: true };
  return {
    emailSent: false,
    emailSkipReason: result.reason === "unconfigured" ? "smtp_unconfigured" : "send_failed"
  };
}

/** Attempt delivery with a bounded wait; continue in background if SMTP is slow. */
export async function deliverMemberEmail(
  isConfigured: boolean,
  send: () => Promise<SendMailResult>
): Promise<MemberEmailDelivery> {
  if (!isConfigured) {
    return { emailSent: false, emailSkipReason: "smtp_unconfigured" };
  }

  const raced = await Promise.race([
    send().then((result) => ({ kind: "result" as const, result })),
    new Promise<{ kind: "timeout" }>((resolve) => {
      setTimeout(() => resolve({ kind: "timeout" }), MEMBER_EMAIL_TIMEOUT_MS);
    })
  ]);

  if (raced.kind === "timeout") {
    void send().catch(() => undefined);
    return { emailSent: false, emailSkipReason: "send_failed" };
  }

  return mapMailResultToDelivery(raced.result);
}
