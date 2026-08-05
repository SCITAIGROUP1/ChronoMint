import { InjectQueue } from "@nestjs/bullmq";
import { Body, Controller, Headers, Logger, Post, Req } from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import { TicketChannel, TicketType } from "@prisma/client";
import { Queue } from "bullmq";
import type { Request } from "express";
import { QUEUES } from "../../../../common/queues";
import { HelpdeskInboundWebhookService } from "../../application/helpdesk-inbound-webhook.service";
import { IngestTicketJobPayload } from "../../workers/job-payloads";

@Controller("helpdesk/email-inbound")
export class HelpdeskEmailInboundController {
  private readonly logger = new Logger(HelpdeskEmailInboundController.name);

  constructor(
    @InjectQueue(QUEUES.HELPDESK_INGEST) private readonly ingestQueue: Queue,
    private readonly webhook: HelpdeskInboundWebhookService
  ) {}

  @Post()
  async handleIncomingEmail(
    @Req() req: RawBodyRequest<Request>,
    @Headers("x-helpdesk-signature") signature: string | undefined,
    @Headers("x-helpdesk-timestamp") timestamp: string | undefined,
    @Body() payload: any
  ) {
    this.webhook.assertVerified(req.rawBody, signature, timestamp);
    this.logger.log(`Received inbound email webhook`);

    try {
      // Assuming a generic JSON webhook from Brevo/Postmark
      const subject = payload.Subject || "No Subject";
      const body = payload.TextBody || "No Content";
      const htmlBody = payload.HtmlBody || undefined;
      const requesterEmail = payload.FromFull?.Email || payload.From || "unknown@example.com";
      const requesterName = payload.FromFull?.Name || requesterEmail;
      const messageId = payload.MessageID || payload.MessageId;

      const jobPayload: IngestTicketJobPayload = {
        channel: TicketChannel.EMAIL,
        ticketType: TicketType.GENERAL,
        subject,
        body,
        htmlBody,
        requesterName,
        requesterEmail,
        emailMessageId: messageId
      };

      await this.ingestQueue.add("ingest", jobPayload);
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Failed to process inbound email: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }
}
