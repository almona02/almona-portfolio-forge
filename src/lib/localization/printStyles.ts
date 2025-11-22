/**
 * Print Styles for Reports
 * Week 4: Print Perfection & Output Optimization
 * 
 * Provides print-specific CSS for all report types
 */

export const printStyles = `
/* Print-specific styles for all reports */
@media print {
  /* Reset margins and padding */
  * {
    -webkit-print-color-adjust: exact !important;
    color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* Page setup */
  @page {
    size: A4;
    margin: 1cm;
  }

  @page :first {
    margin-top: 2cm;
  }

  /* Hide non-printable elements */
  .print\\:hidden {
    display: none !important;
  }

  /* Show print-only elements */
  .print\\:block {
    display: block !important;
  }

  /* Prevent page breaks inside important sections */
  .print\\:break-inside-avoid {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  /* Page break before */
  .print\\:break-before {
    break-before: page;
    page-break-before: always;
  }

  /* Page break after */
  .print\\:break-after {
    break-after: page;
    page-break-after: always;
  }

  /* Optimize spacing for print */
  .print\\:space-y-4 > * + * {
    margin-top: 1rem;
  }

  /* Ensure QR codes and barcodes print clearly */
  img[alt*="QR"], img[alt*="qr"], img[alt*="QR Code"] {
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
    max-width: 150px;
    height: auto;
  }

  /* Optimize table printing */
  table {
    border-collapse: collapse;
    width: 100%;
  }

  table th,
  table td {
    border: 1px solid #000;
    padding: 0.5rem;
    font-size: 10pt;
  }

  table th {
    background-color: #f0f0f0 !important;
    font-weight: bold;
  }

  /* Ensure diagrams print correctly */
  svg {
    max-width: 100%;
    height: auto;
  }

  /* Optimize font sizes for print */
  body {
    font-size: 10pt;
    line-height: 1.4;
  }

  h1 {
    font-size: 18pt;
    page-break-after: avoid;
  }

  h2 {
    font-size: 14pt;
    page-break-after: avoid;
  }

  h3 {
    font-size: 12pt;
    page-break-after: avoid;
  }

  /* RTL-specific print styles */
  [dir="rtl"] {
    direction: rtl;
    text-align: right;
  }

  [dir="rtl"] table {
    direction: rtl;
  }

  [dir="rtl"] table th,
  [dir="rtl"] table td {
    text-align: right;
  }

  /* Ensure proper Arabic font rendering */
  [dir="rtl"] * {
    font-family: 'Segoe UI', 'Arial', 'Tahoma', 'Arabic Typesetting', sans-serif;
  }

  /* Optimize card printing */
  .card {
    border: 1px solid #000;
    page-break-inside: avoid;
    margin-bottom: 1rem;
  }

  /* Hide shadows and effects for print */
  .shadow,
  .shadow-md,
  .shadow-lg {
    box-shadow: none !important;
  }

  /* Ensure buttons don't print */
  button,
  .btn {
    display: none !important;
  }

  /* Optimize colors for black and white printing */
  .bg-primary,
  .bg-secondary {
    background-color: #f0f0f0 !important;
    color: #000 !important;
  }

  /* Ensure links are visible */
  a {
    color: #000 !important;
    text-decoration: underline;
  }

  /* Footer for each page */
  @page {
    @bottom-center {
      content: "Page " counter(page) " of " counter(pages);
      font-size: 8pt;
      color: #666;
    }
  }
}

/* Paper size variants */
@media print {
  @page {
    size: A4;
  }

  .paper-letter @page {
    size: Letter;
  }

  .paper-a3 @page {
    size: A3;
  }
}

/* Ink-saving mode */
@media print {
  .ink-saving {
    background: white !important;
    color: black !important;
  }

  .ink-saving * {
    background: white !important;
    color: black !important;
  }

  .ink-saving .bg-primary,
  .ink-saving .bg-secondary {
    background: #f0f0f0 !important;
  }
}
`;

/**
 * Inject print styles into document
 */
export function injectPrintStyles(): void {
  if (typeof document === 'undefined') return;

  const styleId = 'report-print-styles';
  let styleElement = document.getElementById(styleId) as HTMLStyleElement;

  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.setAttribute('type', 'text/css');
    document.head.appendChild(styleElement);
  }

  styleElement.textContent = printStyles;
}

