
import type { CutItem } from './CutListGenerator';

export class MachineExportService {
  
  /**
   * Generates a CSV string compatible with Yilmaz DC 421 / DC 550 machines.
   * Format: ProfileCode, Length, Quantity, AngleLeft, AngleRight
   */
  public static generateYilmazCSV(cutList: CutItem[]): string {
    // Exact Column Schema based on user's 550PB Template
    const headers = [
      'PROGRAM_NO', 'CUSTOMER_CODE', 'CUSTOMER_NAME', 'STOCK_CODE', 'STOCK_NAME',
      'ORDER_NO', 'EXPLANATION1', 'EXPLANATION2', 'LENGTH', 'INC_MM',
      'PRINT_X', 'PRINT_Y', 'HEAT_NO', 'TROLLEY', 'UNIT',
      'LEFT_ANGAT', 'RIGHT_ANGAT', 'CUT', 'CUTTED', 'RIGHT', 'METER', 'LEFT', 'BAR'
    ];
    
    // Delimiter: Semicolon (;)
    let csv = headers.join(';') + '\n';

    cutList.forEach((item, index) => {
      // Map data to the exact schema
      // Defaulting unknown values to empty strings or defaults
      const row = {
        PROGRAM_NO: (index + 1).toString(),     // Simple auto-increment
        CUSTOMER_CODE: 'ALMONA',                // Default Project ID
        CUSTOMER_NAME: 'Client',
        STOCK_CODE: item.profileCode,           // Critical: Profile ID
        STOCK_NAME: item.profileName,           // Description
        ORDER_NO: new Date().toLocaleDateString().replace(/\//g, ''), // Date as Order ID
        EXPLANATION1: '',
        EXPLANATION2: '',
        LENGTH: Math.round(item.lengthMm).toString(), // Critical: Length
        INC_MM: '0', 
        PRINT_X: '',
        PRINT_Y: '',
        HEAT_NO: '',
        TROLLEY: '',
        UNIT: 'ADET',                           // "Pcs" in Turkish context
        LEFT_ANGAT: item.angles.left.toString(),  // Critical: Left Angle
        RIGHT_ANGAT: item.angles.right.toString(), // Critical: Right Angle
        CUT: '0',
        CUTTED: '0',
        RIGHT: '0',
        METER: '0',
        LEFT: '0',
        BAR: '0'
      };

      // Ensure exact order
      const line = headers.map(h => row[h as keyof typeof row] || '').join(';');
      csv += line + '\n';
    });

    return csv;
  }

  /**
   * Browser-side download trigger for the CSV file.
   */
  public static downloadCSV(content: string, filename: string = 'cut_list.csv') {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}
