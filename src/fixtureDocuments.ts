import {
  type DocumentRecord,
  type EvidenceRegion,
  type ExtractedField,
  createUploadedDocument,
  normalizeDocument,
  validateDocument,
  validationCounts
} from "./domain.js";
import { type GeneratedFixture, generatedFixtures } from "./generatedFixtures.js";

export interface FixtureRun {
  fixture: GeneratedFixture;
  document: DocumentRecord;
  errors: number;
  warnings: number;
  passed: number;
  outcome: "clean" | "review" | "blocked";
}

export function createFixtureDocument(fixture: GeneratedFixture): DocumentRecord {
  const base = createUploadedDocument(fixture.fileName);

  const document = normalizeDocument({
    ...base,
    id: `fixture-${fixture.id}`,
    uploadedAt: "Fixture",
    status: "needs_review",
    source: "import",
    processingMessage: "Fixture loaded from test lab",
    sourcePreview: {
      kind: "image",
      image: fixture.image,
      width: 1120,
      height: 1580,
      page: 1,
      mimeType: "image/svg+xml"
    },
    evidenceRegions: [
      fixtureEvidence("vendorName", "Vendor name", fixture.expected.vendorName),
      fixtureEvidence("invoiceNumber", "Invoice number", fixture.expected.invoiceNumber),
      fixtureEvidence("invoiceDate", "Invoice date", fixture.expected.invoiceDate),
      fixtureEvidence("invoiceTotal", "Invoice total", fixture.expected.invoiceTotal.toFixed(2))
    ],
    invoice: {
      ...base.invoice,
      vendorName: fixture.expected.vendorName,
      vendorGstin: fixture.expected.vendorGstin,
      customerName: fixture.expected.customerName,
      customerGstin: fixture.expected.customerGstin,
      invoiceNumber: fixture.expected.invoiceNumber,
      invoiceDate: fixture.expected.invoiceDate,
      dueDate: fixture.expected.dueDate,
      lineItems: [
        {
          id: `${fixture.id}-line`,
          description: "Fixture material",
          hsnSac: "72166100",
          quantity: 1,
          unit: "Lot",
          rate: fixture.expected.subtotal,
          amount: fixture.expected.subtotal,
          evidenceId: `${fixture.id}-line`
        }
      ],
      amounts: {
        subtotal: fixture.expected.subtotal,
        taxTotal: fixture.expected.taxTotal,
        shipping: fixture.expected.shipping,
        discount: fixture.expected.discount,
        invoiceTotal: fixture.expected.invoiceTotal
      }
    }
  });
  const counts = validationCounts(validateDocument(document));

  return {
    ...document,
    status: counts.errors > 0 || counts.warnings > 0 ? "needs_review" : "ready"
  };
}

function fixtureEvidence(
  fieldKey: ExtractedField["key"],
  label: string,
  text: string
): EvidenceRegion {
  return {
    id: `fixture-${String(fieldKey)}`,
    fieldKey,
    label,
    text,
    confidence: 96,
    page: 1
  };
}

export function runFixtureSuite(): FixtureRun[] {
  return generatedFixtures.map((fixture) => {
    const document = createFixtureDocument(fixture);
    const counts = validationCounts(validateDocument(document));

    return {
      fixture,
      document,
      errors: counts.errors,
      warnings: counts.warnings,
      passed: counts.passed,
      outcome: counts.errors > 0 ? "blocked" : counts.warnings > 0 ? "review" : "clean"
    };
  });
}

export function fixtureSuiteSummary(runs = runFixtureSuite()) {
  return {
    total: runs.length,
    clean: runs.filter((run) => run.outcome === "clean").length,
    review: runs.filter((run) => run.outcome === "review").length,
    blocked: runs.filter((run) => run.outcome === "blocked").length
  };
}
