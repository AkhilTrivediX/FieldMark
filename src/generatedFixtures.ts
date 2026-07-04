export interface GeneratedFixture {
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

export const generatedFixtures = [
  {
    "id": "clean-desk-invoice",
    "image": "/fixtures/invoices/clean-desk-invoice.svg",
    "fileName": "clean-desk-invoice.svg",
    "tags": [],
    "expected": {
      "vendorName": "ACME SUPPLIES PVT. LTD.",
      "vendorGstin": "27AABCA1234B1Z5",
      "customerName": "BrightBuild Constructions",
      "customerGstin": "29ABCDE1234F1Z5",
      "invoiceNumber": "FM-1001",
      "invoiceDate": "02 Jul 2026",
      "dueDate": "16 Jul 2026",
      "subtotal": 4240,
      "taxTotal": 424,
      "shipping": 120,
      "discount": 0,
      "invoiceTotal": 4784,
      "calculatedTotal": 4784,
      "hasTotalMismatch": false,
      "hasBlockingScanIssue": false
    }
  },
  {
    "id": "low-contrast-faded-invoice",
    "image": "/fixtures/invoices/low-contrast-faded-invoice.svg",
    "fileName": "low-contrast-faded-invoice.svg",
    "tags": [
      "low-contrast",
      "faded"
    ],
    "expected": {
      "vendorName": "ACME SUPPLIES PVT. LTD.",
      "vendorGstin": "27AABCA1234B1Z5",
      "customerName": "BrightBuild Constructions",
      "customerGstin": "29ABCDE1234F1Z5",
      "invoiceNumber": "FM-1002",
      "invoiceDate": "02 Jul 2026",
      "dueDate": "16 Jul 2026",
      "subtotal": 3180,
      "taxTotal": 318,
      "shipping": 90,
      "discount": 0,
      "invoiceTotal": 3588,
      "calculatedTotal": 3588,
      "hasTotalMismatch": false,
      "hasBlockingScanIssue": false
    }
  },
  {
    "id": "blurred-phone-capture-invoice",
    "image": "/fixtures/invoices/blurred-phone-capture-invoice.svg",
    "fileName": "blurred-phone-capture-invoice.svg",
    "tags": [
      "blur",
      "phone"
    ],
    "expected": {
      "vendorName": "ACME SUPPLIES PVT. LTD.",
      "vendorGstin": "27AABCA1234B1Z5",
      "customerName": "BrightBuild Constructions",
      "customerGstin": "29ABCDE1234F1Z5",
      "invoiceNumber": "FM-1003",
      "invoiceDate": "02 Jul 2026",
      "dueDate": "16 Jul 2026",
      "subtotal": 9100,
      "taxTotal": 910,
      "shipping": 160,
      "discount": 0,
      "invoiceTotal": 10170,
      "calculatedTotal": 10170,
      "hasTotalMismatch": false,
      "hasBlockingScanIssue": false
    }
  },
  {
    "id": "rotated-skew-invoice",
    "image": "/fixtures/invoices/rotated-skew-invoice.svg",
    "fileName": "rotated-skew-invoice.svg",
    "tags": [
      "rotated",
      "skew"
    ],
    "expected": {
      "vendorName": "ACME SUPPLIES PVT. LTD.",
      "vendorGstin": "27AABCA1234B1Z5",
      "customerName": "BrightBuild Constructions",
      "customerGstin": "29ABCDE1234F1Z5",
      "invoiceNumber": "FM-1004",
      "invoiceDate": "02 Jul 2026",
      "dueDate": "16 Jul 2026",
      "subtotal": 5400,
      "taxTotal": 540,
      "shipping": 0,
      "discount": 200,
      "invoiceTotal": 5740,
      "calculatedTotal": 5740,
      "hasTotalMismatch": false,
      "hasBlockingScanIssue": false
    }
  },
  {
    "id": "shadow-phone-photo-invoice",
    "image": "/fixtures/invoices/shadow-phone-photo-invoice.svg",
    "fileName": "shadow-phone-photo-invoice.svg",
    "tags": [
      "shadow",
      "phone",
      "photo"
    ],
    "expected": {
      "vendorName": "ACME SUPPLIES PVT. LTD.",
      "vendorGstin": "27AABCA1234B1Z5",
      "customerName": "BrightBuild Constructions",
      "customerGstin": "29ABCDE1234F1Z5",
      "invoiceNumber": "FM-1005",
      "invoiceDate": "02 Jul 2026",
      "dueDate": "16 Jul 2026",
      "subtotal": 2250,
      "taxTotal": 225,
      "shipping": 75,
      "discount": 0,
      "invoiceTotal": 2550,
      "calculatedTotal": 2550,
      "hasTotalMismatch": false,
      "hasBlockingScanIssue": false
    }
  },
  {
    "id": "partial-crop-edge-invoice",
    "image": "/fixtures/invoices/partial-crop-edge-invoice.svg",
    "fileName": "partial-crop-edge-invoice.svg",
    "tags": [
      "partial",
      "crop",
      "edge"
    ],
    "expected": {
      "vendorName": "ACME SUPPLIES PVT. LTD.",
      "vendorGstin": "27AABCA1234B1Z5",
      "customerName": "BrightBuild Constructions",
      "customerGstin": "29ABCDE1234F1Z5",
      "invoiceNumber": "FM-1006",
      "invoiceDate": "02 Jul 2026",
      "dueDate": "16 Jul 2026",
      "subtotal": 11800,
      "taxTotal": 1180,
      "shipping": 220,
      "discount": 0,
      "invoiceTotal": 13200,
      "calculatedTotal": 13200,
      "hasTotalMismatch": false,
      "hasBlockingScanIssue": true
    }
  },
  {
    "id": "tiny-small-font-statement",
    "image": "/fixtures/invoices/tiny-small-font-statement.svg",
    "fileName": "tiny-small-font-statement.svg",
    "tags": [
      "tiny",
      "small-font",
      "dense"
    ],
    "expected": {
      "vendorName": "ACME SUPPLIES PVT. LTD.",
      "vendorGstin": "27AABCA1234B1Z5",
      "customerName": "BrightBuild Constructions",
      "customerGstin": "29ABCDE1234F1Z5",
      "invoiceNumber": "FM-1007",
      "invoiceDate": "02 Jul 2026",
      "dueDate": "16 Jul 2026",
      "subtotal": 7600,
      "taxTotal": 760,
      "shipping": 80,
      "discount": 140,
      "invoiceTotal": 8300,
      "calculatedTotal": 8300,
      "hasTotalMismatch": false,
      "hasBlockingScanIssue": false
    }
  },
  {
    "id": "handwritten-manual-adjustment",
    "image": "/fixtures/invoices/handwritten-manual-adjustment.svg",
    "fileName": "handwritten-manual-adjustment.svg",
    "tags": [
      "handwritten",
      "manual"
    ],
    "expected": {
      "vendorName": "ACME SUPPLIES PVT. LTD.",
      "vendorGstin": "27AABCA1234B1Z5",
      "customerName": "BrightBuild Constructions",
      "customerGstin": "29ABCDE1234F1Z5",
      "invoiceNumber": "FM-1008",
      "invoiceDate": "02 Jul 2026",
      "dueDate": "16 Jul 2026",
      "subtotal": 4020,
      "taxTotal": 402,
      "shipping": 60,
      "discount": 100,
      "invoiceTotal": 4382,
      "calculatedTotal": 4382,
      "hasTotalMismatch": false,
      "hasBlockingScanIssue": false
    }
  },
  {
    "id": "wide-table-dense-invoice",
    "image": "/fixtures/invoices/wide-table-dense-invoice.svg",
    "fileName": "wide-table-dense-invoice.svg",
    "tags": [
      "dense"
    ],
    "expected": {
      "vendorName": "ACME SUPPLIES PVT. LTD.",
      "vendorGstin": "27AABCA1234B1Z5",
      "customerName": "BrightBuild Constructions",
      "customerGstin": "29ABCDE1234F1Z5",
      "invoiceNumber": "FM-1009",
      "invoiceDate": "02 Jul 2026",
      "dueDate": "16 Jul 2026",
      "subtotal": 18750,
      "taxTotal": 1875,
      "shipping": 300,
      "discount": 0,
      "invoiceTotal": 20925,
      "calculatedTotal": 20925,
      "hasTotalMismatch": false,
      "hasBlockingScanIssue": false
    }
  },
  {
    "id": "mismatched-total-invoice",
    "image": "/fixtures/invoices/mismatched-total-invoice.svg",
    "fileName": "mismatched-total-invoice.svg",
    "tags": [
      "mismatch"
    ],
    "expected": {
      "vendorName": "ACME SUPPLIES PVT. LTD.",
      "vendorGstin": "27AABCA1234B1Z5",
      "customerName": "BrightBuild Constructions",
      "customerGstin": "29ABCDE1234F1Z5",
      "invoiceNumber": "FM-1010",
      "invoiceDate": "02 Jul 2026",
      "dueDate": "16 Jul 2026",
      "subtotal": 4240,
      "taxTotal": 424,
      "shipping": 120,
      "discount": 0,
      "invoiceTotal": 4820,
      "calculatedTotal": 4784,
      "hasTotalMismatch": true,
      "hasBlockingScanIssue": false
    }
  },
  {
    "id": "washed-blur-rotated-invoice",
    "image": "/fixtures/invoices/washed-blur-rotated-invoice.svg",
    "fileName": "washed-blur-rotated-invoice.svg",
    "tags": [
      "washed",
      "blur",
      "rotated"
    ],
    "expected": {
      "vendorName": "ACME SUPPLIES PVT. LTD.",
      "vendorGstin": "27AABCA1234B1Z5",
      "customerName": "BrightBuild Constructions",
      "customerGstin": "29ABCDE1234F1Z5",
      "invoiceNumber": "FM-1011",
      "invoiceDate": "02 Jul 2026",
      "dueDate": "16 Jul 2026",
      "subtotal": 6320,
      "taxTotal": 632,
      "shipping": 110,
      "discount": 0,
      "invoiceTotal": 7062,
      "calculatedTotal": 7062,
      "hasTotalMismatch": false,
      "hasBlockingScanIssue": false
    }
  },
  {
    "id": "camera-shadow-tiny-receipt",
    "image": "/fixtures/invoices/camera-shadow-tiny-receipt.svg",
    "fileName": "camera-shadow-tiny-receipt.svg",
    "tags": [
      "camera",
      "shadow",
      "tiny"
    ],
    "expected": {
      "vendorName": "ACME SUPPLIES PVT. LTD.",
      "vendorGstin": "27AABCA1234B1Z5",
      "customerName": "BrightBuild Constructions",
      "customerGstin": "29ABCDE1234F1Z5",
      "invoiceNumber": "FM-1012",
      "invoiceDate": "02 Jul 2026",
      "dueDate": "16 Jul 2026",
      "subtotal": 1520,
      "taxTotal": 152,
      "shipping": 40,
      "discount": 0,
      "invoiceTotal": 1712,
      "calculatedTotal": 1712,
      "hasTotalMismatch": false,
      "hasBlockingScanIssue": false
    }
  }
] satisfies GeneratedFixture[];
