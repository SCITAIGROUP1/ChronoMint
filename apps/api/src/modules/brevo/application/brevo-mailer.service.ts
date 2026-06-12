import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

function extractEmailAddress(from: string): string {
  const match = /<([^>]+)>/.exec(from);
  return (match?.[1] ?? from).trim();
}

export function resolveBrevoFromAddress(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;

  const email = extractEmailAddress(value);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return valid ? value : null;
}

export interface BrevoMailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface BrevoSendMailOptions {
  to: string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: BrevoMailAttachment[];
}

/**
 * Nodemailer transport for Brevo SMTP relay.
 * Reads BREVO_SMTP_* from env. No-ops when BREVO_SMTP_KEY is unset.
 */
@Injectable()
export class BrevoMailerService {
  private readonly logger = new Logger(BrevoMailerService.name);
  private transporter: Transporter | null = null;
  private readonly from: string;

  constructor() {
    const key = process.env.BREVO_SMTP_KEY?.trim();
    const configuredFrom = process.env.BREVO_SMTP_FROM?.trim();
    const from = resolveBrevoFromAddress(configuredFrom);
    this.from = from ?? "";

    if (!key) {
      this.logger.warn(
        "BREVO_SMTP_KEY is not configured — email delivery is disabled. " +
          "Set BREVO_SMTP_KEY and BREVO_SMTP_FROM to enable Brevo."
      );
      return;
    }

    if (!from) {
      this.logger.warn(
        configuredFrom
          ? `BREVO_SMTP_FROM is invalid ("${configuredFrom}") — email delivery is disabled. ` +
              "Set a verified sender address in BREVO_SMTP_FROM."
          : "BREVO_SMTP_FROM is not configured — email delivery is disabled. " +
              "Set BREVO_SMTP_FROM with a verified sender address."
      );
      return;
    }

    const host = process.env.BREVO_SMTP_HOST?.trim() ?? "smtp-relay.brevo.com";
    const port = Number(process.env.BREVO_SMTP_PORT ?? 587);

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER?.trim(),
        pass: key
      }
    });

    this.logger.log(`Brevo mailer configured — host: ${host}:${port}`);
  }

  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  async send(opts: BrevoSendMailOptions): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `Email not sent (Brevo unconfigured): to=${opts.to.join(", ")} subject="${opts.subject}"`
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: opts.to.join(", "),
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        attachments: opts.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType
        }))
      });

      this.logger.log(`Email sent: to=${opts.to.join(", ")} subject="${opts.subject}"`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Email delivery failed: to=${opts.to.join(", ")} subject="${opts.subject}" error="${message}"`
      );
      throw err;
    }
  }
}
