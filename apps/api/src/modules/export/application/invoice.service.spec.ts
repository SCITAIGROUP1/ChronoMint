import { describe, expect, it, vi } from "vitest";
import { InvoiceService } from "./invoice.service";

describe("InvoiceService", () => {
  it("always excludes non-project time from invoice logs", async () => {
    process.env.CLIENT_COMMERCIAL_FEATURES_ENABLED = "true";
    const fetchLogs = vi.fn().mockResolvedValue([]);
    const service = new InvoiceService(
      {
        project: {
          findFirst: vi.fn().mockResolvedValue({ id: "p1", name: "Website", clientName: "Acme" })
        }
      } as never,
      { fetchLogs, resolveRateMaps: vi.fn() } as never
    );

    await service
      .generate("ws-1", {
        projectId: "p1",
        from: "2026-08-01",
        to: "2026-08-31",
        invoiceNumber: "INV-1",
        dueDate: "2026-09-15",
        companyName: "Kloqra",
        clientName: "Acme"
      })
      .catch(() => undefined);

    expect(fetchLogs).toHaveBeenCalledWith(
      "ws-1",
      expect.objectContaining({
        billable: "billable",
        nonProjectTime: "exclude"
      })
    );
  });
});
