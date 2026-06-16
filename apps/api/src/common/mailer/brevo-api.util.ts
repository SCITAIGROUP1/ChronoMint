import type { SendMailOptions, SendMailResult } from "./mailer.service";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

export type ParsedFromAddress = {
  email: string;
  name?: string;
};

/** Parse `Name <email@example.com>` or a bare address. */
export function parseFromAddress(from: string): ParsedFromAddress {
  const trimmed = from.trim();
  const match = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { email: trimmed };
}

export function isBrevoSmtpHost(host: string | undefined): boolean {
  if (!host) return false;
  const normalized = host.toLowerCase();
  return normalized.includes("brevo.com") || normalized.includes("sendinblue.com");
}

export function shouldUseBrevoApi(env: NodeJS.ProcessEnv): boolean {
  const transport = env.EMAIL_TRANSPORT?.trim().toLowerCase();
  if (transport === "smtp") return false;
  if (transport === "brevo_api") return true;
  if (env.BREVO_API_KEY?.trim()) return true;
  // Railway Hobby/Trial blocks outbound SMTP — HTTPS API works on all plans.
  if (env.RAILWAY_ENVIRONMENT && isBrevoSmtpHost(env.SMTP_HOST?.trim())) {
    return Boolean(env.BREVO_API_KEY?.trim() || env.SMTP_PASS?.trim());
  }
  return false;
}

export function resolveBrevoApiKey(env: NodeJS.ProcessEnv): string | undefined {
  const explicit = env.BREVO_API_KEY?.trim();
  if (explicit) return explicit;
  return env.SMTP_PASS?.trim() || undefined;
}

export async function sendViaBrevoApi(
  apiKey: string,
  from: string,
  opts: SendMailOptions
): Promise<SendMailResult> {
  const sender = parseFromAddress(from);
  const payload: Record<string, unknown> = {
    sender,
    to: opts.to.map((email) => ({ email })),
    subject: opts.subject,
    htmlContent: opts.html
  };

  if (opts.text) {
    payload.textContent = opts.text;
  }

  if (opts.attachments?.length) {
    payload.attachment = opts.attachments.map((attachment) => ({
      name: attachment.filename,
      content: attachment.content.toString("base64")
    }));
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      const detail = (body?.message ?? `Brevo API HTTP ${response.status}`).slice(0, 240);
      return { sent: false, reason: "failed", detail };
    }

    return { sent: true };
  } catch (err) {
    const detail = (err instanceof Error ? err.message : String(err)).slice(0, 240);
    return { sent: false, reason: "failed", detail };
  }
}
