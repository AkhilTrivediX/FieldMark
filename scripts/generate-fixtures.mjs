import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const fixtureDir = join(root, "public", "fixtures", "invoices");
const generatedCatalog = join(root, "src", "generatedFixtures.ts");

const cases = [
  fixture("clean-desk-invoice", "FM-1001", 4240, 424, 120, 0, 4784, []),
  fixture("low-contrast-faded-invoice", "FM-1002", 3180, 318, 90, 0, 3588, ["low-contrast", "faded"]),
  fixture("blurred-phone-capture-invoice", "FM-1003", 9100, 910, 160, 0, 10170, ["blur", "phone"]),
  fixture("rotated-skew-invoice", "FM-1004", 5400, 540, 0, 200, 5740, ["rotated", "skew"]),
  fixture("shadow-phone-photo-invoice", "FM-1005", 2250, 225, 75, 0, 2550, ["shadow", "phone", "photo"]),
  fixture("partial-crop-edge-invoice", "FM-1006", 11800, 1180, 220, 0, 13200, ["partial", "crop", "edge"]),
  fixture("tiny-small-font-statement", "FM-1007", 7600, 760, 80, 140, 8300, ["tiny", "small-font", "dense"]),
  fixture("handwritten-manual-adjustment", "FM-1008", 4020, 402, 60, 100, 4382, ["handwritten", "manual"]),
  fixture("wide-table-dense-invoice", "FM-1009", 18750, 1875, 300, 0, 20925, ["dense"]),
  fixture("mismatched-total-invoice", "FM-1010", 4240, 424, 120, 0, 4820, ["mismatch"]),
  fixture("washed-blur-rotated-invoice", "FM-1011", 6320, 632, 110, 0, 7062, ["washed", "blur", "rotated"]),
  fixture("camera-shadow-tiny-receipt", "FM-1012", 1520, 152, 40, 0, 1712, ["camera", "shadow", "tiny"])
];

await mkdir(fixtureDir, { recursive: true });

const index = [];

for (const item of cases) {
  const svgFile = `${item.id}.svg`;
  const jsonFile = `${item.id}.json`;
  await writeFile(join(fixtureDir, svgFile), renderSvg(item), "utf8");
  await writeFile(join(fixtureDir, jsonFile), `${JSON.stringify(toManifest(item, svgFile), null, 2)}\n`, "utf8");
  index.push({ id: item.id, image: svgFile, manifest: jsonFile });
}

await writeFile(join(fixtureDir, "index.json"), `${JSON.stringify(index, null, 2)}\n`, "utf8");
await writeFile(generatedCatalog, renderCatalog(cases), "utf8");

console.log(`Generated ${cases.length} FieldMark invoice fixtures in ${fixtureDir}`);

function fixture(id, invoiceNumber, subtotal, taxTotal, shipping, discount, invoiceTotal, tags) {
  return {
    id,
    invoiceNumber,
    vendorName: "ACME SUPPLIES PVT. LTD.",
    vendorGstin: "27AABCA1234B1Z5",
    customerName: "BrightBuild Constructions",
    customerGstin: "29ABCDE1234F1Z5",
    invoiceDate: "02 Jul 2026",
    dueDate: "16 Jul 2026",
    subtotal,
    taxTotal,
    shipping,
    discount,
    invoiceTotal,
    calculatedTotal: round(subtotal + taxTotal + shipping - discount),
    tags
  };
}

function toManifest(item, image) {
  return {
    id: item.id,
    image,
    fileName: image,
    tags: item.tags,
    expected: {
      vendorName: item.vendorName,
      vendorGstin: item.vendorGstin,
      customerName: item.customerName,
      customerGstin: item.customerGstin,
      invoiceNumber: item.invoiceNumber,
      invoiceDate: item.invoiceDate,
      dueDate: item.dueDate,
      subtotal: item.subtotal,
      taxTotal: item.taxTotal,
      shipping: item.shipping,
      discount: item.discount,
      invoiceTotal: item.invoiceTotal,
      calculatedTotal: item.calculatedTotal,
      hasTotalMismatch: Math.abs(item.invoiceTotal - item.calculatedTotal) > 0.009,
      hasBlockingScanIssue: item.tags.some((tag) => ["crop", "partial", "edge"].includes(tag))
    }
  };
}

function renderSvg(item) {
  const textColor = item.tags.includes("low-contrast") || item.tags.includes("washed") ? "#8e969f" : "#111827";
  const lineColor = item.tags.includes("low-contrast") || item.tags.includes("washed") ? "#cbd5df" : "#8b98a5";
  const pageFill = item.tags.includes("washed") ? "#fafafa" : "#ffffff";
  const filter = item.tags.includes("blur") ? "filter=\"url(#blur)\"" : "";
  const rotate = item.tags.includes("rotated") || item.tags.includes("skew") ? "transform=\"rotate(-2 620 877)\"" : "";
  const tiny = item.tags.includes("tiny") || item.tags.includes("dense");
  const font = tiny ? 20 : 24;
  const tableFont = tiny ? 17 : 20;
  const shadowOverlay = item.tags.includes("shadow") || item.tags.includes("camera") || item.tags.includes("phone")
    ? "<ellipse cx=\"230\" cy=\"380\" rx=\"260\" ry=\"430\" fill=\"#111827\" opacity=\"0.10\"/>"
    : "";
  const cropMask = item.tags.includes("crop") || item.tags.includes("partial") || item.tags.includes("edge")
    ? "<rect x=\"0\" y=\"0\" width=\"70\" height=\"1754\" fill=\"#eef2f6\"/><text x=\"18\" y=\"850\" font-size=\"18\" transform=\"rotate(-90 18 850)\" fill=\"#9b1c1c\">cropped edge</text>"
    : "";
  const manualNote = item.tags.includes("handwritten") || item.tags.includes("manual")
    ? "<text x=\"760\" y=\"1330\" font-size=\"34\" font-family=\"Comic Sans MS, Segoe Print, cursive\" fill=\"#334155\" transform=\"rotate(-5 760 1330)\">manual freight correction checked</text>"
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="1754" viewBox="0 0 1240 1754">
  <defs>
    <filter id="blur"><feGaussianBlur stdDeviation="1.6"/></filter>
    <filter id="paperNoise">
      <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="table" tableValues="0 0.05"/></feComponentTransfer>
    </filter>
  </defs>
  <rect width="1240" height="1754" fill="#eef2f6"/>
  <g ${filter}>
    <rect x="86" y="74" width="1068" height="1606" rx="10" fill="${pageFill}" stroke="#d3d9e1"/>
    <rect x="86" y="74" width="1068" height="1606" fill="#000" filter="url(#paperNoise)" opacity="0.35"/>
    ${shadowOverlay}
    ${cropMask}
    <g ${rotate} font-family="Inter, Arial, sans-serif" fill="${textColor}">
      <text x="160" y="190" font-size="30" font-weight="700">${item.vendorName}</text>
      <text x="160" y="230" font-size="${font}">123, Industrial Area, Phase 2</text>
      <text x="160" y="264" font-size="${font}">Pune, Maharashtra 411019</text>
      <text x="160" y="304" font-size="${font}">GSTIN: ${item.vendorGstin}</text>

      <text x="780" y="198" font-size="42" font-weight="800">TAX INVOICE</text>
      <rect x="760" y="240" width="300" height="118" fill="none" stroke="${lineColor}" stroke-width="2"/>
      <line x1="760" y1="279" x2="1060" y2="279" stroke="${lineColor}" stroke-width="2"/>
      <line x1="760" y1="318" x2="1060" y2="318" stroke="${lineColor}" stroke-width="2"/>
      <line x1="912" y1="240" x2="912" y2="358" stroke="${lineColor}" stroke-width="2"/>
      <text x="780" y="267" font-size="20">Invoice No.</text>
      <text x="930" y="267" font-size="20" font-weight="700">${item.invoiceNumber}</text>
      <text x="780" y="306" font-size="20">Invoice Date</text>
      <text x="930" y="306" font-size="20" font-weight="700">${item.invoiceDate}</text>
      <text x="780" y="345" font-size="20">Due Date</text>
      <text x="930" y="345" font-size="20" font-weight="700">${item.dueDate}</text>

      <text x="160" y="432" font-size="26" font-weight="700">Bill To</text>
      <text x="160" y="472" font-size="${font}" font-weight="700">${item.customerName}</text>
      <text x="160" y="506" font-size="${font}">45, Residency Road</text>
      <text x="160" y="540" font-size="${font}">Bengaluru, Karnataka 560025</text>
      <text x="160" y="578" font-size="${font}">GSTIN: ${item.customerGstin}</text>

      <rect x="160" y="680" width="900" height="320" fill="none" stroke="${lineColor}" stroke-width="2"/>
      <line x1="160" y1="732" x2="1060" y2="732" stroke="${lineColor}" stroke-width="2"/>
      <line x1="238" y1="680" x2="238" y2="1000" stroke="${lineColor}" stroke-width="2"/>
      <line x1="640" y1="680" x2="640" y2="1000" stroke="${lineColor}" stroke-width="2"/>
      <line x1="755" y1="680" x2="755" y2="1000" stroke="${lineColor}" stroke-width="2"/>
      <line x1="840" y1="680" x2="840" y2="1000" stroke="${lineColor}" stroke-width="2"/>
      <line x1="932" y1="680" x2="932" y2="1000" stroke="${lineColor}" stroke-width="2"/>
      <text x="184" y="715" font-size="${tableFont}" font-weight="700">#</text>
      <text x="260" y="715" font-size="${tableFont}" font-weight="700">Description</text>
      <text x="660" y="715" font-size="${tableFont}" font-weight="700">HSN/SAC</text>
      <text x="780" y="715" font-size="${tableFont}" font-weight="700">Qty</text>
      <text x="860" y="715" font-size="${tableFont}" font-weight="700">Rate</text>
      <text x="956" y="715" font-size="${tableFont}" font-weight="700">Amount</text>
      ${lineRow(1, "Steel Channel 25mm", "72166100", 20, 120, 2400, tableFont)}
      ${lineRow(2, "Hex Bolt M12", "73181500", 100, 8, 800, tableFont)}
      ${lineRow(3, "Washer M12", "73182200", 100, 4, 400, tableFont)}
      ${lineRow(4, "Site delivery kit", "996511", 1, 640, 640, tableFont)}

      <rect x="160" y="1080" width="900" height="270" fill="none" stroke="${lineColor}" stroke-width="2"/>
      <line x1="740" y1="1080" x2="740" y2="1350" stroke="${lineColor}" stroke-width="2"/>
      <text x="184" y="1130" font-size="${font}" font-weight="700">Amount in words</text>
      <text x="184" y="1172" font-size="${font}">Four Thousand Eight Hundred Twenty Only</text>
      ${totalRow(762, 1120, "Subtotal", item.subtotal, font)}
      ${totalRow(762, 1172, "Tax total", item.taxTotal, font)}
      ${totalRow(762, 1224, "Shipping", item.shipping, font)}
      ${totalRow(762, 1276, "Discount", item.discount, font)}
      <text x="762" y="1328" font-size="${font}" font-weight="800">Total</text>
      <text x="990" y="1328" font-size="${font}" font-weight="800" text-anchor="end">${money(item.invoiceTotal)}</text>
      ${manualNote}

      <text x="160" y="1442" font-size="${font}" font-weight="700">Terms &amp; Conditions</text>
      <text x="160" y="1482" font-size="${font}">1. Goods once sold will not be taken back.</text>
      <text x="160" y="1520" font-size="${font}">2. Interest @ 18% p.a. will be charged on overdue payments.</text>
    </g>
  </g>
</svg>
`;
}

function lineRow(index, description, hsn, qty, rate, amount, fontSize) {
  const y = 732 + index * 54;
  return `
      <line x1="160" y1="${y - 20}" x2="1060" y2="${y - 20}" stroke="#aab4c0" stroke-width="1"/>
      <text x="184" y="${y}" font-size="${fontSize}">${index}</text>
      <text x="260" y="${y}" font-size="${fontSize}">${description}</text>
      <text x="660" y="${y}" font-size="${fontSize}">${hsn}</text>
      <text x="800" y="${y}" font-size="${fontSize}" text-anchor="end">${qty}</text>
      <text x="908" y="${y}" font-size="${fontSize}" text-anchor="end">${money(rate)}</text>
      <text x="1030" y="${y}" font-size="${fontSize}" text-anchor="end">${money(amount)}</text>`;
}

function totalRow(x, y, label, value, fontSize) {
  return `
      <text x="${x}" y="${y}" font-size="${fontSize}">${label}</text>
      <text x="990" y="${y}" font-size="${fontSize}" text-anchor="end">${money(value)}</text>`;
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function round(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function renderCatalog(items) {
  const catalog = items.map((item) => ({
    id: item.id,
    image: `/fixtures/invoices/${item.id}.svg`,
    fileName: `${item.id}.svg`,
    tags: item.tags,
    expected: {
      vendorName: item.vendorName,
      vendorGstin: item.vendorGstin,
      customerName: item.customerName,
      customerGstin: item.customerGstin,
      invoiceNumber: item.invoiceNumber,
      invoiceDate: item.invoiceDate,
      dueDate: item.dueDate,
      subtotal: item.subtotal,
      taxTotal: item.taxTotal,
      shipping: item.shipping,
      discount: item.discount,
      invoiceTotal: item.invoiceTotal,
      calculatedTotal: item.calculatedTotal,
      hasTotalMismatch: Math.abs(item.invoiceTotal - item.calculatedTotal) > 0.009,
      hasBlockingScanIssue: item.tags.some((tag) => ["crop", "partial", "edge"].includes(tag))
    }
  }));

  return `export interface GeneratedFixture {
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

export const generatedFixtures = ${JSON.stringify(catalog, null, 2)} satisfies GeneratedFixture[];
`;
}
