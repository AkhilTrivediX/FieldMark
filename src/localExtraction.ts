import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import Tesseract from "tesseract.js";
import {
  type DocumentRecord,
  type DocumentSourcePreview,
  type EvidenceRegion,
  type ExtractedField,
  type InvoiceRecord,
  type LineItem,
  type ScanQualityCheck,
  type ScanQualityProfile,
  classifyDocumentCategory,
  classifyScanQuality,
  createEmptyInvoice,
  roundMoney,
  validateDocument,
  validationCounts
} from "./domain.js";

export interface ExtractionProgress {
  stage: string;
  progress: number;
}

interface PreparedSource {
  canvas?: HTMLCanvasElement;
  embeddedText: string;
  pages: number;
  preview: DocumentSourcePreview;
}

interface OcrBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface OcrLine {
  text: string;
  confidence: number | null;
  bbox?: OcrBox;
}

interface ParsedInvoice {
  invoice: InvoiceRecord;
  evidenceRegions: EvidenceRegion[];
}

const invoiceNumberPattern =
  /(?:invoice|inv|bill|voucher)\s*(?:no|number|num|#)?\.?\s*[:#-]?\s*([A-Z0-9][A-Z0-9/._-]{2,})/i;
const datePattern =
  /(?:\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4})/;
const gstinPattern = /\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b/g;
const moneyPattern = /(?:rs\.?|inr|₹)?\s*[-+]?(?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d{1,2})?/gi;

export async function extractDocumentFromFile(
  file: File,
  baseDocument: DocumentRecord,
  onProgress: (progress: ExtractionProgress) => void
): Promise<DocumentRecord> {
  const startedAt = performance.now();
  onProgress({ stage: "Preparing local file", progress: 4 });

  const prepared = await prepareSource(file, onProgress);
  let ocrText = "";
  let ocrConfidence: number | null = null;
  let ocrLines: OcrLine[] = [];

  if (prepared.canvas) {
    onProgress({ stage: "Loading local OCR model", progress: 18 });
    const ocr = await runOcr(prepared.canvas, (progress) => {
      onProgress({
        stage: progress.stage,
        progress: Math.min(92, 18 + progress.progress * 0.74)
      });
    });
    ocrText = ocr.text;
    ocrConfidence = ocr.confidence;
    ocrLines = ocr.lines;
  }

  const combinedText = joinText(prepared.embeddedText, ocrText);
  onProgress({ stage: "Mapping fields and checking totals", progress: 94 });

  const parsed = parseInvoiceText(combinedText, file.name, ocrLines);
  const scanQuality = scoreScanQuality(file.name, combinedText, ocrConfidence);
  const elapsedMs = Math.round(performance.now() - startedAt);
  const document: DocumentRecord = {
    ...baseDocument,
    pages: prepared.pages,
    category: classifyDocumentCategory(file.name, combinedText),
    status: "needs_review",
    mimeType: file.type,
    processingMessage: `Processed locally in ${(elapsedMs / 1000).toFixed(1)}s`,
    sourcePreview: prepared.preview,
    scanQuality,
    ocr: {
      engine: prepared.canvas ? "Tesseract.js local eng" : "Text import",
      status: "complete",
      text: combinedText,
      confidence: ocrConfidence,
      processedAt: new Date().toISOString(),
      elapsedMs
    },
    evidenceRegions: parsed.evidenceRegions,
    invoice: parsed.invoice
  };
  const counts = validationCounts(validateDocument(document));

  onProgress({ stage: "Ready for review", progress: 100 });

  return {
    ...document,
    status: counts.errors > 0 || counts.warnings > 0 ? "needs_review" : "ready"
  };
}

export function parseInvoiceText(text: string, fileName: string, ocrLines: OcrLine[] = []): ParsedInvoice {
  const cleanText = normalizeWhitespace(text);
  const textLines = cleanText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const lines = mergeOcrLines(textLines, ocrLines);
  const gstins = Array.from(new Set((cleanText.toUpperCase().match(gstinPattern) ?? []).map((item) => item.trim())));
  const invoiceNumber = findInvoiceNumber(lines) ?? "";
  const invoiceDate = findDateByLabel(lines, [/invoice\s*date/i, /bill\s*date/i, /date\s*of\s*invoice/i]) ?? "";
  const dueDate = findDateByLabel(lines, [/due\s*date/i, /payment\s*due/i]) ?? "";
  const vendorName = findVendorName(lines);
  const customerName = findCustomerName(lines);
  const subtotal = findMoneyByLabel(lines, [/sub\s*total/i, /subtotal/i, /taxable\s*value/i, /taxable\s*amount/i]) ?? 0;
  const taxTotal =
    findMoneyByLabel(lines, [/tax\s*total/i, /total\s*tax/i, /gst\s*total/i]) ?? findTaxTotal(lines);
  const shipping = findMoneyByLabel(lines, [/shipping/i, /freight/i, /delivery/i, /courier/i]) ?? 0;
  const discount = findMoneyByLabel(lines, [/discount/i, /rebate/i]) ?? 0;
  const invoiceTotal =
    findMoneyByLabel(lines, [/grand\s*total/i, /invoice\s*total/i, /amount\s*due/i, /total\s*amount/i, /balance\s*due/i, /net\s*payable/i]) ??
    findBottomTotal(lines) ??
    0;
  const effectiveSubtotal = subtotal || roundMoney(Math.max(0, invoiceTotal - taxTotal - shipping + discount));
  const lineItems = findLineItems(lines, effectiveSubtotal);
  const invoice: InvoiceRecord = {
    ...createEmptyInvoice(fileName),
    vendorName,
    vendorGstin: gstins[0] ?? "",
    vendorAddress: findAddressAfter(lines, vendorName),
    customerName,
    customerGstin: gstins[1] ?? "",
    customerAddress: findAddressAfter(lines, customerName),
    invoiceNumber,
    invoiceDate,
    dueDate,
    lineItems,
    amounts: {
      subtotal: effectiveSubtotal,
      taxTotal,
      shipping,
      discount,
      invoiceTotal
    }
  };

  return {
    invoice,
    evidenceRegions: buildEvidenceRegions(invoice, lines)
  };
}

async function prepareSource(
  file: File,
  onProgress: (progress: ExtractionProgress) => void
): Promise<PreparedSource> {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    return preparePdf(file, onProgress);
  }

  if (file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp|tiff?)$/i.test(file.name)) {
    return prepareImage(file);
  }

  const text = await file.text();

  return {
    embeddedText: text,
    pages: 1,
    preview: {
      kind: "text",
      text,
      mimeType: file.type || "text/plain"
    }
  };
}

async function preparePdf(
  file: File,
  onProgress: (progress: ExtractionProgress) => void
): Promise<PreparedSource> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  let embeddedText = "";

  try {
    const textContent = await page.getTextContent();
    embeddedText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter(Boolean)
      .join("\n");
  } catch {
    embeddedText = "";
  }

  onProgress({ stage: "Rendering first PDF page locally", progress: 12 });

  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(2.5, Math.max(1.35, 1800 / baseViewport.width));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: false });

  if (!context) {
    throw new Error("Canvas rendering is not available in this browser.");
  }

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport } as never).promise;

  const ocrCanvas = normalizeCanvas(canvas);

  return {
    canvas: ocrCanvas,
    embeddedText,
    pages: pdf.numPages,
    preview: {
      kind: "pdf",
      image: ocrCanvas.toDataURL("image/jpeg", 0.92),
      width: ocrCanvas.width,
      height: ocrCanvas.height,
      page: 1,
      mimeType: file.type || "application/pdf"
    }
  };
}

async function prepareImage(file: File): Promise<PreparedSource> {
  const bitmap = await createImageBitmap(file);
  const maxLongEdge = 2200;
  const scale = Math.min(1, maxLongEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: false });

  if (!context) {
    throw new Error("Canvas rendering is not available in this browser.");
  }

  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const ocrCanvas = normalizeCanvas(canvas);

  return {
    canvas: ocrCanvas,
    embeddedText: "",
    pages: 1,
    preview: {
      kind: "image",
      image: ocrCanvas.toDataURL("image/jpeg", 0.92),
      width: ocrCanvas.width,
      height: ocrCanvas.height,
      page: 1,
      mimeType: file.type
    }
  };
}

async function runOcr(
  canvas: HTMLCanvasElement,
  onProgress: (progress: ExtractionProgress) => void
): Promise<{ text: string; confidence: number | null; lines: OcrLine[] }> {
  const worker = await Tesseract.createWorker("eng", 1, {
    gzip: true,
    langPath: "/tessdata",
    logger: (message) => {
      if (message.status) {
        onProgress({
          stage: sentenceCase(message.status),
          progress: Math.round((message.progress ?? 0) * 100)
        });
      }
    }
  });

  try {
    await worker.setParameters({
      preserve_interword_spaces: "1",
      tessedit_pageseg_mode: Tesseract.PSM.AUTO
    });
    const result = await worker.recognize(canvas, {}, { text: true, blocks: true });
    const data = result.data;

    return {
      text: data.text ?? "",
      confidence: typeof data.confidence === "number" ? data.confidence : null,
      lines: flattenOcrLines(data.blocks)
    };
  } finally {
    await worker.terminate();
  }
}

function normalizeCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: false });

  if (!context) {
    return source;
  }

  canvas.width = source.width;
  canvas.height = source.height;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0);

  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;

  for (let index = 0; index < data.length; index += 4) {
    const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.18 + 128));
    data[index] = contrasted;
    data[index + 1] = contrasted;
    data[index + 2] = contrasted;
    data[index + 3] = 255;
  }

  context.putImageData(image, 0, 0);

  return canvas;
}

function parseMoneyValue(value: string): number {
  const cleaned = value.replace(/(?:rs\.?|inr|₹)/gi, "").replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(cleaned);

  return Number.isFinite(parsed) ? roundMoney(parsed) : 0;
}

function moneyValues(line: string): number[] {
  return Array.from(line.matchAll(moneyPattern))
    .map((match) => parseMoneyValue(match[0]))
    .filter((value) => Number.isFinite(value) && Math.abs(value) > 0);
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[|]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mergeOcrLines(textLines: string[], ocrLines: OcrLine[]): OcrLine[] {
  if (ocrLines.length > 0) {
    return ocrLines
      .map((line) => ({ ...line, text: line.text.trim() }))
      .filter((line) => line.text.length > 0);
  }

  return textLines.map((line) => ({ text: line, confidence: null }));
}

function findInvoiceNumber(lines: OcrLine[]): string | null {
  for (const line of lines.slice(0, 40)) {
    const match = line.text.match(invoiceNumberPattern);

    if (match?.[1] && /\d/.test(match[1]) && !/date|total/i.test(match[1])) {
      return tidyValue(match[1]);
    }
  }

  return null;
}

function findDateByLabel(lines: OcrLine[], labels: RegExp[]): string | null {
  for (const line of lines.slice(0, 60)) {
    if (!labels.some((label) => label.test(line.text))) {
      continue;
    }

    const match = line.text.match(datePattern);

    if (match?.[0]) {
      return tidyValue(match[0]);
    }
  }

  return null;
}

function findVendorName(lines: OcrLine[]): string {
  const earlyLines = lines.slice(0, 12);
  const invoiceTitleIndex = earlyLines.findIndex((line) => /\b(tax\s+)?invoice\b/i.test(line.text));
  const candidates = (invoiceTitleIndex > 0 ? earlyLines.slice(0, invoiceTitleIndex) : earlyLines).filter(
    (line) => isLikelyNameLine(line.text)
  );

  return tidyValue(candidates[0]?.text ?? "");
}

function findCustomerName(lines: OcrLine[]): string {
  const start = lines.findIndex((line) => /\b(bill\s*to|billed\s*to|customer|buyer|ship\s*to)\b/i.test(line.text));

  if (start < 0) {
    return "";
  }

  for (const line of lines.slice(start + 1, start + 8)) {
    if (isLikelyNameLine(line.text)) {
      return tidyValue(line.text);
    }
  }

  return "";
}

function isLikelyNameLine(text: string): boolean {
  const cleaned = text.trim();

  return (
    cleaned.length >= 3 &&
    cleaned.length <= 80 &&
    !/[₹$]|\d{1,2}[./-]\d{1,2}|^\d+$/.test(cleaned) &&
    !/\b(invoice|tax invoice|gstin|pan|phone|mobile|email|address|date|total|subtotal|qty|rate|amount|original|copy)\b/i.test(cleaned)
  );
}

function findAddressAfter(lines: OcrLine[], anchor: string): string[] {
  if (!anchor) {
    return [];
  }

  const start = lines.findIndex((line) => line.text.trim() === anchor || line.text.includes(anchor));

  if (start < 0) {
    return [];
  }

  return lines
    .slice(start + 1, start + 4)
    .map((line) => line.text.trim())
    .filter((line) => line.length > 0 && !/gstin|invoice|date|bill\s*to|customer/i.test(line));
}

function findMoneyByLabel(lines: OcrLine[], labels: RegExp[]): number | null {
  for (const line of [...lines].reverse()) {
    if (!labels.some((label) => label.test(line.text))) {
      continue;
    }

    const values = moneyValues(line.text);

    if (values.length > 0) {
      return values[values.length - 1]!;
    }
  }

  return null;
}

function findTaxTotal(lines: OcrLine[]): number {
  const taxLines = lines.filter((line) => /\b(cgst|sgst|igst|gst|tax)\b/i.test(line.text) && !/taxable/i.test(line.text));
  const componentLines = taxLines.filter((line) => /\b(cgst|sgst|igst)\b/i.test(line.text));

  if (componentLines.length > 0) {
    return roundMoney(
      componentLines.reduce((total, line) => {
        const values = moneyValues(line.text);

        return total + (values[values.length - 1] ?? 0);
      }, 0)
    );
  }

  return findMoneyByLabel(taxLines, [/\btax\b/i, /\bgst\b/i]) ?? 0;
}

function findBottomTotal(lines: OcrLine[]): number | null {
  for (const line of [...lines].reverse().slice(0, 24)) {
    if (!/\btotal\b/i.test(line.text) || /sub\s*total|subtotal|tax\s*total/i.test(line.text)) {
      continue;
    }

    const values = moneyValues(line.text);

    if (values.length > 0) {
      return values[values.length - 1]!;
    }
  }

  return null;
}

function findLineItems(lines: OcrLine[], subtotal: number): LineItem[] {
  const headerIndex = lines.findIndex((line) => /\b(description|particulars|item|qty|quantity|rate|amount)\b/i.test(line.text));
  const tableLines = headerIndex >= 0 ? lines.slice(headerIndex + 1, headerIndex + 18) : lines;
  const items = tableLines
    .filter((line) => !/\b(subtotal|sub\s*total|tax|total|discount|shipping|freight|terms)\b/i.test(line.text))
    .map((line, index) => {
      const values = moneyValues(line.text);

      if (values.length === 0) {
        return null;
      }

      const amount = values[values.length - 1]!;
      const rate = values.length > 1 ? values[values.length - 2]! : amount;
      const quantity = values.length > 2 ? values[values.length - 3]! : 1;
      const description = tidyValue(
        line.text
          .replace(moneyPattern, " ")
          .replace(/^\s*\d+\s*/, "")
          .replace(/\s{2,}/g, " ")
      );

      if (!description || amount <= 0) {
        return null;
      }

      return {
        id: `li-${index + 1}`,
        description,
        hsnSac: "",
        quantity,
        unit: "",
        rate,
        amount,
        evidenceId: `line-${index + 1}`
      } satisfies LineItem;
    })
    .filter((item): item is LineItem => item != null)
    .slice(0, 12);

  if (items.length > 0) {
    return items;
  }

  if (subtotal > 0) {
    return [
      {
        id: "li-1",
        description: "Extracted invoice line items",
        hsnSac: "",
        quantity: 1,
        unit: "",
        rate: subtotal,
        amount: subtotal,
        evidenceId: "subtotal"
      }
    ];
  }

  return [];
}

function buildEvidenceRegions(invoice: InvoiceRecord, lines: OcrLine[]): EvidenceRegion[] {
  const fields: Array<[ExtractedField["key"], string, string, RegExp[]]> = [
    ["vendorName", "Vendor name", invoice.vendorName, []],
    ["vendorGstin", "Vendor GSTIN", invoice.vendorGstin, [/gstin/i]],
    ["invoiceNumber", "Invoice number", invoice.invoiceNumber, [/invoice|inv|bill/i]],
    ["invoiceDate", "Invoice date", invoice.invoiceDate, [/invoice\s*date|bill\s*date|date/i]],
    ["dueDate", "Due date", invoice.dueDate, [/due\s*date|payment\s*due/i]],
    ["customerName", "Customer name", invoice.customerName, [/bill\s*to|customer|buyer/i]],
    ["customerGstin", "Customer GSTIN", invoice.customerGstin, [/gstin/i]],
    ["subtotal", "Subtotal", invoice.amounts.subtotal > 0 ? invoice.amounts.subtotal.toFixed(2) : "", [/sub\s*total|subtotal|taxable/i]],
    ["taxTotal", "Tax total", invoice.amounts.taxTotal > 0 ? invoice.amounts.taxTotal.toFixed(2) : "", [/tax|gst|cgst|sgst|igst/i]],
    ["shipping", "Shipping", invoice.amounts.shipping > 0 ? invoice.amounts.shipping.toFixed(2) : "", [/shipping|freight|delivery/i]],
    ["discount", "Discount", invoice.amounts.discount > 0 ? invoice.amounts.discount.toFixed(2) : "", [/discount|rebate/i]],
    ["invoiceTotal", "Invoice total", invoice.amounts.invoiceTotal > 0 ? invoice.amounts.invoiceTotal.toFixed(2) : "", [/grand\s*total|invoice\s*total|amount\s*due|total\s*amount|balance\s*due|total/i]]
  ];

  return fields.flatMap(([fieldKey, label, value, labels]) => {
    if (!value) {
      return [];
    }

    const line = findEvidenceLine(lines, value, labels);

    return [
      {
        id: `ev-${String(fieldKey)}`,
        fieldKey,
        label,
        text: line?.text ?? value,
        confidence: line?.confidence ?? null,
        page: 1,
        bbox: line?.bbox
      }
    ];
  });
}

function findEvidenceLine(lines: OcrLine[], value: string, labels: RegExp[]): OcrLine | undefined {
  const normalizedValue = normalizeForCompare(value);
  const moneyValue = parseMoneyValue(value);
  const labelled = lines.find((line) => labels.some((label) => label.test(line.text)) && evidenceLineHasValue(line.text, normalizedValue, moneyValue));

  if (labelled) {
    return labelled;
  }

  return lines.find((line) => evidenceLineHasValue(line.text, normalizedValue, moneyValue));
}

function evidenceLineHasValue(text: string, normalizedValue: string, moneyValue: number): boolean {
  const normalizedText = normalizeForCompare(text);

  if (normalizedValue && normalizedText.includes(normalizedValue)) {
    return true;
  }

  if (moneyValue > 0) {
    return moneyValues(text).some((value) => Math.abs(value - moneyValue) < 0.01);
  }

  return false;
}

function scoreScanQuality(fileName: string, text: string, confidence: number | null): ScanQualityProfile {
  const base = classifyScanQuality(fileName);
  const checks: ScanQualityCheck[] = [...base.checks];

  if (text.trim().length < 20) {
    checks.push({
      id: "ocr-empty",
      label: "No readable text",
      severity: "error",
      detail: "Local OCR could not read enough text from this document."
    });
  } else if (confidence != null && confidence < 55) {
    checks.push({
      id: "ocr-low-confidence",
      label: "Low OCR confidence",
      severity: "error",
      detail: `Average OCR confidence is ${Math.round(confidence)}%. Upload a clearer scan before approval.`
    });
  } else if (confidence != null && confidence < 75) {
    checks.push({
      id: "ocr-review",
      label: "OCR needs review",
      severity: "warning",
      detail: `Average OCR confidence is ${Math.round(confidence)}%. Confirm key fields against the source.`
    });
  }

  if (checks.length === 0) {
    checks.push({
      id: "ocr-readable",
      label: "Readable OCR text",
      severity: "pass",
      detail: "Local OCR produced enough text for field mapping and validation."
    });
  }

  const confidenceScore = confidence == null ? 88 : Math.round(confidence);
  const penalty = checks.reduce((total, check) => total + (check.severity === "error" ? 30 : check.severity === "warning" ? 10 : 0), 0);

  return {
    label: checks.some((check) => check.severity === "error") ? "Needs new upload" : checks.some((check) => check.severity === "warning") ? "Needs review" : "Clean scan",
    score: Math.max(20, Math.min(base.score, confidenceScore) - penalty),
    checks
  };
}

function flattenOcrLines(blocks: unknown): OcrLine[] {
  if (!Array.isArray(blocks)) {
    return [];
  }

  return blocks.flatMap((block) => {
    const paragraphs = asRecord(block).paragraphs;

    if (!Array.isArray(paragraphs)) {
      return [];
    }

    return paragraphs.flatMap((paragraph) => {
      const lines = asRecord(paragraph).lines;

      if (!Array.isArray(lines)) {
        return [];
      }

      return lines.map((line) => {
        const record = asRecord(line);
        const bbox = asBox(record.bbox);

        return {
          text: typeof record.text === "string" ? record.text : "",
          confidence: typeof record.confidence === "number" ? record.confidence : null,
          bbox
        };
      });
    });
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asBox(value: unknown): OcrBox | undefined {
  const box = asRecord(value);
  const x0 = Number(box.x0);
  const y0 = Number(box.y0);
  const x1 = Number(box.x1);
  const y1 = Number(box.y1);

  if ([x0, y0, x1, y1].every(Number.isFinite)) {
    return { x0, y0, x1, y1 };
  }

  return undefined;
}

function joinText(...parts: string[]): string {
  return parts.map((part) => part.trim()).filter(Boolean).join("\n");
}

function tidyValue(value: string): string {
  return value.replace(/^[#:.\-\s]+/, "").replace(/[#:.\-\s]+$/, "").replace(/\s{2,}/g, " ").trim();
}

function normalizeForCompare(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9.]+/g, "");
}

function sentenceCase(value: string): string {
  const cleaned = value.replace(/[_-]/g, " ").trim();

  return cleaned ? `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}` : "Processing";
}
