/**
 * Barcode Label Generator
 * For Yilmaz DC 550 PB integration
 * Generates barcode labels for cut pieces
 */

import { CuttingPlan, Cut } from '@/types/fabricator';

export interface BarcodeLabel {
  barcode: string;
  orderNumber: string;
  profileName: string;
  cutLength: number;
  angle: number;
  quantity: number;
  position?: string;
  qrCode?: string;
  labelFormat: 'code128' | 'code39' | 'ean13' | 'qr';
}

export interface BarcodeLabelOptions {
  format: 'code128' | 'code39' | 'ean13' | 'qr';
  includeQR: boolean;
  labelSize: 'small' | 'medium' | 'large';
  includeMetadata: boolean;
  language: 'en' | 'tr'; // English or Turkish
}

export class BarcodeLabelGenerator {
  /**
   * Generate barcode labels for a cutting plan
   */
  generateLabels(
    cuttingPlans: CuttingPlan[],
    orderNumber: string,
    options: BarcodeLabelOptions
  ): BarcodeLabel[] {
    const labels: BarcodeLabel[] = [];
    let labelIndex = 1;

    cuttingPlans.forEach((plan, planIndex) => {
      // Group cuts by length and angle
      const cutGroups = this.groupCuts(plan.cuts);

      cutGroups.forEach((group, groupIndex) => {
        const cut = group.cuts[0];
        const quantity = group.cuts.length;

        const barcode = this.generateBarcode(
          orderNumber,
          planIndex + 1,
          groupIndex + 1,
          options.format
        );

        const label: BarcodeLabel = {
          barcode,
          orderNumber,
          profileName: plan.profile.name,
          cutLength: Math.round(cut.length),
          angle: cut.angle,
          quantity,
          position: `P${planIndex + 1}-${groupIndex + 1}`,
          labelFormat: options.format,
          qrCode: options.includeQR
            ? this.generateQRCode(barcode, orderNumber, cut.length, cut.angle)
            : undefined
        };

        // Generate one label per quantity
        for (let i = 0; i < quantity; i++) {
          labels.push({ ...label });
          labelIndex++;
        }
      });
    });

    return labels;
  }

  /**
   * Generate barcode string
   */
  private generateBarcode(
    orderNumber: string,
    planIndex: number,
    groupIndex: number,
    format: BarcodeLabelOptions['format']
  ): string {
    const baseCode = `${orderNumber}-${planIndex.toString().padStart(2, '0')}-${groupIndex.toString().padStart(3, '0')}`;

    switch (format) {
      case 'code128':
        // Code 128 format: Start code + data + check digit + stop code
        return `*${baseCode}*`;
      
      case 'code39':
        // Code 39 format: * (start) + data + * (stop)
        return `*${baseCode}*`;
      
      case 'ean13':
        // EAN-13 format: 13 digits with check digit
        const numeric = baseCode.replace(/\D/g, '').padStart(12, '0');
        const checkDigit = this.calculateEAN13CheckDigit(numeric);
        return `${numeric}${checkDigit}`;
      
      case 'qr':
        return baseCode;
      
      default:
        return baseCode;
    }
  }

  /**
   * Calculate EAN-13 check digit
   */
  private calculateEAN13CheckDigit(numeric: string): number {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(numeric[i]);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const remainder = sum % 10;
    return remainder === 0 ? 0 : 10 - remainder;
  }

  /**
   * Generate QR code data
   */
  private generateQRCode(
    barcode: string,
    orderNumber: string,
    length: number,
    angle: number
  ): string {
    // QR code contains JSON data
    const qrData = {
      barcode,
      order: orderNumber,
      length: Math.round(length),
      angle: Math.round(angle),
      timestamp: new Date().toISOString()
    };
    return JSON.stringify(qrData);
  }

  /**
   * Group cuts by length and angle
   */
  private groupCuts(cuts: Cut[]): Array<{ cuts: Cut[]; length: number; angle: number }> {
    const groups = new Map<string, Cut[]>();
    const tolerance = 0.1;

    cuts.forEach(cut => {
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
   * Generate label data for printing
   * Returns data structure compatible with label printer APIs
   */
  generateLabelData(
    label: BarcodeLabel,
    options: BarcodeLabelOptions
  ): {
    barcode: string;
    text: string[];
    qrCode?: string;
    format: string;
    size: string;
  } {
    const text: string[] = [];

    if (options.language === 'tr') {
      text.push(`Sipariş: ${label.orderNumber}`);
      text.push(`Profil: ${label.profileName}`);
      text.push(`Uzunluk: ${label.cutLength}mm`);
      text.push(`Açı: ${label.angle}°`);
      text.push(`Adet: ${label.quantity}`);
      if (label.position) {
        text.push(`Pozisyon: ${label.position}`);
      }
    } else {
      text.push(`Order: ${label.orderNumber}`);
      text.push(`Profile: ${label.profileName}`);
      text.push(`Length: ${label.cutLength}mm`);
      text.push(`Angle: ${label.angle}°`);
      text.push(`Qty: ${label.quantity}`);
      if (label.position) {
        text.push(`Position: ${label.position}`);
      }
    }

    return {
      barcode: label.barcode,
      text,
      qrCode: label.qrCode,
      format: label.labelFormat,
      size: options.labelSize
    };
  }

  /**
   * Generate ZPL (Zebra Programming Language) format for Zebra printers
   */
  generateZPL(
    label: BarcodeLabel,
    options: BarcodeLabelOptions
  ): string {
    const labelData = this.generateLabelData(label, options);
    const { barcode, text, qrCode, size } = labelData;

    // ZPL commands
    let zpl = '^XA'; // Start of label
    
    // Set label size
    const dimensions = {
      small: { width: 200, height: 100 },
      medium: { width: 300, height: 150 },
      large: { width: 400, height: 200 }
    };
    const dim = dimensions[size];
    zpl += `^PW${dim.width}`;
    zpl += `^LL${dim.height}`;

    let yPos = 20;

    // Barcode
    if (label.labelFormat === 'qr' && qrCode) {
      zpl += `^FO20,${yPos}^BQN,2,4^FD${qrCode}^FS`;
      yPos += 80;
    } else {
      zpl += `^FO20,${yPos}^BY2^BCN,50,Y,N,N^FD${barcode}^FS`;
      yPos += 60;
    }

    // Text lines
    text.forEach((line, index) => {
      zpl += `^FO20,${yPos}^A0N,20,20^FD${line}^FS`;
      yPos += 25;
    });

    zpl += '^XZ'; // End of label

    return zpl;
  }

  /**
   * Generate EPL (Eltron Programming Language) format for Epson printers
   */
  generateEPL(
    label: BarcodeLabel,
    options: BarcodeLabelOptions
  ): string {
    const labelData = this.generateLabelData(label, options);
    const { barcode, text } = labelData;

    let epl = 'N\n'; // Initialize printer
    
    // Set label size
    epl += 'q609\n'; // Label width
    epl += 'Q203,26\n'; // Label height and gap
    epl += 'D11\n'; // Density

    let yPos = 20;

    // Barcode
    epl += `B20,${yPos},0,1,1,2,0,${barcode}\n`;
    yPos += 60;

    // Text lines
    text.forEach((line) => {
      epl += `A${yPos},0,0,1,1,1,N,"${line}"\n`;
      yPos += 25;
    });

    epl += 'P1\n'; // Print 1 copy

    return epl;
  }

  /**
   * Validate barcode format
   */
  validateBarcode(barcode: string, format: BarcodeLabelOptions['format']): boolean {
    switch (format) {
      case 'code128':
        return /^\*[A-Z0-9\-]+\*$/.test(barcode);
      
      case 'code39':
        return /^\*[A-Z0-9\-$%+.\/ ]+\*$/.test(barcode);
      
      case 'ean13':
        return /^\d{13}$/.test(barcode);
      
      case 'qr':
        return barcode.length > 0;
      
      default:
        return false;
    }
  }
}

