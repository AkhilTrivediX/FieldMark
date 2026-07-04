import { describe, expect, it } from "vitest";
import { calculatedTotal, validationCounts, validateDocument } from "./domain.js";
import { parseInvoiceText } from "./localExtraction.js";

describe("local invoice extraction parser", () => {
  it("maps OCR text into invoice JSON with evidence and math validation", () => {
    const parsed = parseInvoiceText(
      [
        "ACME SUPPLIES PVT LTD",
        "123 Industrial Area Pune",
        "GSTIN: 27AABCA1234B1Z5",
        "TAX INVOICE",
        "Invoice No: INV-2048",
        "Invoice Date: 02 Jul 2026",
        "Due Date: 16 Jul 2026",
        "Bill To",
        "BrightBuild Constructions",
        "GSTIN: 29ABCDE1234F1Z5",
        "Description Qty Rate Amount",
        "Steel Channel 20 120.00 2400.00",
        "Hex Bolt 100 8.00 800.00",
        "Subtotal 3200.00",
        "CGST 160.00",
        "SGST 160.00",
        "Shipping 120.00",
        "Grand Total 3640.00"
      ].join("\n"),
      "invoice.pdf"
    );

    expect(parsed.invoice.vendorName).toBe("ACME SUPPLIES PVT LTD");
    expect(parsed.invoice.vendorGstin).toBe("27AABCA1234B1Z5");
    expect(parsed.invoice.customerName).toBe("BrightBuild Constructions");
    expect(parsed.invoice.invoiceNumber).toBe("INV-2048");
    expect(parsed.invoice.amounts.invoiceTotal).toBe(3640);
    expect(calculatedTotal(parsed.invoice)).toBe(3640);
    expect(parsed.evidenceRegions.map((region) => region.fieldKey)).toContain("invoiceTotal");

    const document = {
      id: "test-doc",
      fileName: "invoice.pdf",
      uploadedAt: "Test",
      pages: 1,
      category: "Purchase invoice",
      status: "needs_review" as const,
      source: "upload" as const,
      scanQuality: {
        label: "Clean scan",
        score: 98,
        checks: []
      },
      invoice: parsed.invoice,
      evidenceRegions: parsed.evidenceRegions
    };

    expect(validationCounts(validateDocument(document)).errors).toBe(0);
  });
});
