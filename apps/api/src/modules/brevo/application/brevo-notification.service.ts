import { IDLE_TIMER_ALERT_HOURS } from "@kloqra/contracts";
import { Injectable } from "@nestjs/common";
import { BrevoMailerService } from "./brevo-mailer.service";

function clientOrigin(): string {
  const origins = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
  return origins.split(",")[0]!.trim();
}

@Injectable()
export class BrevoNotificationService {
  constructor(private mailer: BrevoMailerService) {}

  async sendProjectTeamInvite(params: {
    to: string;
    inviteUrl: string;
    projectName: string;
    workspaceName: string;
    expiresAt: string;
  }): Promise<boolean> {
    if (!this.mailer.isConfigured) return false;

    const expiry = new Date(params.expiresAt).toLocaleDateString("en-US", {
      dateStyle: "medium"
    });

    await this.mailer.send({
      to: [params.to],
      subject: `You've been invited to join ${params.projectName} on Kloqra`,
      html: `
        <p>Hi,</p>
        <p>You have been invited to join <strong>${params.projectName}</strong> in the <strong>${params.workspaceName}</strong> workspace on Kloqra.</p>
        <p><a href="${params.inviteUrl}">Accept invitation</a></p>
        <p>This link expires on ${expiry}.</p>
      `.trim()
    });
    return true;
  }

  async sendWorkspaceMemberAdded(params: {
    to: string;
    workspaceName: string;
    role: "ADMIN" | "MEMBER";
  }): Promise<boolean> {
    if (!this.mailer.isConfigured) return false;

    const roleLabel = params.role === "ADMIN" ? "Admin" : "Member";
    const appUrl = clientOrigin();

    await this.mailer.send({
      to: [params.to],
      subject: `You've been added to ${params.workspaceName} on Kloqra`,
      html: `
        <p>Hi,</p>
        <p>You have been added to <strong>${params.workspaceName}</strong> on Kloqra as a workspace <strong>${roleLabel}</strong>.</p>
        <p><a href="${appUrl}">Open Kloqra</a></p>
      `.trim()
    });
    return true;
  }

  async sendScheduledExport(params: {
    to: string[];
    scheduleName: string;
    filename: string;
    buffer: Buffer;
    contentType: string;
  }): Promise<void> {
    await this.mailer.send({
      to: params.to,
      subject: `[Kloqra] Scheduled export: ${params.scheduleName}`,
      html: `
        <p>Hi,</p>
        <p>Your scheduled export <strong>${params.scheduleName}</strong> is ready. Please find the file attached.</p>
        <p>This report was generated automatically by Kloqra.</p>
      `.trim(),
      attachments: [
        {
          filename: params.filename,
          content: params.buffer,
          contentType: params.contentType
        }
      ]
    });
  }

  async sendProjectAssignment(params: {
    to: string;
    projectName: string;
    workspaceName: string;
  }): Promise<void> {
    const appUrl = clientOrigin();

    await this.mailer.send({
      to: [params.to],
      subject: `You've been added to the ${params.projectName} team`,
      html: `
        <p>Hi,</p>
        <p>You have been added to the <strong>${params.projectName}</strong> project team in <strong>${params.workspaceName}</strong>.</p>
        <p><a href="${appUrl}">Open Kloqra</a></p>
      `.trim()
    });
  }

  async sendTimesheetReminder(params: {
    to: string;
    projectName: string;
    periodStart: string;
    periodEnd: string;
  }): Promise<void> {
    const appUrl = `${clientOrigin()}/approvals`;
    const start = new Date(params.periodStart).toLocaleDateString("en-US", { dateStyle: "medium" });
    const end = new Date(params.periodEnd).toLocaleDateString("en-US", { dateStyle: "medium" });

    await this.mailer.send({
      to: [params.to],
      subject: `Reminder: submit your timesheet for ${params.projectName}`,
      html: `
        <p>Hi,</p>
        <p>Your timesheet for <strong>${params.projectName}</strong> (${start} – ${end}) has not been submitted yet.</p>
        <p><a href="${appUrl}">Submit timesheet</a></p>
      `.trim()
    });
  }

  async sendIdleTimerAlert(params: {
    to: string;
    taskName: string;
    durationHours: number;
  }): Promise<void> {
    const appUrl = `${clientOrigin()}/timer`;

    await this.mailer.send({
      to: [params.to],
      subject: `Your timer has been running for ${params.durationHours}+ hours`,
      html: `
        <p>Hi,</p>
        <p>Your timer for <strong>${params.taskName}</strong> has been running for more than ${IDLE_TIMER_ALERT_HOURS} hours.</p>
        <p><a href="${appUrl}">Review your timer</a></p>
      `.trim()
    });
  }
}
