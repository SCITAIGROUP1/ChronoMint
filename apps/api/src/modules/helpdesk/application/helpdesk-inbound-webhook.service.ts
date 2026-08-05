import { createHmac, timingSafeEqual } from "node:crypto";
import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { DomainException } from "../../../common/errors/domain.exception";

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

@Injectable()
export class HelpdeskInboundWebhookService {
  assertVerified(
    rawBody: Buffer | undefined,
    signature: string | undefined,
    timestamp: string | undefined,
    now = Date.now()
  ): void {
    const secret = process.env.HELPDESK_INBOUND_WEBHOOK_SECRET?.trim();
    if (!secret) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Helpdesk inbound webhook secret is not configured",
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
    if (!rawBody || !signature || !timestamp) {
      this.unauthorized();
    }

    const timestampMs = Number(timestamp);
    if (!Number.isFinite(timestampMs) || Math.abs(now - timestampMs) > MAX_CLOCK_SKEW_MS) {
      this.unauthorized();
    }

    const expected = createHmac("sha256", secret)
      .update(timestamp)
      .update(".")
      .update(rawBody)
      .digest("hex");
    const supplied = signature.startsWith("sha256=") ? signature.slice(7) : signature;
    const expectedBuffer = Buffer.from(expected, "hex");
    const suppliedBuffer = Buffer.from(supplied, "hex");
    if (
      suppliedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(suppliedBuffer, expectedBuffer)
    ) {
      this.unauthorized();
    }
  }

  private unauthorized(): never {
    throw new DomainException(
      ErrorCodes.UNAUTHORIZED,
      "Invalid helpdesk webhook signature",
      HttpStatus.UNAUTHORIZED
    );
  }
}
