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
  extractedFields,
  formatMoney,
  normalizeDocument,
  schemaFields,
  seedDocuments,
  validateDocument,
  updateInvoiceField,
  validationCounts
} from "./domain.js";

type MainTab = "vault" | "schemas" | "validation" | "exports";

const storageKey = "fieldmark.workspace.v1";
const fallbackDocument = seedDocuments[0]!;

export function App() {
  const [activeTab, setActiveTab] = useState<MainTab>("vault");
  const [mode, setMode] = useState<WorkspaceMode>("local");
  const [documents, setDocuments] = useState<DocumentRecord[]>(() => readDocuments());
  const [selectedId, setSelectedId] = useState(fallbackDocument.id);
  const fileInput = useRef<HTMLInputElement>(null);

  const selectedDocument = documents.find((document) => document.id === selectedId) ?? documents[0] ?? fallbackDocument;
  const selectedValidation = useMemo(
    () => validateDocument(selectedDocument),
    [selectedDocument]
  );

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(documents));
  }, [documents]);

  function selectDocument(id: string) {
    setSelectedId(id);
    setActiveTab("vault");
  }

  function updateSelectedField(field: ExtractedField, value: string) {
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
    const expected = calculatedTotal(selectedDocument.invoice).toFixed(2);
    const field = extractedFields(selectedDocument.invoice).find((item) => item.key === "invoiceTotal");

    if (field) {
      updateSelectedField(field, expected);
    }
  }

  function markReviewed() {
    const counts = validationCounts(selectedValidation);

    setDocuments((current) =>
      current.map((document) =>
        document.id === selectedDocument.id
          ? { ...document, status: counts.errors > 0 ? "needs_review" : "ready" }
          : document
      )
    );
  }

  function processQueuedDocument(id: string) {
    setDocuments((current) =>
      current.map((document) =>
        document.id === id
          ? {
              ...document,
              status: "needs_review",
              uploadedAt: document.uploadedAt === "Just now" ? "OCR ready" : document.uploadedAt
            }
          : document
      )
    );
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    const incoming = Array.from(files).map((file) => createUploadedDocument(file.name));
    setDocuments((current) => [...incoming, ...current]);
    setSelectedId(incoming[0]!.id);
    setActiveTab("vault");

    if (fileInput.current) {
      fileInput.current.value = "";
    }
  }

  function downloadSelectedJson() {
    downloadText(
      `${selectedDocument.fileName.replace(/\.[^.]+$/, "")}.fieldmark.json`,
      exportDocumentJson(selectedDocument),
      "application/json"
    );
  }

  function downloadCsv() {
    downloadText("fieldmark-export.csv", exportDocumentsCsv(documents), "text/csv");
  }

  return (
    <div className="fieldmark-app">
      <input
        ref={fileInput}
        className="hidden-input"
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.json,.csv"
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
        <span className="brand-mark">F</span>
        <span>Fieldmark</span>
      </div>

      <nav className="top-nav" aria-label="Main">
        {[
          ["vault", "Local vault"],
          ["schemas", "Schemas"],
          ["validation", "Validation"],
          ["exports", "Exports"]
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
  selectedDocument: DocumentRecord;
  validation: ValidationResult[];
  onApplyExpectedTotal: () => void;
  onDownloadJson: () => void;
  onMarkReviewed: () => void;
  onProcessQueued: (id: string) => void;
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
  onSelectDocument,
  onUpdateField,
  onUpload
}: VaultWorkspaceProps) {
  return (
    <main className="workspace vault-workspace">
      <DocumentQueue
        documents={documents}
        selectedId={selectedDocument.id}
        onProcessQueued={onProcessQueued}
        onSelectDocument={onSelectDocument}
        onUpload={onUpload}
      />

      <section className="viewer" aria-label="Document viewer">
        <ViewerToolbar fileName={selectedDocument.fileName} onDownloadJson={onDownloadJson} />
        <div className="viewer-canvas">
          <InvoicePage document={selectedDocument} />
        </div>
        <ViewerFooter />
      </section>

      <FieldRail
        document={selectedDocument}
        validation={validation}
        onApplyExpectedTotal={onApplyExpectedTotal}
        onMarkReviewed={onMarkReviewed}
        onUpdateField={onUpdateField}
      />
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
  selectedId: string;
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
                {document.uploadedAt}
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
  onDownloadJson
}: {
  fileName: string;
  onDownloadJson: () => void;
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
        <button className="icon-button" aria-label="Refresh extraction">
          <RefreshCw />
        </button>
      </div>
      <div />
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
  const fields = extractedFields(document.invoice);
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
  selectedDocument: DocumentRecord;
  validation: ValidationResult[];
  onDownloadCsv: () => void;
  onDownloadJson: () => void;
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
  selectedDocument: DocumentRecord;
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

      <div className="ledger-layout">
        <div className="ledger-list">
          {documents.map((document) => {
            const counts = validationCounts(validateDocument(document));

            return (
              <button
                key={document.id}
                className={document.id === selectedDocument.id ? "selected" : ""}
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
            {validateDocument(selectedDocument).map((result) => (
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
  selectedDocument: DocumentRecord;
  validation: ValidationResult[];
  onDownloadCsv: () => void;
  onDownloadJson: () => void;
  onModeChange: (mode: WorkspaceMode) => void;
  onUpload: () => void;
}) {
  const counts = validationCounts(validation);

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
          <button onClick={onDownloadCsv}>
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

        {exportPresets.map((preset) => (
          <section className="export-card" key={preset.id}>
            <Table2 size={20} />
            <div>
              <strong>{preset.name}</strong>
              <p>{preset.destination}</p>
              <small>{preset.fields.join(", ")}</small>
            </div>
            <span className={`preset-state ${preset.enabled ? "enabled" : ""}`}>
              {preset.enabled ? "ready" : "draft"}
            </span>
          </section>
        ))}
      </div>

      <pre className="json-preview">{exportDocumentJson(selectedDocument)}</pre>
      <p className="export-footnote">{documents.length} local documents are available for batch export.</p>
    </section>
  );
}

function readDocuments(): DocumentRecord[] {
  try {
    const stored = localStorage.getItem(storageKey);

    if (!stored) {
      return seedDocuments;
    }

    const parsed = JSON.parse(stored) as DocumentRecord[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed.map(normalizeDocument) : seedDocuments;
  } catch {
    return seedDocuments;
  }
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
