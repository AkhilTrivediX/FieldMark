import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Database,
  Download,
  FileJson,
  FileText,
  FolderOpen,
  HelpCircle,
  Image,
  Maximize,
  Plus,
  RefreshCw,
  ScanLine,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Table2,
  Upload,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type DocumentRecord,
  type ExtractedField,
  type ValidationResult,
  type WorkspaceMode,
  calculatedTotal,
  createUploadedDocument,
  exportDocumentJson,
  exportDocumentsCsv,
  exportPresets,
  exportReadiness,
  extractedFields,
  formatMoney,
  normalizeDocument,
  schemaFields,
  validateDocument,
  updateInvoiceField,
  validationCounts
} from "./domain.js";
import { createFixtureDocument, fixtureSuiteSummary, runFixtureSuite } from "./fixtureDocuments.js";
import { type GeneratedFixture } from "./generatedFixtures.js";
import { extractDocumentFromFile } from "./localExtraction.js";

type MainTab = "vault" | "schemas" | "validation" | "exports" | "lab";

const storageKey = "fieldmark.workspace.v1";

export function App() {
  const [activeTab, setActiveTab] = useState<MainTab>("vault");
  const [mode, setMode] = useState<WorkspaceMode>("local");
  const [documents, setDocuments] = useState<DocumentRecord[]>(() => readDocuments());
  const [selectedId, setSelectedId] = useState<string | null>(() => readDocuments()[0]?.id ?? null);
  const uploadFiles = useRef(new Map<string, File>());
  const fileInput = useRef<HTMLInputElement>(null);

  const selectedDocument = documents.find((document) => document.id === selectedId) ?? documents[0] ?? null;
  const selectedValidation = useMemo(
    () => (selectedDocument ? validateDocument(selectedDocument) : []),
    [selectedDocument]
  );

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(documents.map((document) => prepareDocumentForStorage(document))));
    } catch {
      localStorage.setItem(storageKey, JSON.stringify(documents.map((document) => prepareDocumentForStorage(document, true))));
    }
  }, [documents]);

  useEffect(() => {
    if (selectedDocument || documents.length === 0) {
      return;
    }

    setSelectedId(documents[0]!.id);
  }, [documents, selectedDocument]);

  function selectDocument(id: string) {
    setSelectedId(id);
    setActiveTab("vault");
  }

  function updateSelectedField(field: ExtractedField, value: string) {
    if (!selectedDocument) {
      return;
    }

    setDocuments((current) =>
      current.map((document) => {
        if (document.id !== selectedDocument.id) {
          return document;
        }

        const invoice = updateInvoiceField(document.invoice, field.key, value);
        const counts = validationCounts(validateDocument({ ...document, invoice }));

        return {
          ...document,
          invoice,
          status: counts.errors > 0 ? "needs_review" : "ready"
        };
      })
    );
  }

  function applyExpectedTotal() {
    if (!selectedDocument) {
      return;
    }

    const expected = calculatedTotal(selectedDocument.invoice).toFixed(2);
    const field = extractedFields(selectedDocument).find((item) => item.key === "invoiceTotal");

    if (field) {
      updateSelectedField(field, expected);
    }
  }

  function markReviewed() {
    if (!selectedDocument) {
      return;
    }

    const counts = validationCounts(selectedValidation);

    setDocuments((current) =>
      current.map((document) =>
        document.id === selectedDocument.id
          ? { ...document, status: counts.errors > 0 ? "needs_review" : "ready" }
          : document
      )
    );
  }

  async function processQueuedDocument(id: string) {
    const file = uploadFiles.current.get(id);

    if (!file) {
      setDocuments((current) =>
        current.map((document) =>
          document.id === id
            ? {
                ...document,
                status: "needs_review",
                processingMessage: "Original file is not attached in this browser session. Upload it again to run OCR.",
                ocr: {
                  engine: document.ocr?.engine ?? "local",
                  status: "failed",
                  text: document.ocr?.text ?? "",
                  confidence: document.ocr?.confidence ?? null,
                  error: "Original file missing from session memory."
                }
              }
            : document
        )
      );
      return;
    }

    const baseDocument = documents.find((document) => document.id === id);
    await runExtraction(id, file, baseDocument);
  }

  async function runExtraction(id: string, file: File, baseOverride?: DocumentRecord) {
    setDocuments((current) =>
      current.map((document) =>
        document.id === id
          ? {
              ...document,
              status: "processing",
              processingMessage: "Preparing local OCR",
              ocr: {
                engine: "Tesseract.js local eng",
                status: "processing",
                text: document.ocr?.text ?? "",
                confidence: document.ocr?.confidence ?? null
              }
            }
          : document
      )
    );

    const baseDocument = baseOverride ?? documents.find((document) => document.id === id) ?? createUploadedDocument(file.name, { mimeType: file.type });

    try {
      const extracted = await extractDocumentFromFile(file, baseDocument, (progress) => {
        setDocuments((current) =>
          current.map((document) =>
            document.id === id
              ? {
                  ...document,
                  status: "processing",
                  processingMessage: `${progress.stage} (${Math.round(progress.progress)}%)`
                }
              : document
          )
        );
      });

      setDocuments((current) => current.map((document) => (document.id === id ? extracted : document)));
    } catch (error) {
      const message = error instanceof Error ? error.message : "OCR failed.";
      setDocuments((current) =>
        current.map((document) =>
          document.id === id
            ? {
                ...document,
                status: "needs_review",
                processingMessage: message,
                ocr: {
                  engine: "Tesseract.js local eng",
                  status: "failed",
                  text: document.ocr?.text ?? "",
                  confidence: document.ocr?.confidence ?? null,
                  error: message
                }
              }
            : document
        )
      );
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    const fileArray = Array.from(files);
    const incoming = fileArray.map((file) => createUploadedDocument(file.name, { mimeType: file.type }));

    incoming.forEach((document, index) => {
      uploadFiles.current.set(document.id, fileArray[index]!);
    });

    setDocuments((current) => [...incoming, ...current]);
    setSelectedId(incoming[0]!.id);
    setActiveTab("vault");

    incoming.forEach((document, index) => {
      void runExtraction(document.id, fileArray[index]!, document);
    });

    if (fileInput.current) {
      fileInput.current.value = "";
    }
  }

  function loadFixture(fixture: GeneratedFixture) {
    const document = createFixtureDocument(fixture);
    setDocuments((current) => [document, ...current.filter((item) => item.id !== document.id)]);
    setSelectedId(document.id);
    setActiveTab("vault");
  }

  function downloadSelectedJson() {
    if (!selectedDocument) {
      return;
    }

    downloadText(
      `${selectedDocument.fileName.replace(/\.[^.]+$/, "")}.fieldmark.json`,
      exportDocumentJson(selectedDocument),
      "application/json"
    );
  }

  function downloadCsv() {
    if (documents.length === 0) {
      return;
    }

    downloadText("fieldmark-export.csv", exportDocumentsCsv(documents), "text/csv");
  }

  return (
    <div className="fieldmark-app">
      <input
        ref={fileInput}
        className="hidden-input"
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.json,.csv"
        onChange={(event) => handleFiles(event.target.files)}
      />

      <Topbar activeTab={activeTab} mode={mode} onModeChange={setMode} onTabChange={setActiveTab} />

      {activeTab === "vault" ? (
        <VaultWorkspace
          documents={documents}
          selectedDocument={selectedDocument}
          validation={selectedValidation}
          onApplyExpectedTotal={applyExpectedTotal}
          onDownloadJson={downloadSelectedJson}
          onMarkReviewed={markReviewed}
          onProcessQueued={processQueuedDocument}
          onRefreshExtraction={processQueuedDocument}
          onSelectDocument={selectDocument}
          onUpdateField={updateSelectedField}
          onUpload={() => fileInput.current?.click()}
        />
      ) : (
        <ProductWorkspace
          activeTab={activeTab}
          documents={documents}
          mode={mode}
          selectedDocument={selectedDocument}
          validation={selectedValidation}
          onDownloadCsv={downloadCsv}
          onDownloadJson={downloadSelectedJson}
          onLoadFixture={loadFixture}
          onModeChange={setMode}
          onSelectDocument={selectDocument}
          onTabChange={setActiveTab}
          onUpload={() => fileInput.current?.click()}
        />
      )}
    </div>
  );
}

interface TopbarProps {
  activeTab: MainTab;
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
  onTabChange: (tab: MainTab) => void;
}

function Topbar({ activeTab, mode, onModeChange, onTabChange }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <img className="brand-mark" src="/brand/fieldmark-mark.svg" alt="" />
        <span>FieldMark</span>
      </div>

      <nav className="top-nav" aria-label="Main">
        {[
          ["vault", "Local vault"],
          ["schemas", "Schemas"],
          ["validation", "Validation"],
          ["exports", "Exports"],
          ["lab", "Test lab"]
        ].map(([id, label]) => (
          <button
            key={id}
            className={activeTab === id ? "active" : ""}
            onClick={() => onTabChange(id as MainTab)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="top-actions">
        <ModeSwitch mode={mode} onModeChange={onModeChange} />
        <button className="icon-button" aria-label="Open local folder">
          <FolderOpen />
        </button>
        <button className="icon-button" aria-label="Settings">
          <Settings />
        </button>
        <button className="icon-button" aria-label="Help">
          <HelpCircle />
        </button>
      </div>
    </header>
  );
}

function ModeSwitch({
  mode,
  onModeChange
}: {
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
}) {
  return (
    <div className="mode-switch" aria-label="Privacy mode">
      {(["local", "sync", "hosted"] as WorkspaceMode[]).map((item) => (
        <button
          key={item}
          className={mode === item ? "selected" : ""}
          onClick={() => onModeChange(item)}
          title={modeLabel(item)}
        >
          {item === "local" ? "Local" : item === "sync" ? "Sync" : "Hosted"}
        </button>
      ))}
    </div>
  );
}

function modeLabel(mode: WorkspaceMode) {
  if (mode === "local") {
    return "Documents stay on this device.";
  }

  if (mode === "sync") {
    return "Encrypted sync is allowed.";
  }

  return "Hosted processing can be used as a fallback.";
}

interface VaultWorkspaceProps {
  documents: DocumentRecord[];
  selectedDocument: DocumentRecord | null;
  validation: ValidationResult[];
  onApplyExpectedTotal: () => void;
  onDownloadJson: () => void;
  onMarkReviewed: () => void;
  onProcessQueued: (id: string) => void;
  onRefreshExtraction: (id: string) => void;
  onSelectDocument: (id: string) => void;
  onUpdateField: (field: ExtractedField, value: string) => void;
  onUpload: () => void;
}

function VaultWorkspace({
  documents,
  selectedDocument,
  validation,
  onApplyExpectedTotal,
  onDownloadJson,
  onMarkReviewed,
  onProcessQueued,
  onRefreshExtraction,
  onSelectDocument,
  onUpdateField,
  onUpload
}: VaultWorkspaceProps) {
  return (
    <main className="workspace vault-workspace">
      <DocumentQueue
        documents={documents}
        selectedId={selectedDocument?.id ?? null}
        onProcessQueued={onProcessQueued}
        onSelectDocument={onSelectDocument}
        onUpload={onUpload}
      />

      <section className="viewer" aria-label="Document viewer">
        {selectedDocument ? (
          <>
            <ViewerToolbar
              fileName={selectedDocument.fileName}
              onDownloadJson={onDownloadJson}
              onRefreshExtraction={() => onRefreshExtraction(selectedDocument.id)}
            />
            <div className="viewer-canvas">
              <DocumentSourceView document={selectedDocument} />
            </div>
            <ViewerFooter />
          </>
        ) : (
          <EmptyViewer onUpload={onUpload} />
        )}
      </section>

      {selectedDocument ? (
        <FieldRail
          document={selectedDocument}
          validation={validation}
          onApplyExpectedTotal={onApplyExpectedTotal}
          onMarkReviewed={onMarkReviewed}
          onUpdateField={onUpdateField}
        />
      ) : (
        <EmptyFieldRail onUpload={onUpload} />
      )}
    </main>
  );
}

function DocumentQueue({
  documents,
  selectedId,
  onProcessQueued,
  onSelectDocument,
  onUpload
}: {
  documents: DocumentRecord[];
  selectedId: string | null;
  onProcessQueued: (id: string) => void;
  onSelectDocument: (id: string) => void;
  onUpload: () => void;
}) {
  return (
    <aside className="documents" aria-label="Document list">
      <div className="documents-head">
        <h2>Documents</h2>
        <button className="add-button" aria-label="Add document" onClick={onUpload}>
          <Plus size={16} />
        </button>
      </div>

      <button className="filter-button">
        <span>All documents</span>
        <ChevronDown size={14} />
      </button>

      <div className="doc-list">
        {documents.length === 0 ? (
          <div className="doc-empty">
            <FileText size={18} />
            <span>No documents yet</span>
            <button onClick={onUpload}>Upload invoice</button>
          </div>
        ) : null}
        {documents.map((document) => (
          <button
            key={document.id}
            className={`doc-card ${document.id === selectedId ? "active" : ""}`}
            onClick={() => onSelectDocument(document.id)}
          >
            <DocumentThumb />
            <span className="doc-title">
              <strong>{document.fileName}</strong>
              <small>
                {document.processingMessage ?? document.uploadedAt}
                {document.status === "needs_review" ? <span className="doc-dot" /> : null}
              </small>
              <StatusBadge status={document.status} />
              {document.status === "queued" ? (
                <span
                  className="queue-action"
                  onClick={(event) => {
                    event.stopPropagation();
                    onProcessQueued(document.id);
                  }}
                >
                  Run OCR
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </div>

      <div className="doc-count">{documents.length} documents</div>
    </aside>
  );
}

function DocumentThumb() {
  return (
    <span className="thumb" aria-hidden="true">
      <span className="thumb-line short" />
      <span className="thumb-line" />
      <span className="thumb-table">
        {Array.from({ length: 9 }).map((_, index) => (
          <span key={index} />
        ))}
      </span>
      <span className="thumb-line" />
    </span>
  );
}

function StatusBadge({ status }: { status: DocumentRecord["status"] }) {
  const label = {
    queued: "queued",
    processing: "processing",
    needs_review: "review",
    ready: "ready"
  }[status];

  return <span className={`status-badge ${status}`}>{label}</span>;
}

function ViewerToolbar({
  fileName,
  onDownloadJson,
  onRefreshExtraction
}: {
  fileName: string;
  onDownloadJson: () => void;
  onRefreshExtraction: () => void;
}) {
  return (
    <div className="filebar">
      <h1>{fileName}</h1>
      <div className="pdf-tools" aria-label="PDF tools">
        <span className="tool-chip">1</span>
        <span className="tool-text">/ 1</span>
        <span className="tool-separator" />
        <span className="tool-text">-</span>
        <span className="tool-text">100%</span>
        <span className="tool-text">+</span>
        <span className="tool-separator" />
        <button className="icon-button" aria-label="Open text view">
          <FileText />
        </button>
        <button className="icon-button" aria-label="Download JSON" onClick={onDownloadJson}>
          <Download />
        </button>
        <button className="icon-button" aria-label="Full screen">
          <Maximize />
        </button>
        <button className="icon-button" aria-label="Refresh extraction" onClick={onRefreshExtraction}>
          <RefreshCw />
        </button>
      </div>
      <div />
    </div>
  );
}

function EmptyViewer({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="empty-viewer">
      <div className="empty-mark">
        <Upload size={28} />
      </div>
      <h1>Upload an invoice to start extraction</h1>
      <p>FieldMark keeps the file in this browser session, runs local OCR, maps fields to JSON, and checks totals before export.</p>
      <button onClick={onUpload}>
        <Upload size={16} />
        Choose PDF or image
      </button>
    </div>
  );
}

function DocumentSourceView({ document }: { document: DocumentRecord }) {
  const preview = document.sourcePreview;

  if (preview?.image) {
    return (
      <article className="source-page" aria-label="Uploaded document source">
        {document.status === "processing" ? (
          <div className="source-processing">
            <RefreshCw size={16} />
            <span>{document.processingMessage ?? "Running local OCR"}</span>
          </div>
        ) : null}
        <img src={preview.image} alt={`${document.fileName} source`} />
        <EvidenceOverlay document={document} />
      </article>
    );
  }

  if (preview?.kind === "text") {
    return (
      <article className="source-page text-source" aria-label="Imported text source">
        <pre>{preview.text}</pre>
      </article>
    );
  }

  if (document.source !== "sample") {
    return (
      <article className="source-page unavailable-source" aria-label="Source unavailable">
        <FileText size={34} />
        <h2>Source file is not attached</h2>
        <p>{document.processingMessage ?? "Upload this file again to run local OCR and show source evidence."}</p>
      </article>
    );
  }

  return <InvoicePage document={document} />;
}

function EvidenceOverlay({ document }: { document: DocumentRecord }) {
  const preview = document.sourcePreview;

  if (!preview?.width || !preview.height || !document.evidenceRegions?.length) {
    return null;
  }

  return (
    <div className="evidence-overlay" aria-hidden="true">
      {document.evidenceRegions
        .filter((region) => region.bbox)
        .map((region) => {
          const box = region.bbox!;
          const left = (box.x0 / preview.width!) * 100;
          const top = (box.y0 / preview.height!) * 100;
          const width = ((box.x1 - box.x0) / preview.width!) * 100;
          const height = ((box.y1 - box.y0) / preview.height!) * 100;

          return (
            <span
              className="source-evidence"
              key={region.id}
              title={`${region.label}: ${region.text}`}
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${width}%`,
                height: `${height}%`
              }}
            />
          );
        })}
    </div>
  );
}

function InvoicePage({ document }: { document: DocumentRecord }) {
  const { invoice } = document;

  return (
    <article className="invoice-page" aria-label="Invoice page">
      <div className="invoice-top">
        <section className="vendor-block">
          <h3>{invoice.vendorName}</h3>
          {invoice.vendorAddress.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p>
            <span className="evidence">GSTIN: {invoice.vendorGstin || "unread"}</span>
          </p>
        </section>

        <section>
          <div className="invoice-title">TAX INVOICE</div>
          <div className="date-grid">
            <span>Invoice No.</span>
            <span className="evidence">{invoice.invoiceNumber}</span>
            <span>Invoice Date</span>
            <span className="evidence">{invoice.invoiceDate}</span>
            <span>Due Date</span>
            <span className="evidence">{invoice.dueDate}</span>
          </div>
        </section>
      </div>

      <section className="bill-block">
        <h3>Bill To</h3>
        <p>
          <strong>{invoice.customerName}</strong>
        </p>
        {invoice.customerAddress.map((line) => (
          <p key={line}>{line}</p>
        ))}
        <p>
          <span className="evidence">GSTIN: {invoice.customerGstin || "unread"}</span>
        </p>
      </section>

      <table className="invoice-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Description</th>
            <th>HSN/SAC</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lineItems.map((item, index) => (
            <tr key={item.id}>
              <td>{index + 1}</td>
              <td>{item.description}</td>
              <td>{item.hsnSac}</td>
              <td>{item.quantity}</td>
              <td>{item.unit}</td>
              <td>{formatMoney(item.rate)}</td>
              <td>
                <span className="evidence">{formatMoney(item.amount)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="totals">
        <div className="totals-left">
          <b>Amount in words</b>
          <p>
            <span className="evidence">Four Thousand Eight Hundred Twenty Only</span>
          </p>
        </div>
        <div className="totals-grid">
          <span>Subtotal</span>
          <span className="evidence">{formatMoney(invoice.amounts.subtotal)}</span>
          <span>CGST (5%)</span>
          <span className="evidence">{formatMoney(invoice.amounts.taxTotal / 2)}</span>
          <span>SGST (5%)</span>
          <span className="evidence">{formatMoney(invoice.amounts.taxTotal / 2)}</span>
          <span>Shipping</span>
          <span className="evidence">{formatMoney(invoice.amounts.shipping)}</span>
          <span>Discount</span>
          <span className="evidence">{formatMoney(invoice.amounts.discount)}</span>
          <span className="grand">Total</span>
          <span className="grand danger-evidence">{formatMoney(invoice.amounts.invoiceTotal)}</span>
        </div>
      </section>

      <section className="terms">
        <div>
          <h3>Terms &amp; Conditions</h3>
          <ol>
            <li>Goods once sold will not be taken back.</li>
            <li>Interest @ 18% p.a. will be charged on overdue payments.</li>
          </ol>
        </div>
        <div className="signature">
          <p>For {invoice.vendorName}</p>
          <div className="signature-line" />
          <p>Authorized Signatory</p>
        </div>
      </section>
    </article>
  );
}

function ViewerFooter() {
  return (
    <footer className="viewer-footer">
      <div className="viewer-dock">
        <div className="floating-tools">
          <button className="icon-button selected" aria-label="Pan document">
            <ScanLine />
          </button>
          <button className="icon-button" aria-label="Select evidence">
            <SlidersHorizontal />
          </button>
          <button className="icon-button" aria-label="Zoom out">
            <ZoomOut />
          </button>
          <button className="icon-button" aria-label="Zoom in">
            <ZoomIn />
          </button>
          <button className="icon-button" aria-label="Fit to page">
            <Maximize />
          </button>
        </div>

        <div className="viewer-mode">
          <span>Evidence</span>
          <span className="toggle" aria-hidden="true" />
          <button className="compare">Compare</button>
        </div>
      </div>
    </footer>
  );
}

function EmptyFieldRail({ onUpload }: { onUpload: () => void }) {
  return (
    <aside className="fields empty-fields" aria-label="Extracted fields">
      <div className="fields-head">
        <h2>Extracted fields</h2>
      </div>
      <div className="empty-fields-body">
        <ScanLine size={24} />
        <strong>No extraction yet</strong>
        <p>Upload a PDF or image and local OCR will fill this rail with source-linked fields.</p>
        <button onClick={onUpload}>
          <Upload size={16} />
          Upload document
        </button>
      </div>
    </aside>
  );
}

function FieldRail({
  document,
  validation,
  onApplyExpectedTotal,
  onMarkReviewed,
  onUpdateField
}: {
  document: DocumentRecord;
  validation: ValidationResult[];
  onApplyExpectedTotal: () => void;
  onMarkReviewed: () => void;
  onUpdateField: (field: ExtractedField, value: string) => void;
}) {
  const fields = extractedFields(document);
  const counts = validationCounts(validation);
  const blockingIssue = validation.find((result) => result.severity === "error");

  return (
    <aside className="fields" aria-label="Extracted fields">
      <div className="fields-head">
        <h2>Extracted fields</h2>
        <div className="fields-actions">
          <button className="icon-button" aria-label="Filter fields">
            <SlidersHorizontal />
          </button>
          <button className="icon-button" aria-label="View JSON">
            <Code2 />
          </button>
        </div>
      </div>

      <div className="field-list">
        {fields.map((field) => (
          <label className="field-row" key={field.label}>
            <span className="label">{field.label}</span>
            <input
              aria-label={field.label}
              className="field-input"
              readOnly={field.key === "calculatedTotal"}
              value={field.value}
              onChange={(event) => onUpdateField(field, event.target.value)}
            />
            <span className={`confidence ${field.confidenceKind}`}>
              {field.confidence == null ? "-" : `${field.confidence}%`}
            </span>
            <ChevronRight className="chevron" size={16} />
          </label>
        ))}

        <section className="validation" aria-label="Validation">
          <ScanQualityPanel document={document} />

          <div className="validation-top">
            <strong>Validation</strong>
            <span className="pill error">{counts.errors} Error</span>
            <span className="pill warn">{counts.warnings} Warnings</span>
            <span className="pill pass">{counts.passed} Passed</span>
          </div>

          {blockingIssue ? (
            <div className="error-card">
              <div className="error-title">
                <AlertCircle size={18} />
                <span>{blockingIssue.title}</span>
              </div>
              <div className="rule-grid">
                <span>Rule</span>
                <code>{blockingIssue.rule}</code>
                <span>Expected</span>
                <b>{blockingIssue.expected}</b>
                <span>Actual</span>
                <b>{blockingIssue.actual}</b>
                <span>Difference</span>
                <b className="difference">{blockingIssue.difference}</b>
              </div>
              <button className="inline-fix" onClick={onApplyExpectedTotal}>
                Apply expected total
              </button>
            </div>
          ) : (
            <div className="pass-card">
              <ShieldCheck size={18} />
              <div>
                <strong>Ready for approval</strong>
                <p>Math, dates, schema requirements, and evidence checks pass.</p>
              </div>
            </div>
          )}

          <div className="review-actions">
            <button onClick={onMarkReviewed}>
              <Check size={16} />
              Mark as reviewed
            </button>
            <button aria-label="Review menu">
              <ChevronDown size={16} />
            </button>
          </div>
        </section>
      </div>
    </aside>
  );
}

function ScanQualityPanel({ document }: { document: DocumentRecord }) {
  return (
    <section className="scan-quality" aria-label="Scan quality">
      <div className="scan-quality-head">
        <strong>Scan quality</strong>
        <span>{document.scanQuality.score}%</span>
      </div>
      <p>{document.scanQuality.label}</p>
      <div className="scan-checks">
        {document.scanQuality.checks.map((check) => (
          <span className={`scan-check ${check.severity}`} key={check.id} title={check.detail}>
            {check.label}
          </span>
        ))}
      </div>
    </section>
  );
}

interface ProductWorkspaceProps {
  activeTab: Exclude<MainTab, "vault">;
  documents: DocumentRecord[];
  mode: WorkspaceMode;
  selectedDocument: DocumentRecord | null;
  validation: ValidationResult[];
  onDownloadCsv: () => void;
  onDownloadJson: () => void;
  onLoadFixture: (fixture: GeneratedFixture) => void;
  onModeChange: (mode: WorkspaceMode) => void;
  onSelectDocument: (id: string) => void;
  onTabChange: (tab: MainTab) => void;
  onUpload: () => void;
}

function ProductWorkspace(props: ProductWorkspaceProps) {
  return (
    <main className="product-workspace">
      {props.activeTab === "schemas" ? <SchemaPage /> : null}
      {props.activeTab === "validation" ? (
        <ValidationPage
          documents={props.documents}
          selectedDocument={props.selectedDocument}
          onSelectDocument={props.onSelectDocument}
          onTabChange={props.onTabChange}
        />
      ) : null}
      {props.activeTab === "exports" ? (
        <ExportsPage
          documents={props.documents}
          mode={props.mode}
          selectedDocument={props.selectedDocument}
          validation={props.validation}
          onDownloadCsv={props.onDownloadCsv}
          onDownloadJson={props.onDownloadJson}
          onModeChange={props.onModeChange}
          onUpload={props.onUpload}
        />
      ) : null}
      {props.activeTab === "lab" ? (
        <TestLabPage onLoadFixture={props.onLoadFixture} onTabChange={props.onTabChange} />
      ) : null}
    </main>
  );
}

function SchemaPage() {
  return (
    <section className="product-panel schema-page">
      <div className="page-heading">
        <div>
          <h1>Purchase invoice schema</h1>
          <p>Versioned fields, aliases, evidence requirements, and export mapping.</p>
        </div>
        <div className="heading-actions">
          <button className="secondary">
            <ScanLine size={16} />
            Test 24 docs
          </button>
          <button>
            <Check size={16} />
            Publish v13
          </button>
        </div>
      </div>

      <div className="schema-grid">
        {schemaFields.map((field) => (
          <article className="schema-card" key={field.path}>
            <div>
              <strong>{field.label}</strong>
              <code>{field.path}</code>
            </div>
            <p>{field.aliases.join(", ")}</p>
            <div className="schema-meta">
              <span>{field.kind}</span>
              {field.required ? <span>required</span> : null}
              {field.evidenceRequired ? <span>evidence required</span> : null}
            </div>
          </article>
        ))}
      </div>

      <section className="suggestion-band">
        <div>
          <strong>Schema suggestion</strong>
          <p>`freight_charge` has appeared in 21 corrections and should be promoted from an alias to a mapped field.</p>
        </div>
        <button className="secondary">Review suggestion</button>
      </section>
    </section>
  );
}

function ValidationPage({
  documents,
  selectedDocument,
  onSelectDocument,
  onTabChange
}: {
  documents: DocumentRecord[];
  selectedDocument: DocumentRecord | null;
  onSelectDocument: (id: string) => void;
  onTabChange: (tab: MainTab) => void;
}) {
  return (
    <section className="product-panel validation-page">
      <div className="page-heading">
        <div>
          <h1>Validation ledger</h1>
          <p>The model extracts. Code decides whether the record is clean.</p>
        </div>
        <button onClick={() => onTabChange("vault")}>
          <FileText size={16} />
          Open review bench
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="empty-product-state">
          <FileText size={28} />
          <strong>No documents to validate</strong>
          <p>Upload an invoice first, then this ledger will show every extraction and math rule.</p>
        </div>
      ) : (
      <div className="ledger-layout">
        <div className="ledger-list">
          {documents.map((document) => {
            const counts = validationCounts(validateDocument(document));

            return (
              <button
                key={document.id}
                className={document.id === selectedDocument?.id ? "selected" : ""}
                onClick={() => onSelectDocument(document.id)}
              >
                <span>{document.fileName}</span>
                <strong>{counts.errors > 0 ? "blocks approval" : "ready"}</strong>
              </button>
            );
          })}
        </div>

        <table className="ledger-table">
          <thead>
            <tr>
              <th>Rule</th>
              <th>Expected</th>
              <th>Actual</th>
              <th>Source</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(selectedDocument ? validateDocument(selectedDocument) : []).map((result) => (
              <tr key={result.id} className={result.severity}>
                <td>{result.rule}</td>
                <td>{result.expected}</td>
                <td>{result.actual}</td>
                <td>{result.source}</td>
                <td>{result.severity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </section>
  );
}

function ExportsPage({
  documents,
  mode,
  selectedDocument,
  validation,
  onDownloadCsv,
  onDownloadJson,
  onModeChange,
  onUpload
}: {
  documents: DocumentRecord[];
  mode: WorkspaceMode;
  selectedDocument: DocumentRecord | null;
  validation: ValidationResult[];
  onDownloadCsv: () => void;
  onDownloadJson: () => void;
  onModeChange: (mode: WorkspaceMode) => void;
  onUpload: () => void;
}) {
  const counts = validationCounts(validation);
  const { blockedDocuments, canExportCsv } = exportReadiness(documents);

  return (
    <section className="product-panel exports-page">
      <div className="page-heading">
        <div>
          <h1>Exports and local vault</h1>
          <p>Approved JSON, CSV, and future accounting syncs start from the same evidence-linked record.</p>
        </div>
        <div className="heading-actions">
          <button className="secondary" onClick={onUpload}>
            <Upload size={16} />
            Import docs
          </button>
          <button
            disabled={!canExportCsv || documents.length === 0}
            onClick={onDownloadCsv}
            title={
              documents.length === 0
                ? "Upload documents before exporting CSV."
                : canExportCsv
                  ? "Export reviewed records as CSV."
                  : "Resolve blocking validation errors before CSV export."
            }
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="export-grid">
        <section className="export-card mode-card">
          <Database size={20} />
          <div>
            <strong>Privacy mode</strong>
            <p>{modeLabel(mode)}</p>
          </div>
          <ModeSwitch mode={mode} onModeChange={onModeChange} />
        </section>

        {!canExportCsv ? (
          <section className="export-card export-card-alert">
            <AlertCircle size={20} />
            <div>
              <strong>CSV export blocked</strong>
              <p>
                {blockedDocuments.length} document{blockedDocuments.length === 1 ? "" : "s"} need validation or
                scan-quality review before accounting export.
              </p>
            </div>
            <span className="preset-state blocked">blocked</span>
          </section>
        ) : null}

        {selectedDocument ? (
          <section className="export-card">
            <FileJson size={20} />
            <div>
              <strong>{selectedDocument.fileName}</strong>
              <p>
                {counts.errors} errors, {counts.warnings} warnings. JSON includes invoice fields, validation,
                and evidence IDs.
              </p>
            </div>
            <button className="secondary" onClick={onDownloadJson}>
              Download JSON
            </button>
          </section>
        ) : (
          <section className="export-card">
            <FileJson size={20} />
            <div>
              <strong>No document selected</strong>
              <p>Upload an invoice to create evidence JSON and CSV exports.</p>
            </div>
          </section>
        )}

        {exportPresets.map((preset) => (
          <section className="export-card" key={preset.id}>
            <Table2 size={20} />
            <div>
              <strong>{preset.name}</strong>
              <p>{preset.destination}</p>
              <small>{preset.fields.join(", ")}</small>
            </div>
            <span className={`preset-state ${!canExportCsv && preset.enabled ? "blocked" : preset.enabled ? "enabled" : ""}`}>
              {!canExportCsv && preset.enabled ? "blocked" : preset.enabled ? "ready" : "draft"}
            </span>
          </section>
        ))}
      </div>

      <pre className="json-preview">{selectedDocument ? exportDocumentJson(selectedDocument) : "{}"}</pre>
      <p className="export-footnote">{documents.length} local documents are available for batch export.</p>
    </section>
  );
}

function TestLabPage({
  onLoadFixture,
  onTabChange
}: {
  onLoadFixture: (fixture: GeneratedFixture) => void;
  onTabChange: (tab: MainTab) => void;
}) {
  const runs = useMemo(() => runFixtureSuite(), []);
  const summary = useMemo(() => fixtureSuiteSummary(runs), [runs]);
  const [selectedId, setSelectedId] = useState(runs[0]?.fixture.id ?? "");
  const selected = runs.find((run) => run.fixture.id === selectedId) ?? runs[0]!;
  const scanWarnings = selected.document.scanQuality.checks.filter((check) => check.severity !== "pass");

  return (
    <section className="product-panel lab-page">
      <div className="page-heading">
        <div>
          <h1>Fixture lab</h1>
          <p>Generated low-readability invoices used to test scan quality, validation, correction, and exports.</p>
        </div>
        <div className="heading-actions">
          <button
            className="secondary"
            onClick={() => {
              onLoadFixture(selected.fixture);
              onTabChange("vault");
            }}
          >
            <FileText size={16} />
            Load in vault
          </button>
          <button>
            <ShieldCheck size={16} />
            {summary.total} fixtures checked
          </button>
        </div>
      </div>

      <div className="lab-stats" aria-label="Fixture suite summary">
        <div>
          <span>Total</span>
          <strong>{summary.total}</strong>
        </div>
        <div>
          <span>Clean</span>
          <strong>{summary.clean}</strong>
        </div>
        <div>
          <span>Needs review</span>
          <strong>{summary.review}</strong>
        </div>
        <div>
          <span>Blocked</span>
          <strong>{summary.blocked}</strong>
        </div>
      </div>

      <div className="lab-layout">
        <div className="fixture-list" aria-label="Generated fixtures">
          {runs.map((run) => (
            <button
              key={run.fixture.id}
              className={run.fixture.id === selected.fixture.id ? "selected" : ""}
              onClick={() => setSelectedId(run.fixture.id)}
            >
              <img src={run.fixture.image} alt="" />
              <span>
                <strong>{run.fixture.id.replace(/-/g, " ")}</strong>
                <small>{run.fixture.tags.length > 0 ? run.fixture.tags.join(", ") : "clean source"}</small>
              </span>
              <span className={`fixture-outcome ${run.outcome}`}>{run.outcome}</span>
            </button>
          ))}
        </div>

        <div className="fixture-detail">
          <div className="fixture-preview">
            <img src={selected.fixture.image} alt={`${selected.fixture.id} invoice fixture`} />
          </div>

          <aside className="fixture-inspector" aria-label="Fixture inspection">
            <div className="fixture-inspector-head">
              <div>
                <strong>{selected.fixture.expected.invoiceNumber}</strong>
                <span>{selected.fixture.id.replace(/-/g, " ")}</span>
              </div>
              <span className={`fixture-outcome ${selected.outcome}`}>{selected.outcome}</span>
            </div>

            <dl className="fixture-metrics">
              <div>
                <dt>Scan score</dt>
                <dd>{selected.document.scanQuality.score}%</dd>
              </div>
              <div>
                <dt>Expected total</dt>
                <dd>{formatMoney(selected.fixture.expected.calculatedTotal)}</dd>
              </div>
              <div>
                <dt>Printed total</dt>
                <dd>{formatMoney(selected.fixture.expected.invoiceTotal)}</dd>
              </div>
              <div>
                <dt>Validation</dt>
                <dd>
                  {selected.errors} errors, {selected.warnings} warnings
                </dd>
              </div>
            </dl>

            <section className="fixture-check-block">
              <strong>Scan-quality checks</strong>
              <div className="scan-checks">
                {selected.document.scanQuality.checks.map((check) => (
                  <span className={`scan-check ${check.severity}`} key={check.id} title={check.detail}>
                    {check.label}
                  </span>
                ))}
              </div>
              {scanWarnings.length > 0 ? (
                <p>{scanWarnings[0]!.detail}</p>
              ) : (
                <p>Source quality is clean enough for evidence review.</p>
              )}
            </section>

            <button
              onClick={() => {
                onLoadFixture(selected.fixture);
                onTabChange("vault");
              }}
            >
              <Image size={16} />
              Review this document
            </button>
          </aside>
        </div>
      </div>
    </section>
  );
}

function readDocuments(): DocumentRecord[] {
  try {
    const stored = localStorage.getItem(storageKey);

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as DocumentRecord[];
    return Array.isArray(parsed)
      ? parsed
          .map(normalizeDocument)
          .filter((document) => !isLegacyDemoDocument(document))
      : [];
  } catch {
    return [];
  }
}

function isLegacyDemoDocument(document: DocumentRecord): boolean {
  if (document.source === "sample") {
    return true;
  }

  if (document.id.startsWith("fixture-") && !document.sourcePreview) {
    return true;
  }

  if (document.source === "upload" && !document.ocr && !document.sourcePreview) {
    return true;
  }

  return false;
}

function prepareDocumentForStorage(document: DocumentRecord, compact = false): DocumentRecord {
  const normalized = normalizeDocument(document);

  return {
    ...normalized,
    processingMessage: normalized.status === "processing" ? "Processing was interrupted. Upload again to rerun OCR." : normalized.processingMessage,
    status: normalized.status === "processing" ? "queued" : normalized.status,
    sourcePreview: normalized.sourcePreview
      ? {
          ...normalized.sourcePreview,
          image: undefined,
          note: normalized.sourcePreview.image ? "Source preview is session-only. Upload the file again to rerun OCR." : normalized.sourcePreview.note
        }
      : undefined,
    ocr: normalized.ocr
      ? {
          ...normalized.ocr,
          text: compact ? "" : normalized.ocr.text
        }
      : undefined
  };
}

function downloadText(fileName: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
