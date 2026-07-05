export type WorkspaceMode = "local" | "sync" | "hosted";

export type DocumentStatus = "queued" | "processing" | "needs_review" | "ready";

export type FieldConfidence = "high" | "medium" | "check" | "derived";

export type ScanQualitySeverity = "pass" | "warning" | "error";

export type DocumentCategory =
  | "Purchase invoice"
  | "Sales invoice"
  | "Receipt"
  | "Credit note"
  | "Statement"
  | "Other document";

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
  category: DocumentCategory;
  status: DocumentStatus;
  source: "sample" | "upload" | "import";
  mimeType?: string;
  processingMessage?: string;
  sourcePreview?: DocumentSourcePreview;
  ocr?: OcrProfile;
  evidenceRegions?: EvidenceRegion[];
  corrections?: FieldCorrection[];
  scanQuality: ScanQualityProfile;
  invoice: InvoiceRecord;
}

export interface FieldCorrection {
  id: string;
  fieldKey: ExtractedField["key"];
  label: string;
  previousValue: string;
  nextValue: string;
  correctedAt: string;
}

export interface DocumentSourcePreview {
  kind: "image" | "pdf" | "text" | "unavailable";
  image?: string;
  text?: string;
  width?: number;
  height?: number;
  page?: number;
  mimeType?: string;
  note?: string;
}

export interface OcrProfile {
  engine: string;
  status: "pending" | "processing" | "complete" | "failed";
  text: string;
  confidence: number | null;
  processedAt?: string;
  elapsedMs?: number;
  error?: string;
}

export interface EvidenceRegion {
  id: string;
  fieldKey: ExtractedField["key"];
  label: string;
  text: string;
  confidence: number | null;
  page: number;
  bbox?: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
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

export interface ExportReadiness {
  canExportCsv: boolean;
  blockedDocuments: DocumentRecord[];
}

export const documentCategories: DocumentCategory[] = [
  "Purchase invoice",
  "Sales invoice",
  "Receipt",
  "Credit note",
  "Statement",
  "Other document"
];

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
    evidenceRegions: [
      sampleEvidence("vendorName", "Vendor name", "ACME SUPPLIES PVT. LTD.", 98),
      sampleEvidence("invoiceNumber", "Invoice number", "INV-2048", 99),
      sampleEvidence("invoiceDate", "Invoice date", "02 Jul 2026", 99),
      sampleEvidence("invoiceTotal", "Invoice total", "4,820.00", 99)
    ],
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
    evidenceRegions: [
      sampleEvidence("vendorName", "Vendor name", seedInvoiceBase.vendorName, 98),
      sampleEvidence("invoiceNumber", "Invoice number", fileName.replace(".pdf", ""), 99),
      sampleEvidence("invoiceDate", "Invoice date", seedInvoiceBase.invoiceDate, 99),
      sampleEvidence("invoiceTotal", "Invoice total", total.toFixed(2), 99)
    ],
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

function sampleEvidence(
  fieldKey: ExtractedField["key"],
  label: string,
  text: string,
  confidence: number
): EvidenceRegion {
  return {
    id: `sample-${String(fieldKey)}`,
    fieldKey,
    label,
    text,
    confidence,
    page: 1
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
  const requiredFields = [
    ["vendorName", "vendor name", invoice.vendorName],
    ["invoiceNumber", "invoice number", invoice.invoiceNumber],
    ["invoiceDate", "invoice date", invoice.invoiceDate],
    ["amounts.invoiceTotal", "invoice total", invoice.amounts.invoiceTotal > 0 ? invoice.amounts.invoiceTotal.toString() : ""]
  ] as const;
  const missingFields = requiredFields.filter(([, , value]) => value.trim().length === 0);
  const expectedTotal = calculatedTotal(invoice);
  const actualTotal = roundMoney(invoice.amounts.invoiceTotal);
  const difference = roundMoney(actualTotal - expectedTotal);

  results.push({
    id: "required-fields",
    severity: missingFields.length > 0 ? "error" : "pass",
    title: missingFields.length > 0 ? "Required fields missing" : "Required fields present",
    fieldPath: "invoice",
    rule: "vendor, invoice number, invoice date, and invoice total are required",
    expected: "complete required fields",
    actual: missingFields.length > 0 ? missingFields.map(([, label]) => label).join(", ") : "complete",
    source: "schema",
    blocksApproval: missingFields.length > 0
  });

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
  const requiredEvidence: EvidenceRegion["fieldKey"][] = ["vendorName", "invoiceNumber", "invoiceDate", "invoiceTotal"];
  const evidenceKeys = new Set((document.evidenceRegions ?? []).map((region) => region.fieldKey));
  const missingEvidence = requiredEvidence.filter((key) => !evidenceKeys.has(key));
  const evidenceResult: ValidationResult = {
    id: "required-evidence",
    severity: missingEvidence.length > 0 ? "error" : "pass",
    title: missingEvidence.length > 0 ? "Required source evidence missing" : "Required evidence present",
    fieldPath: "evidence",
    rule: "vendor, invoice number, date, and total each need source evidence",
    expected: "source-linked fields",
    actual: missingEvidence.length > 0 ? missingEvidence.join(", ") : "present",
    source: "evidence",
    blocksApproval: missingEvidence.length > 0
  };
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

  return [...validateInvoice(document.invoice), evidenceResult, ...scanResults];
}

export function validationCounts(results: ValidationResult[]) {
  return {
    errors: results.filter((result) => result.severity === "error").length,
    warnings: results.filter((result) => result.severity === "warning").length,
    passed: results.filter((result) => result.severity === "pass").length
  };
}

export function extractedFields(source: InvoiceRecord | DocumentRecord): ExtractedField[] {
  const invoice = "invoice" in source ? source.invoice : source;
  const evidence = "invoice" in source ? source.evidenceRegions ?? [] : [];
  const fieldConfidence = (key: ExtractedField["key"], fallback: number) => {
    const match = evidence.find((region) => region.fieldKey === key);

    if (match?.confidence == null) {
      return fallback;
    }

    return Math.max(1, Math.min(99, Math.round(match.confidence)));
  };
  const fieldKind = (key: ExtractedField["key"], fallback: FieldConfidence = "high"): FieldConfidence => {
    const confidence = fieldConfidence(key, 0);

    if (confidence >= 85) {
      return fallback;
    }

    if (confidence >= 65) {
      return "medium";
    }

    return "check";
  };

  return [
    field("vendorName", "Vendor name", invoice.vendorName, fieldConfidence("vendorName", invoice.vendorName ? 72 : 0), fieldKind("vendorName"), "vendorName"),
    field("vendorGstin", "Vendor GSTIN", invoice.vendorGstin, fieldConfidence("vendorGstin", invoice.vendorGstin ? 72 : 0), fieldKind("vendorGstin"), "vendorGstin"),
    field("invoiceNumber", "Invoice number", invoice.invoiceNumber, fieldConfidence("invoiceNumber", invoice.invoiceNumber ? 72 : 0), fieldKind("invoiceNumber"), "invoiceNumber"),
    field("invoiceDate", "Invoice date", invoice.invoiceDate, fieldConfidence("invoiceDate", invoice.invoiceDate ? 72 : 0), fieldKind("invoiceDate"), "invoiceDate"),
    field("dueDate", "Due date", invoice.dueDate, fieldConfidence("dueDate", invoice.dueDate ? 68 : 0), fieldKind("dueDate"), "dueDate"),
    field("customerName", "Customer name", invoice.customerName, fieldConfidence("customerName", invoice.customerName ? 68 : 0), fieldKind("customerName"), "customerName"),
    field("customerGstin", "Customer GSTIN", invoice.customerGstin, fieldConfidence("customerGstin", invoice.customerGstin ? 68 : 0), fieldKind("customerGstin"), "customerGstin"),
    amountField("subtotal", "Subtotal", invoice.amounts.subtotal, fieldConfidence("subtotal", invoice.amounts.subtotal > 0 ? 72 : 0), fieldKind("subtotal")),
    amountField("taxTotal", "Tax total", invoice.amounts.taxTotal, fieldConfidence("taxTotal", invoice.amounts.taxTotal > 0 ? 70 : 0), fieldKind("taxTotal")),
    amountField("shipping", "Shipping", invoice.amounts.shipping, fieldConfidence("shipping", evidence.some((region) => region.fieldKey === "shipping") ? 70 : 0), fieldKind("shipping")),
    amountField("discount", "Discount", invoice.amounts.discount, fieldConfidence("discount", evidence.some((region) => region.fieldKey === "discount") ? 70 : 0), fieldKind("discount")),
    amountField("invoiceTotal", "Invoice total (printed)", invoice.amounts.invoiceTotal, fieldConfidence("invoiceTotal", invoice.amounts.invoiceTotal > 0 ? 72 : 0), fieldKind("invoiceTotal")),
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
  confidence: number,
  confidenceKind: FieldConfidence = "high"
): ExtractedField {
  return field(key, label, formatMoney(value), confidence, confidenceKind, key);
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

export function classifyDocumentCategory(fileName: string, text = ""): DocumentCategory {
  const haystack = `${fileName}\n${text}`.toLowerCase();

  if (/\b(credit\s*note|credit memo|cn[-_\s]?\d+)/.test(haystack)) {
    return "Credit note";
  }

  if (/\b(statement|ledger|account\s+summary|bank\s+statement)\b/.test(haystack)) {
    return "Statement";
  }

  if (/\b(receipt|payment received|cash memo|paid)\b/.test(haystack) && !/\binvoice\b/.test(haystack)) {
    return "Receipt";
  }

  if (/\b(sales\s+invoice|tax\s+invoice|invoice)\b/.test(haystack)) {
    return /from\s+us|our\s+invoice|sales\s+invoice/.test(haystack) ? "Sales invoice" : "Purchase invoice";
  }

  return "Other document";
}

export function createUploadedDocument(
  fileName: string,
  options: { mimeType?: string; pages?: number } = {}
): DocumentRecord {
  const now = new Date();
  const scanQuality = classifyScanQuality(fileName);

  return {
    id: `upload-${now.getTime()}-${Math.random().toString(16).slice(2)}`,
    fileName,
    uploadedAt: "Just now",
    pages: options.pages ?? 1,
    category: classifyDocumentCategory(fileName),
    status: "queued",
    source: "upload",
    mimeType: options.mimeType,
    processingMessage: "Waiting for local OCR",
    ocr: {
      engine: "local",
      status: "pending",
      text: "",
      confidence: null
    },
    scanQuality,
    invoice: createEmptyInvoice(fileName)
  };
}

export function createEmptyInvoice(fileName: string): InvoiceRecord {
  return {
    vendorName: "",
    vendorGstin: "",
    vendorAddress: [],
    customerName: "",
    customerGstin: "",
    customerAddress: [],
    invoiceNumber: "",
    invoiceDate: "",
    dueDate: "",
    schemaVersion: "purchase-invoice-v13",
    lineItems: [],
    amounts: {
      subtotal: 0,
      taxTotal: 0,
      shipping: 0,
      discount: 0,
      invoiceTotal: 0
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
  const invoice = document.invoice ?? createEmptyInvoice(document.fileName);
  const category = documentCategories.includes(document.category)
    ? document.category
    : classifyDocumentCategory(document.fileName, document.ocr?.text ?? "");

  return {
    ...document,
    category,
    scanQuality: document.scanQuality ?? classifyScanQuality(document.fileName),
    evidenceRegions: (document.evidenceRegions ?? []).map((region) => ({ ...region, bbox: region.bbox ? { ...region.bbox } : undefined })),
    corrections: (document.corrections ?? []).map((correction) => ({ ...correction })),
    ocr: document.ocr ? { ...document.ocr } : undefined,
    sourcePreview: document.sourcePreview ? { ...document.sourcePreview } : undefined,
    invoice: {
      ...invoice,
      amounts: { ...invoice.amounts },
      vendorAddress: [...(invoice.vendorAddress ?? [])],
      customerAddress: [...(invoice.customerAddress ?? [])],
      lineItems: (invoice.lineItems ?? []).map((item) => ({ ...item }))
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
        mimeType: normalized.mimeType,
        scanQuality: normalized.scanQuality
      },
      invoice: normalized.invoice,
      ocr: normalized.ocr,
      evidence: normalized.evidenceRegions ?? [],
      corrections: normalized.corrections ?? [],
      validation: validateDocument(normalized)
    },
    null,
    2
  );
}

export function exportDocumentsCsv(documents: DocumentRecord[]): string {
  const rows = [
    ["file_name", "category", "vendor", "invoice_number", "invoice_date", "subtotal", "tax_total", "shipping", "discount", "invoice_total", "calculated_total", "scan_quality", "scan_score", "status"],
    ...documents.map((document) => {
      const normalized = normalizeDocument(document);
      const invoice = normalized.invoice;
      const results = validateDocument(normalized);
      const counts = validationCounts(results);

      return [
        normalized.fileName,
        normalized.category,
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

export function exportReadiness(documents: DocumentRecord[]): ExportReadiness {
  const blockedDocuments = documents
    .map(normalizeDocument)
    .filter((document) => validationCounts(validateDocument(document)).errors > 0);

  return {
    canExportCsv: blockedDocuments.length === 0,
    blockedDocuments
  };
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}
