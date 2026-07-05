import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  calculatedTotal,
  classifyScanQuality,
  exportDocumentJson,
  exportDocumentsCsv,
  updateInvoiceField,
  validateDocument,
  validationCounts
} from "./domain.js";
import { createFixtureDocument, runFixtureSuite } from "./fixtureDocuments.js";
import { generatedFixtures } from "./generatedFixtures.js";

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

const fixturesUrl = new URL("../public/fixtures/invoices/", import.meta.url);
const fixtureIndex = readJson<FixtureIndexEntry[]>(new URL("index.json", fixturesUrl));
const manifests = fixtureIndex.map((entry) => readJson<FixtureManifest>(new URL(entry.manifest, fixturesUrl)));

describe("FieldMark generated invoice fixtures", () => {
  it("ships a broad local test bank of difficult invoice images", () => {
    expect(manifests).toHaveLength(12);
    expect(generatedFixtures).toHaveLength(manifests.length);
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
    for (const fixture of generatedFixtures) {
      const document = createFixtureDocument(fixture);
      const results = validateDocument(document);
      const counts = validationCounts(results);

      expect(calculatedTotal(document.invoice)).toBe(fixture.expected.calculatedTotal);
      expect(document.scanQuality.score).toBeGreaterThanOrEqual(35);
      expect(document.sourcePreview?.width).toBe(1240);
      expect(document.sourcePreview?.height).toBe(1754);
      expect(document.evidenceRegions?.every((region) => region.bbox)).toBe(true);

      if (fixture.expected.hasTotalMismatch || fixture.expected.hasBlockingScanIssue) {
        expect(counts.errors).toBeGreaterThan(0);
      } else {
        expect(counts.errors).toBe(0);
      }

      if (fixture.tags.length > 0 && !fixture.tags.includes("mismatch")) {
        expect(results.some((result) => result.source === "scan-quality")).toBe(true);
      }
    }
  });

  it("resolves the deliberate total mismatch after correction", () => {
    const fixture = generatedFixtures.find((item) => item.expected.hasTotalMismatch);
    expect(fixture).toBeDefined();

    const document = createFixtureDocument(fixture!);
    const before = validationCounts(validateDocument(document));
    const correctedInvoice = updateInvoiceField(
      document.invoice,
      "invoiceTotal",
      fixture!.expected.calculatedTotal.toString()
    );
    const after = validationCounts(validateDocument({ ...document, invoice: correctedInvoice }));

    expect(before.errors).toBeGreaterThan(0);
    expect(after.errors).toBe(0);
  });

  it("exports fixture data as evidence JSON and batch CSV", () => {
    const documents = generatedFixtures.map(createFixtureDocument);
    const json = exportDocumentJson(documents[0]!);
    const csv = exportDocumentsCsv(documents);

    expect(json).toContain('"scanQuality"');
    expect(json).toContain('"validation"');
    expect(csv).toContain("scan_quality,scan_score,status");
    expect(csv.split("\n")).toHaveLength(documents.length + 1);
  });

  it("summarizes fixture outcomes for the in-app test lab", () => {
    const runs = runFixtureSuite();

    expect(runs).toHaveLength(12);
    expect(runs.some((run) => run.outcome === "blocked")).toBe(true);
    expect(runs.some((run) => run.outcome === "review")).toBe(true);
    expect(runs.some((run) => run.outcome === "clean")).toBe(true);
  });
});

function readJson<T>(url: URL): T {
  return JSON.parse(readFileSync(fileURLToPath(url), "utf8")) as T;
}
