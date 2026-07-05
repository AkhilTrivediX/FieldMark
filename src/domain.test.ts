import { describe, expect, it } from "vitest";
import {
  calculatedTotal,
  classifyDocumentCategory,
  exportDocumentJson,
  exportDocumentsCsv,
  exportReadiness,
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
    expect(csv).toContain("file_name,category,vendor,invoice_number");
    expect(csv).toContain("INV-2048.pdf");
    expect(csv).toContain("Purchase invoice");
  });

  it("classifies common document categories from names and text", () => {
    expect(classifyDocumentCategory("CN-0456.pdf", "Credit note for returned goods")).toBe("Credit note");
    expect(classifyDocumentCategory("receipt.jpg", "Payment received in full")).toBe("Receipt");
    expect(classifyDocumentCategory("bank-statement.pdf", "Account statement")).toBe("Statement");
    expect(classifyDocumentCategory("supplier-invoice.pdf", "Tax Invoice")).toBe("Purchase invoice");
  });

  it("blocks accounting CSV readiness when documents have validation errors", () => {
    const blocked = exportReadiness([sampleDocument]);
    const correctedInvoice = updateInvoiceField(sampleDocument.invoice, "invoiceTotal", "4784");
    const ready = exportReadiness([{ ...sampleDocument, invoice: correctedInvoice }]);

    expect(blocked.canExportCsv).toBe(false);
    expect(blocked.blockedDocuments).toHaveLength(1);
    expect(ready.canExportCsv).toBe(true);
    expect(ready.blockedDocuments).toHaveLength(0);
  });
});
