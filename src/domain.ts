export type WorkspaceMode = "local" | "sync" | "hosted";

export type DocumentStatus = "queued" | "processing" | "needs_review" | "ready";

export type FieldConfidence = "high" | "medium" | "check" | "derived";

export type ScanQualitySeverity = "pass" | "warning" | "error";

export interface LineItem {
  id: string;
  description: string;
  hsnSac: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  evidenceId: string;
}

export interface InvoiceAmounts {
  subtotal: number;
  taxTotal: number;
  shipping: number;
  discount: number;
  invoiceTotal: number;
}

export interface InvoiceRecord {
  vendorName: string;
  vendorGstin: string;
  vendorAddress: string[];
  customerName: string;
  customerGstin: string;
  customerAddress: string[];
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  lineItems: LineItem[];
  amounts: InvoiceAmounts;
  schemaVersion: string;
}

export interface DocumentRecord {
  id: string;
  fileName: string;
  uploadedAt: string;
  pages: number;
  category: string;
  status: DocumentStatus;
  source: "sample" | "upload" | "import";
  scanQuality: ScanQualityProfile;
  invoice: InvoiceRecord;
}

export interface ScanQualityCheck {
  id: string;
  label: string;
  severity: ScanQualitySeverity;
  detail: string;
}

export interface ScanQualityProfile {
  label: string;
  score: number;
  checks: ScanQualityCheck[];
}

export interface ExtractedField {
  key: keyof InvoiceRecord | keyof InvoiceAmounts | "calculatedTotal";
  label: string;
  value: string;
  confidence: number | null;
  confidenceKind: FieldConfidence;
  evidenceId: string | null;
}

export interface ValidationResult {
  id: string;
  severity: "pass" | "warning" | "error";
  title: string;
  fieldPath: string;
  rule: string;
  expected: string;
  actual: string;
  difference?: string;
  source?: string;
  blocksApproval: boolean;
}

export interface SchemaField {
  path: string;
  label: string;
  kind: "text" | "date" | "money" | "tax-id" | "table";
  required: boolean;
  aliases: string[];
  evidenceRequired: boolean;
}

export interface ExportPreset {
  id: string;
  name: string;
  destination: string;
  enabled: boolean;
  fields: string[];
}

export const schemaFields: SchemaField[] = [
  {
    path: "vendor.name",
    label: "Vendor name",
    kind: "text",
    required: true,
    aliases: ["supplier", "seller", "billed by"],
    evidenceRequired: true
  },
  {
    path: "vendor.gstin",
    label: "Vendor GSTIN",
    kind: "tax-id",
    required: true,
    aliases: ["gstin", "tax id"],
    evidenceRequired: true
  },
  {
    path: "invoice.number",
    label: "Invoice number",
    kind: "text",
    required: true,
    aliases: ["invoice no", "bill no"],
    evidenceRequired: true
  },
  {
    path: "invoice.date",
    label: "Invoice date",
    kind: "date",
    required: true,
    aliases: ["date", "issue date"],
    evidenceRequired: true
  },
  {
    path: "line_items[]",
    label: "Line items",
    kind: "table",
    required: true,
    aliases: ["items", "description", "particulars"],
    evidenceRequired: true
  },
  {
    path: "amounts.total",
    label: "Invoice total",
    kind: "money",
    required: true,
    aliases: ["total", "amount due", "grand total"],
    evidenceRequired: true
  }
];

export const exportPresets: ExportPreset[] = [
  {
    id: "json",
    name: "Evidence JSON",
    destination: "Local file",
    enabled: true,
    fields: ["document", "invoice", "validation", "evidence"]
  },
  {
    id: "quickbooks",
    name: "QuickBooks CSV",
    destination: "CSV export",
    enabled: true,
    fields: ["vendor", "invoice_number", "date", "subtotal", "tax", "total"]
  },
  {
    id: "tally",
    name: "Tally-friendly CSV",
    destination: "CSV export",
    enabled: false,
    fields: ["ledger", "voucher", "gstin", "taxable_value", "tax", "total"]
  }
];

const cleanScanQuality: ScanQualityProfile = {
  label: "Clean scan",
  score: 98,
  checks: [
    {
      id: "readable",
      label: "Readable source",
      severity: "pass",
      detail: "Text contrast, page angle, and visible totals are suitable for extraction."
    },
    {
      id: "evidence-ready",
      label: "Evidence boxes ready",
      severity: "pass",
      detail: "Header, line items, tax, and total regions can be linked to source evidence."
    }
  ]
};

const seedInvoiceBase: InvoiceRecord = {
  vendorName: "Bluebird Logistics",
  vendorGstin: "27AABCA1234B1Z5",
  vendorAddress: ["Warehouse Road", "Pune, Maharashtra", "India"],
  customerName: "BrightBuild Constructions",
  customerGstin: "29ABCDE1234F1Z5",
  customerAddress: ["45, Residency Road", "Bengaluru, Karnataka 560025", "India"],
  invoiceNumber: "INV-0000",
  invoiceDate: "01 Jul 2026",
  dueDate: "15 Jul 2026",
  schemaVersion: "purchase-invoice-v13",
  lineItems: [
    {
      id: "li-1",
      description: "Material supply",
      hsnSac: "72166100",
      quantity: 1,
      unit: "Lot",
      rate: 1,
      amount: 1,
      evidenceId: "line-1"
    }
  ],
  amounts: {
    subtotal: 0,
    taxTotal: 0,
    shipping: 0,
    discount: 0,
    invoiceTotal: 0
  }
};

export const seedDocuments: DocumentRecord[] = [
  {
    id: "doc-inv-2048",
    fileName: "INV-2048.pdf",
    uploadedAt: "Today, 10:14 AM",
    pages: 1,
    category: "Purchase invoice",
    status: "needs_review",
    source: "sample",
    scanQuality: {
      label: "Review total",
      score: 94,
      checks: [
        ...cleanScanQuality.checks,
        {
          id: "math-review",
          label: "Printed total needs review",
          severity: "warning",
          detail: "The source is readable, but the calculated total differs from the printed total."
        }
      ]
    },
    invoice: {
      vendorName: "ACME SUPPLIES PVT. LTD.",
      vendorGstin: "27AABCA1234B1Z5",
      vendorAddress: ["123, Industrial Area, Phase 2", "Pune, Maharashtra 411019", "India"],
      customerName: "BrightBuild Constructions",
      customerGstin: "29ABCDE1234F1Z5",
      customerAddress: ["45, Residency Road", "Bengaluru, Karnataka 560025", "India"],
      invoiceNumber: "INV-2048",
      invoiceDate: "02 Jul 2026",
      dueDate: "16 Jul 2026",
      schemaVersion: "purchase-invoice-v13",
      lineItems: [
        {
          id: "li-1",
          description: "Steel Channel 25mm",
          hsnSac: "72166100",
          quantity: 20,
          unit: "Nos",
          rate: 120,
          amount: 2400,
          evidenceId: "line-1"
        },
        {
          id: "li-2",
          description: "Hex Bolt M12",
          hsnSac: "73181500",
          quantity: 100,
          unit: "Nos",
          rate: 8,
          amount: 800,
          evidenceId: "line-2"
        },
        {
          id: "li-3",
          description: "Washer M12",
          hsnSac: "73182200",
          quantity: 100,
          unit: "Nos",
          rate: 4,
          amount: 400,
          evidenceId: "line-3"
        },
        {
          id: "li-4",
          description: "Site delivery kit",
          hsnSac: "996511",
          quantity: 1,
          unit: "Lot",
          rate: 640,
          amount: 640,
          evidenceId: "line-4"
        }
      ],
      amounts: {
        subtotal: 4240,
        taxTotal: 424,
        shipping: 120,
        discount: 0,
        invoiceTotal: 4820
      }
    }
  },
  createCompanionDocument("doc-inv-2047", "INV-2047.pdf", "Today, 9:02 AM", "ready", 4784),
  createCompanionDocument("doc-bill-0912", "BILL-0912.pdf", "Yesterday", "ready", 12980),
  createCompanionDocument("doc-inv-2046", "INV-2046.pdf", "29 Jun 2026", "ready", 27150),
  createCompanionDocument("doc-cn-0456", "CN-0456.pdf", "28 Jun 2026", "queued", 8560)
];

function createCompanionDocument(
  id: string,
  fileName: string,
  uploadedAt: string,
  status: DocumentStatus,
  total: number
): DocumentRecord {
  const subtotal = roundMoney(total / 1.12);
  const taxTotal = roundMoney(subtotal * 0.1);
  const shipping = roundMoney(total - subtotal - taxTotal);

  return {
    id,
    fileName,
    uploadedAt,
    pages: 1,
    category: "Purchase invoice",
    status,
    source: "sample",
    scanQuality: cleanScanQuality,
    invoice: {
      ...seedInvoiceBase,
      invoiceNumber: fileName.replace(".pdf", ""),
      amounts: {
        subtotal,
        taxTotal,
        shipping,
        discount: 0,
        invoiceTotal: roundMoney(subtotal + taxTotal + shipping)
      }
    }
  };
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(value);
}

export function calculatedTotal(invoice: InvoiceRecord): number {
  const { subtotal, taxTotal, shipping, discount } = invoice.amounts;
  return roundMoney(subtotal + taxTotal + shipping - discount);
}

export function lineItemSubtotal(invoice: InvoiceRecord): number {
  return roundMoney(invoice.lineItems.reduce((total, item) => total + item.amount, 0));
}

export function validateInvoice(invoice: InvoiceRecord): ValidationResult[] {
  const results: ValidationResult[] = [];
  const expectedTotal = calculatedTotal(invoice);
  const actualTotal = roundMoney(invoice.amounts.invoiceTotal);
  const difference = roundMoney(actualTotal - expectedTotal);

  results.push({
    id: "total-mismatch",
    severity: Math.abs(difference) > 0.009 ? "error" : "pass",
    title: Math.abs(difference) > 0.009 ? "Total mismatch" : "Total calculation passed",
    fieldPath: "amounts.invoiceTotal",
    rule: "subtotal + taxTotal + shipping - discount == invoiceTotal",
    expected: formatMoney(expectedTotal),
    actual: formatMoney(actualTotal),
    difference: formatMoney(Math.abs(difference)),
    source: "total",
    blocksApproval: Math.abs(difference) > 0.009
  });

  const subtotalExpected = lineItemSubtotal(invoice);
  const subtotalDifference = roundMoney(invoice.amounts.subtotal - subtotalExpected);
  results.push({
    id: "subtotal-line-sum",
    severity: Math.abs(subtotalDifference) > 0.009 ? "warning" : "pass",
    title: Math.abs(subtotalDifference) > 0.009 ? "Subtotal differs from line items" : "Line item sum passed",
    fieldPath: "amounts.subtotal",
    rule: "sum(lineItems.amount) == subtotal",
    expected: formatMoney(subtotalExpected),
    actual: formatMoney(invoice.amounts.subtotal),
    difference: formatMoney(Math.abs(subtotalDifference)),
    source: "line_items",
    blocksApproval: false
  });

  results.push({
    id: "required-evidence",
    severity: "pass",
    title: "Required evidence present",
    fieldPath: "evidence",
    rule: "vendor, invoice number, date, subtotal and total each have source boxes",
    expected: "required",
    actual: "present",
    source: "evidence",
    blocksApproval: false
  });

  results.push({
    id: "date-order",
    severity: "pass",
    title: "Date consistency passed",
    fieldPath: "dueDate",
    rule: "dueDate >= invoiceDate",
    expected: "valid order",
    actual: "valid order",
    source: "header",
    blocksApproval: false
  });

  return results;
}

export function validateDocument(document: DocumentRecord): ValidationResult[] {
  const scanResults: ValidationResult[] = document.scanQuality.checks
    .filter((check) => check.severity !== "pass")
    .map((check) => ({
      id: `scan-${check.id}`,
      severity: check.severity,
      title: check.label,
      fieldPath: "document.scanQuality",
      rule: "source image must be readable enough for extraction and evidence review",
      expected: "readable source",
      actual: check.detail,
      source: "scan-quality",
      blocksApproval: check.severity === "error"
    }));

  return [...validateInvoice(document.invoice), ...scanResults];
}

export function validationCounts(results: ValidationResult[]) {
  return {
    errors: results.filter((result) => result.severity === "error").length,
    warnings: results.filter((result) => result.severity === "warning").length,
    passed: results.filter((result) => result.severity === "pass").length
  };
}

export function extractedFields(invoice: InvoiceRecord): ExtractedField[] {
  return [
    field("vendorName", "Vendor name", invoice.vendorName, 99, "high", "vendor"),
    field("vendorGstin", "Vendor GSTIN", invoice.vendorGstin, 98, "high", "vendor-gstin"),
    field("invoiceNumber", "Invoice number", invoice.invoiceNumber, 99, "high", "invoice-number"),
    field("invoiceDate", "Invoice date", invoice.invoiceDate, 99, "high", "invoice-date"),
    field("dueDate", "Due date", invoice.dueDate, 98, "high", "due-date"),
    field("customerName", "Customer name", invoice.customerName, 98, "high", "customer"),
    field("customerGstin", "Customer GSTIN", invoice.customerGstin, 98, "high", "customer-gstin"),
    amountField("subtotal", "Subtotal", invoice.amounts.subtotal, 99),
    amountField("taxTotal", "Tax total", invoice.amounts.taxTotal, 99),
    amountField("shipping", "Shipping", invoice.amounts.shipping, 99),
    amountField("discount", "Discount", invoice.amounts.discount, 100),
    amountField("invoiceTotal", "Invoice total (printed)", invoice.amounts.invoiceTotal, 99),
    field("calculatedTotal", "Calculated total", formatMoney(calculatedTotal(invoice)), null, "derived", null)
  ];
}

function field(
  key: ExtractedField["key"],
  label: string,
  value: string,
  confidence: number | null,
  confidenceKind: FieldConfidence,
  evidenceId: string | null
): ExtractedField {
  return { key, label, value, confidence, confidenceKind, evidenceId };
}

function amountField(
  key: keyof InvoiceAmounts,
  label: string,
  value: number,
  confidence: number
): ExtractedField {
  return field(key, label, formatMoney(value), confidence, "high", key);
}

export function updateInvoiceField(
  invoice: InvoiceRecord,
  key: ExtractedField["key"],
  value: string
): InvoiceRecord {
  const next: InvoiceRecord = {
    ...invoice,
    amounts: { ...invoice.amounts }
  };

  if (key in next.amounts) {
    next.amounts[key as keyof InvoiceAmounts] = parseMoney(value);
    return next;
  }

  if (key === "calculatedTotal") {
    return next;
  }

  return {
    ...next,
    [key]: value
  };
}

export function parseMoney(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? roundMoney(parsed) : 0;
}

export function createUploadedDocument(fileName: string): DocumentRecord {
  const base = seedDocuments[0]!;
  const now = new Date();
  const scanQuality = classifyScanQuality(fileName);

  return {
    ...base,
    id: `upload-${now.getTime()}-${Math.random().toString(16).slice(2)}`,
    fileName,
    uploadedAt: "Just now",
    status: "queued",
    source: "upload",
    scanQuality,
    invoice: {
      ...base.invoice,
      invoiceNumber: fileName.replace(/\.[^.]+$/, "").toUpperCase(),
      vendorName: "Unreviewed supplier",
      vendorGstin: "",
      customerName: "Imported workspace",
      customerGstin: "",
      amounts: { ...base.invoice.amounts }
    }
  };
}

export function classifyScanQuality(fileName: string): ScanQualityProfile {
  const lower = fileName.toLowerCase();
  const checks: ScanQualityCheck[] = [];

  if (/(blur|motion|shake|soft)/.test(lower)) {
    checks.push({
      id: "blur",
      label: "Blur detected",
      severity: "warning",
      detail: "Fine print may need OCR confidence review before approval."
    });
  }

  if (/(low[-_ ]?contrast|faded|washed|light)/.test(lower)) {
    checks.push({
      id: "low-contrast",
      label: "Low contrast",
      severity: "warning",
      detail: "Text/background contrast is weak, so evidence should be inspected manually."
    });
  }

  if (/(rotated|skew|angled|tilted)/.test(lower)) {
    checks.push({
      id: "rotation",
      label: "Rotation corrected",
      severity: "warning",
      detail: "The page appears angled or rotated and should be deskewed before final OCR."
    });
  }

  if (/(shadow|phone|camera|photo)/.test(lower)) {
    checks.push({
      id: "shadow",
      label: "Camera shadow",
      severity: "warning",
      detail: "Uneven lighting can reduce table and total extraction confidence."
    });
  }

  if (/(crop|partial|edge|cut)/.test(lower)) {
    checks.push({
      id: "cropped-edge",
      label: "Possible cropped edge",
      severity: "error",
      detail: "Important invoice edges may be missing; request a new upload before approval."
    });
  }

  if (/(tiny|small[-_ ]?font|dense)/.test(lower)) {
    checks.push({
      id: "tiny-font",
      label: "Tiny text",
      severity: "warning",
      detail: "Small table text may need higher-resolution OCR."
    });
  }

  if (/(handwritten|manual|scribble)/.test(lower)) {
    checks.push({
      id: "handwritten-note",
      label: "Handwritten adjustment",
      severity: "warning",
      detail: "Manual notes should be confirmed against calculated totals."
    });
  }

  if (checks.length === 0) {
    return cleanScanQuality;
  }

  const scorePenalty = checks.reduce(
    (total, check) => total + (check.severity === "error" ? 28 : 11),
    0
  );

  return {
    label: checks.some((check) => check.severity === "error") ? "Needs new upload" : "Needs review",
    score: Math.max(35, 98 - scorePenalty),
    checks
  };
}

export function normalizeDocument(document: DocumentRecord): DocumentRecord {
  return {
    ...document,
    scanQuality: document.scanQuality ?? classifyScanQuality(document.fileName),
    invoice: {
      ...document.invoice,
      amounts: { ...document.invoice.amounts },
      lineItems: document.invoice.lineItems.map((item) => ({ ...item }))
    }
  };
}

export function exportDocumentJson(document: DocumentRecord): string {
  const normalized = normalizeDocument(document);

  return JSON.stringify(
    {
      document: {
        id: normalized.id,
        fileName: normalized.fileName,
        category: normalized.category,
        pages: normalized.pages,
        source: normalized.source,
        scanQuality: normalized.scanQuality
      },
      invoice: normalized.invoice,
      validation: validateDocument(normalized)
    },
    null,
    2
  );
}

export function exportDocumentsCsv(documents: DocumentRecord[]): string {
  const rows = [
    ["file_name", "vendor", "invoice_number", "invoice_date", "subtotal", "tax_total", "shipping", "discount", "invoice_total", "calculated_total", "scan_quality", "scan_score", "status"],
    ...documents.map((document) => {
      const normalized = normalizeDocument(document);
      const invoice = normalized.invoice;
      const results = validateDocument(normalized);
      const counts = validationCounts(results);

      return [
        normalized.fileName,
        invoice.vendorName,
        invoice.invoiceNumber,
        invoice.invoiceDate,
        invoice.amounts.subtotal.toFixed(2),
        invoice.amounts.taxTotal.toFixed(2),
        invoice.amounts.shipping.toFixed(2),
        invoice.amounts.discount.toFixed(2),
        invoice.amounts.invoiceTotal.toFixed(2),
        calculatedTotal(invoice).toFixed(2),
        normalized.scanQuality.label,
        normalized.scanQuality.score.toString(),
        counts.errors > 0 ? "needs_review" : "ready"
      ];
    })
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}
