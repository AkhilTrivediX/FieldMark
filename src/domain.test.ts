import { describe, expect, it } from "vitest";
import {
  calculatedTotal,
  exportDocumentJson,
  exportDocumentsCsv,
  seedDocuments,
  updateInvoiceField,
  validateInvoice,
  validationCounts
} from "./domain.js";

describe("Fieldmark invoice validation", () => {
  const sampleDocument = seedDocuments[0]!;

  it("detects a printed total mismatch deterministically", () => {
    const invoice = sampleDocument.invoice;

    expect(calculatedTotal(invoice)).toBe(4784);

    const results = validateInvoice(invoice);
    const totalMismatch = results.find((result) => result.id === "total-mismatch");

    expect(totalMismatch?.severity).toBe("error");
    expect(totalMismatch?.expected).toBe("4,784.00");
    expect(totalMismatch?.actual).toBe("4,820.00");
    expect(totalMismatch?.difference).toBe("36.00");
  });

  it("passes the total rule after correcting the printed total", () => {
    const corrected = updateInvoiceField(sampleDocument.invoice, "invoiceTotal", "4784");
    const results = validateInvoice(corrected);
    const counts = validationCounts(results);

    expect(counts.errors).toBe(0);
    expect(results.find((result) => result.id === "total-mismatch")?.severity).toBe("pass");
  });

  it("exports evidence JSON and accounting CSV", () => {
    const document = sampleDocument;
    const json = exportDocumentJson(document);
    const csv = exportDocumentsCsv(seedDocuments.slice(0, 2));

    expect(json).toContain('"invoiceNumber": "INV-2048"');
    expect(json).toContain('"validation"');
    expect(csv).toContain("file_name,vendor,invoice_number");
    expect(csv).toContain("INV-2048.pdf");
  });
});
