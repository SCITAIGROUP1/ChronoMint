import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isBrevoSmtpHost,
  parseFromAddress,
  resolveBrevoApiKey,
  sendViaBrevoApi,
  shouldUseBrevoApi
} from "./brevo-api.util";

describe("brevo-api.util", () => {
  describe("parseFromAddress", () => {
    it("parses name and email", () => {
      expect(parseFromAddress("Chamal Nihathamana <cjaliya.sln2@gmail.com>")).toEqual({
        name: "Chamal Nihathamana",
        email: "cjaliya.sln2@gmail.com"
      });
    });

    it("parses bare email", () => {
      expect(parseFromAddress("noreply@kloqra.app")).toEqual({ email: "noreply@kloqra.app" });
    });
  });

  describe("shouldUseBrevoApi", () => {
    it("prefers API on Railway when Brevo SMTP credentials exist", () => {
      expect(
        shouldUseBrevoApi({
          RAILWAY_ENVIRONMENT: "production",
          SMTP_HOST: "smtp-relay.brevo.com",
          SMTP_PASS: "xsmtpsib-key"
        })
      ).toBe(true);
    });

    it("honors explicit SMTP transport", () => {
      expect(
        shouldUseBrevoApi({
          EMAIL_TRANSPORT: "smtp",
          RAILWAY_ENVIRONMENT: "production",
          SMTP_HOST: "smtp-relay.brevo.com",
          SMTP_PASS: "xsmtpsib-key"
        })
      ).toBe(false);
    });

    it("uses API when BREVO_API_KEY is set", () => {
      expect(shouldUseBrevoApi({ BREVO_API_KEY: "key" })).toBe(true);
    });
  });

  describe("resolveBrevoApiKey", () => {
    it("prefers BREVO_API_KEY over SMTP_PASS", () => {
      expect(
        resolveBrevoApiKey({
          BREVO_API_KEY: "explicit",
          SMTP_PASS: "smtp"
        })
      ).toBe("explicit");
    });
  });

  describe("isBrevoSmtpHost", () => {
    it("detects Brevo hosts", () => {
      expect(isBrevoSmtpHost("smtp-relay.brevo.com")).toBe(true);
      expect(isBrevoSmtpHost("smtp-relay.sendinblue.com")).toBe(true);
      expect(isBrevoSmtpHost("smtp.gmail.com")).toBe(false);
    });
  });

  describe("sendViaBrevoApi", () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("sends transactional email via HTTPS", async () => {
      vi.mocked(global.fetch).mockResolvedValue(new Response(null, { status: 201 }));

      const result = await sendViaBrevoApi("api-key", "Kloqra <noreply@kloqra.app>", {
        to: ["member@example.com"],
        subject: "Welcome",
        html: "<p>hi</p>",
        text: "hi"
      });

      expect(result).toEqual({ sent: true });
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.brevo.com/v3/smtp/email",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "api-key": "api-key" })
        })
      );
    });

    it("returns sanitized failure detail from Brevo", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ message: "Invalid sender" }), { status: 400 })
      );

      const result = await sendViaBrevoApi("api-key", "noreply@kloqra.app", {
        to: ["member@example.com"],
        subject: "Welcome",
        html: "<p>hi</p>"
      });

      expect(result).toEqual({
        sent: false,
        reason: "failed",
        detail: "Invalid sender"
      });
    });
  });
});
