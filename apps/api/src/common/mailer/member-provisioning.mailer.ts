import { Injectable, Logger } from "@nestjs/common";
import { appOrigin } from "./app-origin.util";
import {
  renderBrandedEmailHtml,
  renderBrandedEmailText,
  subjectPrefix
} from "./branded-email.layout";
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

export type ProjectInviteWelcomeMailInput = {
  to: string;
  workspaceName: string;
  projectName: string;
  inviterName?: string;
  temporaryPassword: string;
  inviteHandoffToken: string;
};

export type ProjectInviteExistingMailInput = {
  to: string;
  workspaceName: string;
  projectName: string;
  inviterName?: string;
  /** True when the person was also newly added to the workspace in this invite. */
  workspaceJoined?: boolean;
};

function memberInvitePortal(role?: WorkspaceInviteRole): {
  origin: string;
  ctaLabel: string;
} {
  if (role === "ADMIN") {
    return { origin: appOrigin(), ctaLabel: "Sign in to Kloqra" };
  }
  return { origin: appOrigin(), ctaLabel: "Sign in to Kloqra" };
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

  /** Combined workspace welcome + project assignment for brand-new users. */
  async sendProjectInviteWelcome(input: ProjectInviteWelcomeMailInput): Promise<SendMailResult> {
    const loginUrl = buildInviteLoginUrl(appOrigin(), input.inviteHandoffToken);
    const who = input.inviterName ? `${input.inviterName} invited you` : "You've been invited";
    const layout = {
      title: `You're on ${input.projectName}`,
      preheader: `Welcome to ${input.workspaceName} — open ${input.projectName} and start tracking time.`,
      body: `${who} to ${input.workspaceName} and added you to ${input.projectName}.\n\nUse the temporary password below to sign in. You'll set your own password on first login, then you can log time on ${input.projectName}.`,
      ctaHref: loginUrl,
      ctaLabel: "Open Kloqra and set password",
      variant: "success" as const,
      details: [
        { label: "Workspace", value: input.workspaceName },
        { label: "Project", value: input.projectName },
        { label: "Email", value: input.to },
        { label: "Temporary password", value: input.temporaryPassword }
      ],
      footer: "If you did not expect this invitation, contact your workspace admin."
    };

    const result = await this.mailer.send({
      to: [input.to],
      subject: subjectPrefix(`Welcome — you're on ${input.projectName}`),
      html: renderBrandedEmailHtml(layout),
      text: renderBrandedEmailText(layout)
    });

    if (!result.sent && result.reason === "unconfigured") {
      this.logger.warn(
        `Project invite welcome email skipped (SMTP unconfigured) for ${input.to}. Temporary password logged for local dev only.`
      );
      this.logger.warn(`DEV ONLY temp password for ${input.to}: ${input.temporaryPassword}`);
    }

    return result;
  }

  /** Combined notice for existing Kloqra users added to a project (and maybe workspace). */
  async sendProjectInviteExisting(input: ProjectInviteExistingMailInput): Promise<SendMailResult> {
    const loginUrl = `${appOrigin()}/login`;
    const who = input.inviterName ? `${input.inviterName} added you` : "You've been added";
    const bodyLead = input.workspaceJoined
      ? `${who} to ${input.workspaceName} and assigned you to ${input.projectName}.`
      : `${who} to ${input.projectName} in ${input.workspaceName}.`;
    const layout = {
      title: `You're on ${input.projectName}`,
      preheader: `You can now track time on ${input.projectName}.`,
      body: `${bodyLead}\n\nSign in with your existing Kloqra account to start logging time.`,
      ctaHref: loginUrl,
      ctaLabel: "Sign in to Kloqra",
      variant: "success" as const,
      details: [
        { label: "Workspace", value: input.workspaceName },
        { label: "Project", value: input.projectName }
      ],
      footer: "If you did not expect this invitation, contact your workspace admin."
    };

    return this.mailer.send({
      to: [input.to],
      subject: subjectPrefix(`You're on ${input.projectName}`),
      html: renderBrandedEmailHtml(layout),
      text: renderBrandedEmailText(layout)
    });
  }
}
