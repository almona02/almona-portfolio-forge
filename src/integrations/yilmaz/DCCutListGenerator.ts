/**
 * DC Series Cut List Generator
 * For Yilmaz DC series mitre saws (DC 550, DC 650, etc.)
 * Generates CSV/MDB files compatible with DC series machines
 */

import { CuttingPlan, Cut, Profile } from '@/types/fabricator';
import { YilmazCutListData, YilmazExportOptions } from './YilmazCutListAdapter';

export interface DCCutListRow {
  rowNumber: number;
  profileCode: string;
  profileName: string;
  material: string;
  color: string;
  stockLength: number;
  cutLength: number;
  angle: number;
  quantity: number;
  leftAngle?: number;
  rightAngle?: number;
  barcode?: string;
  orderNumber: string;
  position?: string;
}

export class DCCutListGenerator {
  /**
   * Generate CSV file for DC series machines
   */
  generateCSV(
    data: YilmazCutListData,
    options: YilmazExportOptions
  ): string {
    const rows: DCCutListRow[] = this.prepareRows(data);
    const lines: string[] = [];

    // CSV Header
    const header = [
      'Row',
      'Profile Code',
      'Profile Name',
      'Material',
      'Color',
      'Stock Length (mm)',
      'Cut Length (mm)',
      'Angle',
      'Left Angle',
      'Right Angle',
      'Quantity',
      'Order Number',
      'Position',
      'Barcode'
    ];

    lines.push(this.formatCSVLine(header, options));

    // Data rows
    rows.forEach(row => {
      const line = [
        row.rowNumber.toString(),
        row.profileCode,
        row.profileName,
        row.material,
        row.color,
        row.stockLength.toString(),
        row.cutLength.toString(),
        row.angle.toString(),
        row.leftAngle?.toString() || '',
        row.rightAngle?.toString() || '',
        row.quantity.toString(),
        row.orderNumber,
        row.position || '',
        row.barcode || ''
      ];
      lines.push(this.formatCSVLine(line, options));
    });

    return lines.join('\n');
  }

  /**
   * Generate MDB (Access) file for DC series machines
   * Note: In a browser environment, this would typically use a library
   * or be handled server-side. This is a placeholder structure.
   */
  async generateMDB(
    data: YilmazCutListData,
    options: YilmazExportOptions
  ): Promise<Buffer> {
    const rows: DCCutListRow[] = this.prepareRows(data);
    
    // MDB structure for DC series
    const mdbStructure = {
      tableName: 'CutList',
      columns: [
        { name: 'Row', type: 'INTEGER' },
        { name: 'ProfileCode', type: 'TEXT' },
        { name: 'ProfileName', type: 'TEXT' },
        { name: 'Material', type: 'TEXT' },
        { name: 'Color', type: 'TEXT' },
        { name: 'StockLength', type: 'DOUBLE' },
        { name: 'CutLength', type: 'DOUBLE' },
        { name: 'Angle', type: 'DOUBLE' },
        { name: 'LeftAngle', type: 'DOUBLE' },
        { name: 'RightAngle', type: 'DOUBLE' },
        { name: 'Quantity', type: 'INTEGER' },
        { name: 'OrderNumber', type: 'TEXT' },
        { name: 'Position', type: 'TEXT' },
        { name: 'Barcode', type: 'TEXT' }
      ],
      rows: rows.map(row => ({
        Row: row.rowNumber,
        ProfileCode: row.profileCode,
        ProfileName: row.profileName,
        Material: row.material,
        Color: row.color,
        StockLength: row.stockLength,
        CutLength: row.cutLength,
        Angle: row.angle,
        LeftAngle: row.leftAngle || null,
        RightAngle: row.rightAngle || null,
        Quantity: row.quantity,
        OrderNumber: row.orderNumber,
        Position: row.position || null,
        Barcode: row.barcode || null
      }))
    };

    // In a real implementation, this would use a library like 'mdb-writer' or similar
    // For now, return a JSON representation that can be converted server-side
    const jsonData = JSON.stringify(mdbStructure);
    return Buffer.from(jsonData, 'utf8');
  }

  /**
   * Prepare rows from cutting plan data
   */
  private prepareRows(data: YilmazCutListData): DCCutListRow[] {
    const rows: DCCutListRow[] = [];
    let rowNumber = 1;

    data.cuttingPlans.forEach((plan, planIndex) => {
      const profile = plan.profile;
      
      // Group cuts by length and angle for quantity calculation
      const cutGroups = this.groupCuts(plan.cuts);

      cutGroups.forEach((group, groupIndex) => {
        const cut = group.cuts[0];
        const quantity = group.cuts.length;

        // Calculate mitre angles for DC series
        const { leftAngle, rightAngle } = this.calculateMitreAngles(cut.angle);

        rows.push({
          rowNumber: rowNumber++,
          profileCode: profile.id,
          profileName: profile.name,
          material: profile.material,
          color: profile.color,
          stockLength: plan.stockLength,
          cutLength: Math.round(cut.length),
          angle: cut.angle,
          leftAngle: leftAngle,
          rightAngle: rightAngle,
          quantity: quantity,
          orderNumber: data.orderNumber,
          position: `P${planIndex + 1}-${groupIndex + 1}`,
          barcode: options.includeBarcodes 
            ? this.generateBarcode(data.orderNumber, rowNumber - 1)
            : undefined
        });
      });
    });

    return rows;
  }

  /**
   * Group cuts by length and angle
   */
  private groupCuts(cuts: Cut[]): Array<{ cuts: Cut[]; length: number; angle: number }> {
    const groups = new Map<string, Cut[]>();
    const tolerance = 0.1; // 0.1mm tolerance for grouping

    cuts.forEach(cut => {
      // Round to nearest 0.1mm for grouping
      const roundedLength = Math.round(cut.length / tolerance) * tolerance;
      const key = `${roundedLength}_${cut.angle}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(cut);
    });

    return Array.from(groups.entries()).map(([key, cuts]) => {
      const [lengthStr] = key.split('_');
      return {
        cuts,
        length: parseFloat(lengthStr),
        angle: cuts[0].angle
      };
    });
  }

  /**
   * Calculate mitre angles for DC series saws
   * DC series uses left/right angle settings for mitre cuts
   */
  private calculateMitreAngles(angle: number): { leftAngle: number; rightAngle: number } {
    // For 90° cuts, no mitre needed
    if (angle === 90) {
      return { leftAngle: 0, rightAngle: 0 };
    }

    // For 45° cuts, standard mitre
    if (angle === 45) {
      return { leftAngle: 45, rightAngle: 45 };
    }

    // For other angles, calculate mitre settings
    // DC series typically uses complementary angles
    const mitreAngle = Math.abs(90 - angle);
    return {
      leftAngle: angle < 90 ? mitreAngle : -mitreAngle,
      rightAngle: angle < 90 ? -mitreAngle : mitreAngle
    };
  }

  /**
   * Generate barcode for cut item
   */
  private generateBarcode(orderNumber: string, rowNumber: number): string {
    // Format: ORD-{orderNumber}-{rowNumber}
    return `ORD-${orderNumber}-${rowNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Format CSV line with proper escaping and separator
   */
  private formatCSVLine(values: string[], options: YilmazExportOptions): string {
    const separator = options.decimalSeparator === ',' ? ';' : ',';
    
    return values.map(value => {
      // Escape quotes and wrap in quotes if contains separator or newline
      const escaped = value.replace(/"/g, '""');
      if (value.includes(separator) || value.includes('\n') || value.includes('"')) {
        return `"${escaped}"`;
      }
      return escaped;
    }).join(separator);
  }

  /**
   * Validate DC series specific constraints
   */
  validateForDC(cuttingPlans: CuttingPlan[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    cuttingPlans.forEach((plan, index) => {
      plan.cuts.forEach((cut, cutIndex) => {
        // DC series max cut length (typically 6500mm for DC 650)
        if (cut.length > 6500) {
          errors.push(
            `Plan ${index + 1}, Cut ${cutIndex + 1}: Length ${cut.length}mm exceeds DC series maximum (6500mm)`
          );
        }

        // DC series supported angles (typically 0°, 22.5°, 30°, 45°, 60°, 67.5°, 90°)
        const supportedAngles = [0, 22.5, 30, 45, 60, 67.5, 90];
        const roundedAngle = Math.round(cut.angle * 10) / 10;
        if (!supportedAngles.includes(roundedAngle)) {
          errors.push(
            `Plan ${index + 1}, Cut ${cutIndex + 1}: Angle ${cut.angle}° not supported by DC series`
          );
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

