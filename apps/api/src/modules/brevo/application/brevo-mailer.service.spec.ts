import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn().mockResolvedValue({ messageId: "test" });
const createTransport = vi.fn(() => ({ sendMail }));

vi.mock("nodemailer", () => ({
  default: { createTransport },
  createTransport
}));

describe("BrevoMailerService", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    sendMail.mockClear();
    createTransport.mockClear();
    process.env = { ...envBackup };
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  async function loadService() {
    const { BrevoMailerService } = await import("./brevo-mailer.service");
    return new BrevoMailerService();
  }

  it("is not configured when BREVO_SMTP_KEY is unset", async () => {
    delete process.env.BREVO_SMTP_KEY;
    const service = await loadService();
    expect(service.isConfigured).toBe(false);
    await service.send({ to: ["a@b.com"], subject: "Hi", html: "<p>Hi</p>" });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("creates Brevo SMTP transport when key is set", async () => {
    process.env.BREVO_SMTP_KEY = "test-key";
    process.env.BREVO_SMTP_USER = "user@smtp-brevo.com";
    process.env.BREVO_SMTP_FROM = "Kloqra <noreply@test.com>";

    const service = await loadService();

    expect(service.isConfigured).toBe(true);
    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: { user: "user@smtp-brevo.com", pass: "test-key" }
    });
  });

  it("is not configured when BREVO_SMTP_FROM is missing or invalid", async () => {
    process.env.BREVO_SMTP_KEY = "test-key";
    process.env.BREVO_SMTP_FROM = "xx";

    const service = await loadService();

    expect(service.isConfigured).toBe(false);
    await service.send({ to: ["user@example.com"], subject: "Hi", html: "<p>Hi</p>" });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("rethrows SMTP errors after logging", async () => {
    process.env.BREVO_SMTP_KEY = "test-key";
    process.env.BREVO_SMTP_FROM = "Kloqra <noreply@test.com>";
    sendMail.mockRejectedValueOnce(new Error("451 Invalid from"));

    const service = await loadService();

    await expect(
      service.send({ to: ["user@example.com"], subject: "Hi", html: "<p>Hi</p>" })
    ).rejects.toThrow("451 Invalid from");
  });

  it("sends mail with attachments", async () => {
    process.env.BREVO_SMTP_KEY = "test-key";
    process.env.BREVO_SMTP_FROM = "Kloqra <noreply@test.com>";

    const service = await loadService();
    const buffer = Buffer.from("csv-data");

    await service.send({
      to: ["user@example.com"],
      subject: "Export",
      html: "<p>File attached</p>",
      attachments: [{ filename: "report.csv", content: buffer, contentType: "text/csv" }]
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Kloqra <noreply@test.com>",
        to: "user@example.com",
        subject: "Export",
        attachments: [
          expect.objectContaining({
            filename: "report.csv",
            content: buffer,
            contentType: "text/csv"
          })
        ]
      })
    );
  });
});
