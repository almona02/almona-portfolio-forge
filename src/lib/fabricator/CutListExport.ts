/**
 * Export Handlers for Cut List - CSV and PDF
 * 
 * Workshop-ready export formats for Yılmaz single-head machines
 */

import { OptimizedCutList } from './UPVCCuttingEngine';

/**
 * Export cut list to CSV format
 * Columns: Bar #, Profile, Role, Cut Length (mm), Angle (°), Position (mm), Waste (mm)
 */
export function exportCutListToCSV(cutList: OptimizedCutList, _projectName: string = 'Window Project'): string {
  const headers = [
    'Bar Number',
    'Profile Name',
    'Role',
    'Cut Length (mm)',
    'Cutting Angle (°)',
    'Position on Bar (mm)',
    'Waste After (mm)',
    'Quantity'
  ];

  const rows: string[][] = [headers];

  // Add data rows
  cutList.items.forEach((item) => {
    rows.push([
      item.barNumber.toString(),
      item.profileName,
      item.role.toUpperCase(),
      item.cutLengthMm.toFixed(1),
      item.cuttingAngle.toString(),
      item.positionOnBarMm.toFixed(1),
      item.wasteAfterMm.toFixed(1),
      item.quantity.toString()
    ]);
  });

  // Add summary
  rows.push([]);
  rows.push(['SUMMARY']);
  rows.push(['Total Bars Used', cutList.totalBarsUsed.toString()]);
  rows.push(['Total Waste (mm)', cutList.totalWasteMm.toFixed(1)]);
  rows.push(['Waste Percentage', `${cutList.wastePercentage.toFixed(1)}%`]);

  // Convert to CSV string
  return rows.map(row => row.join(',')).join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string = 'cut-list.csv'): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Export cut list to print-ready HTML
 * A4 Landscape format optimized for workshop printing
 */
export function exportCutListToPrintHTML(
  cutList: OptimizedCutList,
  projectInfo: {
    name: string;
    width: number;
    height: number;
    systemPack: string;
  }
): string {
  const timestamp = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Cut List - ${projectInfo.name}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 15mm;
    }
    
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
      .page-break { page-break-after: always; }
    }
    
    body {
      font-family: Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #000;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    
    .header h1 {
      margin: 0;
      font-size: 20pt;
      font-weight: bold;
    }
    
    .header .info {
      text-align: right;
      font-size: 10pt;
    }
    
    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    
    .summary-box {
      border: 2px solid #333;
      padding: 10px;
      text-align: center;
    }
    
    .summary-box .label {
      font-size: 9pt;
      color: #666;
      margin-bottom: 5px;
    }
    
    .summary-box .value {
      font-size: 18pt;
      font-weight: bold;
    }
    
    .summary-box.green { background-color: #d4edda; border-color: #28a745; }
    .summary-box.amber { background-color: #fff3cd; border-color: #ffc107; }
    .summary-box.red { background-color: #f8d7da; border-color: #dc3545; }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    
    th, td {
      border: 1px solid #333;
      padding: 8px;
      text-align: left;
    }
    
    th {
      background-color: #333;
      color: white;
      font-weight: bold;
      font-size: 10pt;
    }
    
    td {
      font-size: 10pt;
    }
    
    tr:nth-child(even) {
      background-color: #f2f2f2;
    }
    
    .cut-number {
      background-color: #007bff;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: bold;
      display: inline-block;
      min-width: 30px;
      text-align: center;
    }
    
    .role-badge {
      background-color: #6c757d;
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 9pt;
      font-weight: bold;
    }
    
    .footer {
      margin-top: 30px;
      padding-top: 10px;
      border-top: 2px solid #333;
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      color: #666;
    }
    
    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14pt;
      font-weight: bold;
    }
    
    .print-button:hover {
      background-color: #0056b3;
    }
  </style>
</head>
<body>
  <button class="print-button no-print" onclick="window.print()">🖨️ Print</button>
  
  <div class="header">
    <div>
      <h1>UPVC CUTTING LIST</h1>
      <div style="font-size: 12pt; margin-top: 5px;">
        <strong>${projectInfo.name}</strong> | ${projectInfo.width}mm × ${projectInfo.height}mm
      </div>
    </div>
    <div class="info">
      <div><strong>System:</strong> ${projectInfo.systemPack}</div>
      <div><strong>Date:</strong> ${timestamp}</div>
      <div><strong>Machine:</strong> Yılmaz Single-Head</div>
    </div>
  </div>
  
  <div class="summary">
    <div class="summary-box">
      <div class="label">Total Bars (6m)</div>
      <div class="value">${cutList.totalBarsUsed}</div>
    </div>
    
    <div class="summary-box ${
      cutList.wastePercentage < 5 ? 'green' :
      cutList.wastePercentage < 10 ? 'amber' : 'red'
    }">
      <div class="label">Waste</div>
      <div class="value">${cutList.wastePercentage.toFixed(1)}%</div>
    </div>
    
    <div class="summary-box">
      <div class="label">Total Length</div>
      <div class="value">${((cutList.totalBarsUsed * 6000 - cutList.totalWasteMm) / 1000).toFixed(1)}m</div>
    </div>
    
    <div class="summary-box">
      <div class="label">Efficiency</div>
      <div class="value">${(100 - cutList.wastePercentage).toFixed(1)}%</div>
    </div>
  </div>
  
  <h2 style="margin-top: 30px; margin-bottom: 10px;">Cutting Instructions</h2>
  
  <table>
    <thead>
      <tr>
        <th style="width: 50px;">#</th>
        <th style="width: 70px;">Bar</th>
        <th>Profile</th>
        <th style="width: 80px;">Role</th>
        <th style="width: 100px;">Cut Length</th>
        <th style="width: 70px;">Angle</th>
        <th style="width: 100px;">Position</th>
        <th style="width: 80px;">Qty</th>
      </tr>
    </thead>
    <tbody>
      ${cutList.items.map((item, idx) => `
        <tr>
          <td><span class="cut-number">${idx + 1}</span></td>
          <td style="text-align: center; font-weight: bold;">Bar ${item.barNumber}</td>
          <td>${item.profileName}</td>
          <td><span class="role-badge">${item.role.toUpperCase()}</span></td>
          <td style="text-align: right; font-weight: bold; font-family: monospace;">${item.cutLengthMm.toFixed(1)} mm</td>
          <td style="text-align: center; font-weight: bold;">${item.cuttingAngle}°</td>
          <td style="text-align: right; font-family: monospace;">${item.positionOnBarMm.toFixed(0)} mm</td>
          <td style="text-align: center; font-weight: bold;">${item.quantity}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    <div>
      <strong>Almona Fabricator Pro</strong> - Gold Tier Production System
    </div>
    <div>
      Generated: ${timestamp}
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Print cut list (opens print dialog)
 */
export function printCutList(
  cutList: OptimizedCutList,
  projectInfo: {
    name: string;
    width: number;
    height: number;
    systemPack: string;
  }
): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the cut list');
    return;
  }

  const html = exportCutListToPrintHTML(cutList, projectInfo);
  printWindow.document.write(html);
  printWindow.document.close();
  
  // Auto-trigger print dialog after content loads
  printWindow.onload = () => {
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
}
