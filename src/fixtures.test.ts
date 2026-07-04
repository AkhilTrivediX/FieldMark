import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  type DocumentRecord,
  calculatedTotal,
  classifyScanQuality,
  createUploadedDocument,
  exportDocumentJson,
  exportDocumentsCsv,
  normalizeDocument,
  updateInvoiceField,
  validateDocument,
  validationCounts
} from "./domain.js";

interface FixtureIndexEntry {
  id: string;
  image: string;
  manifest: string;
}

interface FixtureManifest {
  id: string;
  image: string;
  fileName: string;
  tags: string[];
  expected: {
    vendorName: string;
    vendorGstin: string;
    customerName: string;
    customerGstin: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    subtotal: number;
    taxTotal: number;
    shipping: number;
    discount: number;
    invoiceTotal: number;
    calculatedTotal: number;
    hasTotalMismatch: boolean;
    hasBlockingScanIssue: boolean;
  };
}

const fixturesUrl = new URL("../fixtures/invoices/", import.meta.url);
const fixtureIndex = readJson<FixtureIndexEntry[]>(new URL("index.json", fixturesUrl));
const manifests = fixtureIndex.map((entry) => readJson<FixtureManifest>(new URL(entry.manifest, fixturesUrl)));

describe("FieldMark generated invoice fixtures", () => {
  it("ships a broad local test bank of difficult invoice images", () => {
    expect(manifests).toHaveLength(12);
    expect(manifests.map((item) => item.tags).flat()).toEqual(
      expect.arrayContaining(["low-contrast", "blur", "rotated", "shadow", "crop", "tiny", "handwritten"])
    );

    for (const entry of fixtureIndex) {
      const svg = readFileSync(fileURLToPath(new URL(entry.image, fixturesUrl)), "utf8");
      expect(svg).toContain("<svg");
      expect(svg).toContain("TAX INVOICE");
    }
  });

  it("classifies poor source images before approval", () => {
    const profile = classifyScanQuality("partial-crop-edge-low-contrast-blur-phone.pdf");
    const checkIds = profile.checks.map((check) => check.id);

    expect(profile.label).toBe("Needs new upload");
    expect(profile.score).toBeLessThan(70);
    expect(checkIds).toEqual(expect.arrayContaining(["cropped-edge", "low-contrast", "blur", "shadow"]));
  });

  it("validates every fixture manifest with scan quality and invoice math", () => {
    for (const manifest of manifests) {
      const document = documentFromManifest(manifest);
      const results = validateDocument(document);
      const counts = validationCounts(results);

      expect(calculatedTotal(document.invoice)).toBe(manifest.expected.calculatedTotal);
      expect(document.scanQuality.score).toBeGreaterThanOrEqual(35);

      if (manifest.expected.hasTotalMismatch || manifest.expected.hasBlockingScanIssue) {
        expect(counts.errors).toBeGreaterThan(0);
      } else {
        expect(counts.errors).toBe(0);
      }

      if (manifest.tags.length > 0 && !manifest.tags.includes("mismatch")) {
        expect(results.some((result) => result.source === "scan-quality")).toBe(true);
      }
    }
  });

  it("resolves the deliberate total mismatch after correction", () => {
    const manifest = manifests.find((item) => item.expected.hasTotalMismatch);
    expect(manifest).toBeDefined();

    const document = documentFromManifest(manifest!);
    const before = validationCounts(validateDocument(document));
    const correctedInvoice = updateInvoiceField(
      document.invoice,
      "invoiceTotal",
      manifest!.expected.calculatedTotal.toString()
    );
    const after = validationCounts(validateDocument({ ...document, invoice: correctedInvoice }));

    expect(before.errors).toBeGreaterThan(0);
    expect(after.errors).toBe(0);
  });

  it("exports fixture data as evidence JSON and batch CSV", () => {
    const documents = manifests.map(documentFromManifest);
    const json = exportDocumentJson(documents[0]!);
    const csv = exportDocumentsCsv(documents);

    expect(json).toContain('"scanQuality"');
    expect(json).toContain('"validation"');
    expect(csv).toContain("scan_quality,scan_score,status");
    expect(csv.split("\n")).toHaveLength(documents.length + 1);
  });
});

function documentFromManifest(manifest: FixtureManifest): DocumentRecord {
  const base = createUploadedDocument(manifest.fileName);

  return normalizeDocument({
    ...base,
    id: `fixture-${manifest.id}`,
    uploadedAt: "Fixture",
    status: "needs_review",
    invoice: {
      ...base.invoice,
      vendorName: manifest.expected.vendorName,
      vendorGstin: manifest.expected.vendorGstin,
      customerName: manifest.expected.customerName,
      customerGstin: manifest.expected.customerGstin,
      invoiceNumber: manifest.expected.invoiceNumber,
      invoiceDate: manifest.expected.invoiceDate,
      dueDate: manifest.expected.dueDate,
      lineItems: [
        {
          id: `${manifest.id}-line`,
          description: "Fixture material",
          hsnSac: "72166100",
          quantity: 1,
          unit: "Lot",
          rate: manifest.expected.subtotal,
          amount: manifest.expected.subtotal,
          evidenceId: `${manifest.id}-line`
        }
      ],
      amounts: {
        subtotal: manifest.expected.subtotal,
        taxTotal: manifest.expected.taxTotal,
        shipping: manifest.expected.shipping,
        discount: manifest.expected.discount,
        invoiceTotal: manifest.expected.invoiceTotal
      }
    }
  });
}

function readJson<T>(url: URL): T {
  return JSON.parse(readFileSync(fileURLToPath(url), "utf8")) as T;
}
