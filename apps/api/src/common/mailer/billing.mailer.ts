import { Injectable, Logger } from "@nestjs/common";
import {
  renderBrandedEmailHtml,
  renderBrandedEmailText,
  subjectPrefix
} from "./branded-email.layout";
import { MailerService, type SendMailResult } from "./mailer.service";

@Injectable()
export class BillingMailer {
  private readonly logger = new Logger(BillingMailer.name);

  constructor(private readonly mailer: MailerService) {}

  async sendPaymentFailed(input: {
    to: string;
    name: string;
    billingUrl: string;
  }): Promise<SendMailResult> {
    const layout = {
      title: "Payment failed",
      preheader: "Update your payment method to keep logging time.",
      body: `Hi ${input.name},\n\nWe could not process your latest subscription payment. Time logging is paused until billing is updated.`,
      ctaHref: input.billingUrl,
      ctaLabel: "Update billing",
      variant: "attention" as const,
      footer: "If you already updated your card, you can ignore this email."
    };

    const result = await this.mailer.send({
      to: [input.to],
      subject: subjectPrefix("Payment failed — action required"),
      html: renderBrandedEmailHtml(layout),
      text: renderBrandedEmailText(layout)
    });

    if (!result.sent && result.reason === "unconfigured") {
      this.logger.warn(`Payment failed email skipped (mailer unconfigured) for ${input.to}`);
    }

    return result;
  }

  async sendTrialEnding(input: {
    to: string;
    name: string;
    trialEndsAt: string | null;
    billingUrl: string;
  }): Promise<SendMailResult> {
    const endLabel = input.trialEndsAt
      ? new Date(input.trialEndsAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric"
        })
      : "soon";

    const layout = {
      title: "Trial ending soon",
      preheader: "Choose a plan before your trial ends.",
      body: `Hi ${input.name},\n\nYour Kloqra trial ends on ${endLabel}. Upgrade now to keep your workspaces and time data.`,
      ctaHref: input.billingUrl,
      ctaLabel: "Choose a plan",
      variant: "info" as const
    };

    const result = await this.mailer.send({
      to: [input.to],
      subject: subjectPrefix("Your trial is ending soon"),
      html: renderBrandedEmailHtml(layout),
      text: renderBrandedEmailText(layout)
    });

    if (!result.sent && result.reason === "unconfigured") {
      this.logger.warn(`Trial ending email skipped (mailer unconfigured) for ${input.to}`);
    }

    return result;
  }
}
