import { Injectable, Logger } from "@nestjs/common";
import { adminClientOrigin } from "./admin-origin.util";
import {
  renderBrandedEmailHtml,
  renderBrandedEmailText,
  subjectPrefix
} from "./branded-email.layout";
import { memberClientOrigin } from "./client-origin.util";
import { buildInviteLoginUrl } from "./invite-login-url.util";
import { MailerService, type SendMailResult } from "./mailer.service";

export type WorkspaceInviteRole = "ADMIN" | "MEMBER";

export type MemberCredentialsMailInput = {
  to: string;
  workspaceName: string;
  inviterName?: string;
  temporaryPassword: string;
  inviteHandoffToken: string;
  role?: WorkspaceInviteRole;
};

export type WorkspaceAddedMailInput = {
  to: string;
  workspaceName: string;
  inviterName?: string;
  role?: WorkspaceInviteRole;
};

function memberInvitePortal(role?: WorkspaceInviteRole): {
  origin: string;
  ctaLabel: string;
} {
  if (role === "ADMIN") {
    return { origin: adminClientOrigin(), ctaLabel: "Sign in to Kloqra Admin" };
  }
  return { origin: memberClientOrigin(), ctaLabel: "Sign in to Kloqra" };
}

@Injectable()
export class MemberProvisioningMailer {
  private readonly logger = new Logger(MemberProvisioningMailer.name);

  constructor(private readonly mailer: MailerService) {}

  get isConfigured(): boolean {
    return this.mailer.isConfigured;
  }

  async sendNewMemberCredentials(input: MemberCredentialsMailInput): Promise<SendMailResult> {
    const portal = memberInvitePortal(input.role);
    const loginUrl = buildInviteLoginUrl(portal.origin, input.inviteHandoffToken);
    const intro = input.inviterName
      ? `${input.inviterName} added you to ${input.workspaceName}.`
      : `You've been added to ${input.workspaceName}.`;

    const layout = {
      title: `Welcome to ${input.workspaceName}`,
      preheader: "Your Kloqra sign-in details are inside.",
      body: `${intro}\n\nSign in with the credentials below. You will be asked to set a new password on first login.`,
      ctaHref: loginUrl,
      ctaLabel: portal.ctaLabel,
      variant: "success" as const,
      details: [
        { label: "Email", value: input.to },
        { label: "Temporary password", value: input.temporaryPassword },
        { label: "Sign-in URL", value: loginUrl }
      ],
      footer: "If you did not expect this email, contact your workspace admin."
    };

    const result = await this.mailer.send({
      to: [input.to],
      subject: subjectPrefix(
        input.role === "ADMIN"
          ? `Workspace admin access for ${input.workspaceName}`
          : `You've been added to ${input.workspaceName}`
      ),
      html: renderBrandedEmailHtml(layout),
      text: renderBrandedEmailText(layout)
    });

    if (!result.sent && result.reason === "unconfigured") {
      this.logger.warn(
        `Member credentials email skipped (SMTP unconfigured) for ${input.to}. Temporary password logged for local dev only.`
      );
      this.logger.warn(`DEV ONLY temp password for ${input.to}: ${input.temporaryPassword}`);
    }

    return result;
  }

  async sendWorkspaceAdded(input: WorkspaceAddedMailInput): Promise<SendMailResult> {
    const portal = memberInvitePortal(input.role);
    const loginUrl = `${portal.origin}/login`;
    const intro = input.inviterName
      ? `${input.inviterName} added you to ${input.workspaceName}.`
      : `You've been added to ${input.workspaceName}.`;

    const layout = {
      title: `Welcome to ${input.workspaceName}`,
      preheader: "You can sign in with your existing Kloqra account.",
      body: `${intro}\n\nSign in with your existing Kloqra account to get started.`,
      ctaHref: loginUrl,
      ctaLabel: portal.ctaLabel,
      variant: "success" as const,
      footer: "If you did not expect this email, contact your workspace admin."
    };

    return this.mailer.send({
      to: [input.to],
      subject: subjectPrefix(
        input.role === "ADMIN"
          ? `Workspace admin access for ${input.workspaceName}`
          : `You've been added to ${input.workspaceName}`
      ),
      html: renderBrandedEmailHtml(layout),
      text: renderBrandedEmailText(layout)
    });
  }
}
