import { ThermalAnalysisResult } from '@/lib/engineering/ThermalBridge';
import { CostBreakdown } from '@/lib/fabricator/CostCalculator';
import { StructuralModel } from '@/types/engineering';
import { FacadeModel, WindowUnit } from '@/types/fabricator';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF for autoTable (TypeScript workaround)
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF; 
  lastAutoTable: { finalY: number };
}

export class FacadeReportService {
    
  /**
   * Generates a Gold Tier PDF Report for Facade Projects
   * Includes: Cover, Engineering Specs, BOM, Cut List, and Costing
   */
  static async generateFacadeReport(
    project: WindowUnit,
    facadeModel: FacadeModel,
    costBreakdown?: CostBreakdown,
    thermalResult?: ThermalAnalysisResult,
    structuralModel?: StructuralModel
  ): Promise<Blob> {
    const doc = new jsPDF() as unknown as jsPDFWithAutoTable;
    
    // --- 1. COVER PAGE ---
    this.addHeader(doc, 'ALMONA FACADE ENGINEERING REPORT');
    this.addProjectInfo(doc, project);
    
    // Visual Classification Badge (Gold Tier UX)
    if (thermalResult) {
       this.addEnergyBadge(doc, thermalResult.classification, 150, 40);
    }
    
    doc.setFontSize(10);
    doc.text(`Report Generated: ${new Date().toLocaleString()}`, 15, 280);
    
    // --- 2. ENGINEERING SUMMARY ---
    let currentY = 80;
    doc.setFontSize(14);
    doc.setTextColor(255, 107, 53); // Almona Orange
    doc.text('ENGINEERING SPECIFICATIONS', 15, currentY);
    doc.setTextColor(0, 0, 0);
    currentY += 10;

    const engData = [
        ['System Type', facadeModel.systemType.toUpperCase()],
        ['Total Area', `${facadeModel.totalArea.toFixed(2)} m2`],
        ['Members Count', `${facadeModel.members.length} Profiles`],
        ['Panels Count', `${facadeModel.panels.length} Units`],
    ];

    if (thermalResult) {
        engData.push(['Thermal Transmittance (Uw)', `${thermalResult.overallUValue} W/m2K`]);
        engData.push(['Est. Heat Loss (dT=20K)', `${thermalResult.heatLoss} W`]);
    }

    if (structuralModel) {
        engData.push(['Structural Nodes', `${structuralModel.nodes.length}`]);
        engData.push(['Wind Load Case', `${structuralModel.loads.length} Loads Applied`]);
    }

    doc.autoTable({
        startY: currentY,
        head: [['Metric', 'Value']],
        body: engData,
        theme: 'striped',
        headStyles: { fillColor: [255, 107, 53] }, // Almona Orange
        styles: { fontSize: 10 }
    });
    currentY = doc.lastAutoTable.finalY + 20;

    // --- 3. COST BREAKDOWN (Commercial) ---
    if (costBreakdown) {
        doc.setFontSize(14);
        doc.setTextColor(255, 107, 53);
        doc.text('COMMERCIAL SUMMARY', 15, currentY);
        currentY += 10;
        
        doc.autoTable({
            startY: currentY,
            head: [['Item', `Cost (${costBreakdown.currency})`]],
            body: [
                ['Profiles (Aluminum)', costBreakdown.profilesCost.toLocaleString()],
                ['Hardware & Accessories', costBreakdown.hardwareCost.toLocaleString()],
                ['Glazing / Infill', costBreakdown.glassCost.toLocaleString()],
                ['Labor & Assembly', costBreakdown.laborCost.toLocaleString()],
                ['Tax / VAT', costBreakdown.tax.toLocaleString()],
                ['TOTAL PROJECT VALUE', { content: costBreakdown.total.toLocaleString(), styles: { fontStyle: 'bold' } }]
            ],
            theme: 'grid',
            headStyles: { fillColor: [60, 60, 60] } // Dark Grey
        });
        currentY = doc.lastAutoTable.finalY + 20;
    }

    // --- 4. CUTTING LIST (Fabrication) ---
    doc.addPage();
    this.addHeader(doc, 'FABRICATION CUT LIST');
    currentY = 40;

    // Group members by Multi-Type (Mullion, Transom) to optimize layout (simulated)
    // Real implementation would pass Optimized Cut List here.
    // We will list raw members for Phase 2/3 Proof of Value.
    
    const cutRows = facadeModel.members.map((m, idx) => [
        idx + 1,
        m.type.toUpperCase(),
        m.profileId,
        `${(m.length).toFixed(1)} mm`,
        '90° / 90°', // Simple cut for Facade usually
        '1'
    ]);

    doc.autoTable({
        startY: currentY,
        head: [['#', 'Type', 'Profile Code', 'Cut Length', 'Angles', 'Qty']],
        body: cutRows,
        theme: 'grid',
        headStyles: { fillColor: [0, 102, 204] } // Blue for Technical
    });
    
    // --- 5. SHUTTER & SCREEN SCHEDULE (Egyptian Market) ---
    // Check for "specials"
    // Heuristic: If we had direct access to the BOM calc results, we'd list them.
    // For now, we'll placeholder this if the system implies it.
    
    return doc.output('blob');
  }

  private static addHeader(doc: jsPDF, title: string) {
      doc.setFillColor(26, 26, 26); // Dark Almona Background
      doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text(title, 15, 20);
      doc.setTextColor(0, 0, 0); // Reset
  }

  private static addProjectInfo(doc: jsPDF, project: WindowUnit) {
      doc.setFontSize(12);
      doc.text(`Project Ref: ${project.orderNumber}`, 150, 20);
      doc.setFontSize(10);
      doc.text(`Client: ${project.customer || 'N/A'}`, 150, 26);
  }

  private static addEnergyBadge(doc: jsPDF, rating: string, x: number, y: number) {
      // Draw simple Badge
      const colorMap: Record<string, [number, number, number]> = {
          'A+': [0, 153, 51], // Green
          'A': [51, 204, 51],
          'B': [255, 204, 0], // Yellow
          'C': [255, 153, 0], // Orange
          'D': [204, 51, 0],  // Red
          'E': [153, 0, 0],
          'F': [102, 0, 0]
      };
      const color = colorMap[rating] || [128, 128, 128];
      
      doc.setDrawColor(color[0], color[1], color[2]);
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(x, y, 40, 20, 'FD');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text(`Energy: ${rating}`, x + 5, y + 13);
      doc.setTextColor(0, 0, 0);
  }
}
