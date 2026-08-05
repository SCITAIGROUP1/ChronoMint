import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { HelpdeskInboundWebhookService } from "./helpdesk-inbound-webhook.service";

describe("HelpdeskInboundWebhookService", () => {
  const service = new HelpdeskInboundWebhookService();
  const body = Buffer.from('{"MessageID":"message-1"}');
  const timestamp = "1784694600000";

  it("accepts a current correctly signed request", () => {
    vi.stubEnv("HELPDESK_INBOUND_WEBHOOK_SECRET", "test-secret");
    const signature = createHmac("sha256", "test-secret")
      .update(timestamp)
      .update(".")
      .update(body)
      .digest("hex");

    expect(() =>
      service.assertVerified(body, `sha256=${signature}`, timestamp, Number(timestamp))
    ).not.toThrow();
    vi.unstubAllEnvs();
  });

  it("rejects invalid signatures", () => {
    vi.stubEnv("HELPDESK_INBOUND_WEBHOOK_SECRET", "test-secret");
    expect(() =>
      service.assertVerified(body, `sha256=${"0".repeat(64)}`, timestamp, Number(timestamp))
    ).toThrow(expect.objectContaining({ code: "UNAUTHORIZED" }));
    vi.unstubAllEnvs();
  });

  it("rejects stale signed requests to prevent replay", () => {
    vi.stubEnv("HELPDESK_INBOUND_WEBHOOK_SECRET", "test-secret");
    const signature = createHmac("sha256", "test-secret")
      .update(timestamp)
      .update(".")
      .update(body)
      .digest("hex");
    expect(() =>
      service.assertVerified(body, signature, timestamp, Number(timestamp) + 5 * 60 * 1000 + 1)
    ).toThrow(expect.objectContaining({ code: "UNAUTHORIZED" }));
    vi.unstubAllEnvs();
  });

  it("fails closed when the secret is not configured", () => {
    vi.stubEnv("HELPDESK_INBOUND_WEBHOOK_SECRET", "");
    expect(() => service.assertVerified(body, "signature", timestamp, Number(timestamp))).toThrow(
      expect.objectContaining({ code: "VALIDATION_ERROR" })
    );
    vi.unstubAllEnvs();
  });
});
