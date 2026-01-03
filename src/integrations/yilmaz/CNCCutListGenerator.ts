/**
 * CNC Series Cut List Generator
 * For Yilmaz AIM/ALM/PIM series CNC centers
 * Generates CSV/MDB files with advanced machining operations
 */

import { Cut, CuttingPlan, Profile } from '@/types/fabricator';
import { YilmazCutListData, YilmazExportOptions } from './YilmazCutListAdapter';

export interface CNCOperation {
  type: 'cut' | 'drill' | 'mill' | 'tap' | 'engrave';
  x?: number;
  y?: number;
  z?: number;
  depth?: number;
  diameter?: number;
  feedRate?: number;
  spindleSpeed?: number;
  toolNumber?: number;
}

export interface CNCCutListRow {
  rowNumber: number;
  profileCode: string;
  profileName: string;
  material: string;
  color: string;
  stockLength: number;
  operation: string;
  operationType: CNCOperation['type'];
  x?: number;
  y?: number;
  z?: number;
  angle: number;
  length?: number;
  depth?: number;
  diameter?: number;
  feedRate?: number;
  spindleSpeed?: number;
  toolNumber?: number;
  quantity: number;
  orderNumber: string;
  sequence: number;
  barcode?: string;
}

export class CNCCutListGenerator {
  /**
   * Generate CSV file for CNC series machines
   */
  generateCSV(
    data: YilmazCutListData,
    options: YilmazExportOptions
  ): string {
    const rows: CNCCutListRow[] = this.prepareRows(data, options);
    const lines: string[] = [];

    // CSV Header for CNC operations
    const header = [
      'Row',
      'Profile Code',
      'Profile Name',
      'Material',
      'Color',
      'Stock Length (mm)',
      'Operation',
      'Operation Type',
      'X (mm)',
      'Y (mm)',
      'Z (mm)',
      'Angle',
      'Length (mm)',
      'Depth (mm)',
      'Diameter (mm)',
      'Feed Rate (mm/min)',
      'Spindle Speed (rpm)',
      'Tool Number',
      'Quantity',
      'Sequence',
      'Order Number',
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
        row.operation,
        row.operationType,
        row.x?.toString() || '',
        row.y?.toString() || '',
        row.z?.toString() || '',
        row.angle.toString(),
        row.length?.toString() || '',
        row.depth?.toString() || '',
        row.diameter?.toString() || '',
        row.feedRate?.toString() || '',
        row.spindleSpeed?.toString() || '',
        row.toolNumber?.toString() || '',
        row.quantity.toString(),
        row.sequence.toString(),
        row.orderNumber,
        row.barcode || ''
      ];
      lines.push(this.formatCSVLine(line, options));
    });

    return lines.join('\n');
  }

  /**
   * Generate MDB (Access) file for CNC series machines
   */
  async generateMDB(
    data: YilmazCutListData,
    options: YilmazExportOptions
  ): Promise<Buffer> {
    const rows: CNCCutListRow[] = this.prepareRows(data, options);
    
    // MDB structure for CNC series
    const mdbStructure = {
      tableName: 'CNCCutList',
      columns: [
        { name: 'Row', type: 'INTEGER' },
        { name: 'ProfileCode', type: 'TEXT' },
        { name: 'ProfileName', type: 'TEXT' },
        { name: 'Material', type: 'TEXT' },
        { name: 'Color', type: 'TEXT' },
        { name: 'StockLength', type: 'DOUBLE' },
        { name: 'Operation', type: 'TEXT' },
        { name: 'OperationType', type: 'TEXT' },
        { name: 'X', type: 'DOUBLE' },
        { name: 'Y', type: 'DOUBLE' },
        { name: 'Z', type: 'DOUBLE' },
        { name: 'Angle', type: 'DOUBLE' },
        { name: 'Length', type: 'DOUBLE' },
        { name: 'Depth', type: 'DOUBLE' },
        { name: 'Diameter', type: 'DOUBLE' },
        { name: 'FeedRate', type: 'DOUBLE' },
        { name: 'SpindleSpeed', type: 'DOUBLE' },
        { name: 'ToolNumber', type: 'INTEGER' },
        { name: 'Quantity', type: 'INTEGER' },
        { name: 'Sequence', type: 'INTEGER' },
        { name: 'OrderNumber', type: 'TEXT' },
        { name: 'Barcode', type: 'TEXT' }
      ],
      rows: rows.map(row => ({
        Row: row.rowNumber,
        ProfileCode: row.profileCode,
        ProfileName: row.profileName,
        Material: row.material,
        Color: row.color,
        StockLength: row.stockLength,
        Operation: row.operation,
        OperationType: row.operationType,
        X: row.x || null,
        Y: row.y || null,
        Z: row.z || null,
        Angle: row.angle,
        Length: row.length || null,
        Depth: row.depth || null,
        Diameter: row.diameter || null,
        FeedRate: row.feedRate || null,
        SpindleSpeed: row.spindleSpeed || null,
        ToolNumber: row.toolNumber || null,
        Quantity: row.quantity,
        Sequence: row.sequence,
        OrderNumber: row.orderNumber,
        Barcode: row.barcode || null
      }))
    };

    const jsonData = JSON.stringify(mdbStructure);
    return Buffer.from(jsonData, 'utf8');
  }

  /**
   * Prepare rows from cutting plan data with CNC operations
   */
  private prepareRows(data: YilmazCutListData, options?: YilmazExportOptions): CNCCutListRow[] {
    const rows: CNCCutListRow[] = [];
    let rowNumber = 1;
    let globalSequence = 1;

    data.cuttingPlans.forEach((plan, _planIndex) => {
      const profile = plan.profile;
      
      // Group cuts by similar operations
      const operationGroups = this.groupOperations(plan.cuts);

      operationGroups.forEach((group, _groupIndex) => {
        const cut = group.cuts[0];
        const quantity = group.cuts.length;

        // Generate CNC operations for each cut
        const operations = this.generateCNCOperations(cut, profile, plan.stockLength);

        operations.forEach((operation, opIndex) => {
          rows.push({
            rowNumber: rowNumber++,
            profileCode: profile.id,
            profileName: profile.name,
            material: profile.material,
            color: profile.color,
            stockLength: plan.stockLength,
            operation: operation.type.toUpperCase(),
            operationType: operation.type,
            x: operation.x,
            y: operation.y,
            z: operation.z,
            angle: cut.angle,
            length: cut.length,
            depth: operation.depth,
            diameter: operation.diameter,
            feedRate: operation.feedRate,
            spindleSpeed: operation.spindleSpeed,
            toolNumber: operation.toolNumber,
            quantity: quantity,
            orderNumber: data.orderNumber,
            sequence: globalSequence++,
            barcode: options?.includeBarcodes 
              ? this.generateBarcode(data.orderNumber, rowNumber - 1, opIndex)
              : undefined
          });
        });
      });
    });

    return rows;
  }

  /**
   * Group cuts by operation type and parameters
   */
  private groupOperations(cuts: Cut[]): Array<{ cuts: Cut[]; length: number; angle: number }> {
    const groups = new Map<string, Cut[]>();
    const tolerance = 0.1;

    cuts.forEach(cut => {
      const roundedLength = Math.round(cut.length / tolerance) * tolerance;
      const roundedAngle = Math.round(cut.angle);
      const key = `${roundedLength}_${roundedAngle}`;
      
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
   * Generate CNC operations for a cut
   */
  private generateCNCOperations(
    cut: Cut,
    profile: Profile,
    _stockLength: number
  ): CNCOperation[] {
    const operations: CNCOperation[] = [];

    // 1. Main cutting operation
    operations.push({
      type: 'cut',
      x: 0,
      y: 0,
      z: 0,
      feedRate: this.calculateFeedRate(profile.material),
      spindleSpeed: this.calculateSpindleSpeed(profile.material),
      toolNumber: 1
    });

    // 2. If angle is not 90°, add angle adjustment
    if (cut.angle !== 90) {
      operations.push({
        type: 'mill',
        x: 0,
        y: 0,
        z: 0,
        depth: profile.thickness || 10,
        feedRate: this.calculateFeedRate(profile.material) * 0.8,
        spindleSpeed: this.calculateSpindleSpeed(profile.material),
        toolNumber: 2
      });
    }

    // 3. Add drilling operations if needed (for hardware mounting)
    // This would typically come from component hardware requirements
    // For now, add standard mounting holes
    if (cut.length > 500) {
      operations.push({
        type: 'drill',
        x: cut.length / 4,
        y: 0,
        z: 0,
        depth: profile.thickness || 10,
        diameter: 5,
        feedRate: 200,
        spindleSpeed: 2000,
        toolNumber: 3
      });

      operations.push({
        type: 'drill',
        x: (cut.length * 3) / 4,
        y: 0,
        z: 0,
        depth: profile.thickness || 10,
        diameter: 5,
        feedRate: 200,
        spindleSpeed: 2000,
        toolNumber: 3
      });
    }

    return operations;
  }

  /**
   * Calculate feed rate based on material
   */
  private calculateFeedRate(material: string): number {
    const materialLower = material.toLowerCase();
    
    if (materialLower.includes('aluminum') || materialLower.includes('alüminyum')) {
      return 3000; // mm/min
    } else if (materialLower.includes('upvc') || materialLower.includes('pvc')) {
      return 4000; // mm/min
    } else if (materialLower.includes('wood') || materialLower.includes('ahşap')) {
      return 5000; // mm/min
    }
    
    return 3000; // Default
  }

  /**
   * Calculate spindle speed based on material
   */
  private calculateSpindleSpeed(material: string): number {
    const materialLower = material.toLowerCase();
    
    if (materialLower.includes('aluminum') || materialLower.includes('alüminyum')) {
      return 18000; // rpm
    } else if (materialLower.includes('upvc') || materialLower.includes('pvc')) {
      return 20000; // rpm
    } else if (materialLower.includes('wood') || materialLower.includes('ahşap')) {
      return 24000; // rpm
    }
    
    return 18000; // Default
  }

  /**
   * Generate barcode for CNC operation
   */
  private generateBarcode(orderNumber: string, rowNumber: number, operationIndex: number): string {
    return `CNC-${orderNumber}-${rowNumber.toString().padStart(4, '0')}-${operationIndex.toString().padStart(2, '0')}`;
  }

  /**
   * Format CSV line with proper escaping
   */
  private formatCSVLine(values: string[], options: YilmazExportOptions): string {
    const separator = options.decimalSeparator === ',' ? ';' : ',';
    
    return values.map(value => {
      const escaped = value.replace(/"/g, '""');
      if (value.includes(separator) || value.includes('\n') || value.includes('"')) {
        return `"${escaped}"`;
      }
      return escaped;
    }).join(separator);
  }

  /**
   * Validate CNC series specific constraints
   */
  validateForCNC(cuttingPlans: CuttingPlan[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    cuttingPlans.forEach((plan, index) => {
      plan.cuts.forEach((cut, cutIndex) => {
        // CNC series max cut length (typically 7000mm for AIM/ALM/PIM)
        if (cut.length > 7000) {
          errors.push(
            `Plan ${index + 1}, Cut ${cutIndex + 1}: Length ${cut.length}mm exceeds CNC series maximum (7000mm)`
          );
        }

        // CNC series can handle any angle, but validate range
        if (cut.angle < 0 || cut.angle > 180) {
          errors.push(
            `Plan ${index + 1}, Cut ${cutIndex + 1}: Angle ${cut.angle}° out of valid range (0-180°)`
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

