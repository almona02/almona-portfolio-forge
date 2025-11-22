/**
 * QRBarcodeGenerator - QR Code and Barcode generation utilities
 * Week 3: Enterprise Automation & Customization
 * 
 * Provides QR code and barcode generation for all export formats
 */

import QRCode from 'qrcode';
import { QRCodeData, BarcodeData } from './types';

/**
 * QR Code generator for reports
 */
export class QRBarcodeGenerator {
  /**
   * Generate QR code as data URL
   */
  async generateQRCode(data: QRCodeData, options?: {
    width?: number;
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  }): Promise<string> {
    const {
      width = 200,
      margin = 2,
      errorCorrectionLevel = 'M'
    } = options || {};

    // Build QR code payload
    const payload = this.buildQRPayload(data);

    try {
      const dataUrl = await QRCode.toDataURL(payload, {
        width,
        margin,
        errorCorrectionLevel,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return dataUrl;
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      throw new Error('QR code generation failed');
    }
  }

  /**
   * Generate QR code as SVG string
   */
  async generateQRCodeSVG(data: QRCodeData, options?: {
    width?: number;
    margin?: number;
  }): Promise<string> {
    const {
      width = 200,
      margin = 2
    } = options || {};

    const payload = this.buildQRPayload(data);

    try {
      const svg = await QRCode.toString(payload, {
        type: 'svg',
        width,
        margin,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return svg;
    } catch (error) {
      console.error('Failed to generate QR code SVG:', error);
      throw new Error('QR code SVG generation failed');
    }
  }

  /**
   * Generate barcode data for component tracking
   */
  generateBarcodeData(barcodeData: BarcodeData): string {
    // Generate barcode string (Code128 format compatible)
    // Format: SKU|COMPONENT_ID|PART_NUMBER|MATERIAL|DIMENSIONS
    const parts = [
      barcodeData.sku,
      barcodeData.componentId,
      barcodeData.partNumber || '',
      barcodeData.material || '',
      barcodeData.dimensions || ''
    ].filter(Boolean);

    return parts.join('|');
  }

  /**
   * Generate barcode for printing (returns data for barcode library)
   */
  generateBarcodeForPrint(barcodeData: BarcodeData): {
    value: string;
    format: 'CODE128' | 'CODE39' | 'EAN13';
    displayValue?: boolean;
    width?: number;
    height?: number;
  } {
    const value = this.generateBarcodeData(barcodeData);

    return {
      value,
      format: 'CODE128',
      displayValue: true,
      width: 2,
      height: 100
    };
  }

  /**
   * Build QR code payload from data
   */
  private buildQRPayload(data: QRCodeData): string {
    // If URL is provided, use it directly
    if (data.url) {
      return data.url;
    }

    // Otherwise, build structured JSON payload
    const payload = {
      projectId: data.projectId,
      orderNumber: data.orderNumber,
      generatedAt: data.generatedAt.toISOString(),
      reportType: data.reportType,
      batchId: data.batchId,
      version: data.version || '1.0',
      // Add app URL for mobile scanning
      appUrl: `${window.location.origin}/projects/${data.projectId}`
    };

    return JSON.stringify(payload);
  }

  /**
   * Generate QR code for project access
   */
  async generateProjectQRCode(
    projectId: string,
    orderNumber: string,
    reportType: string = 'cutting_list',
    options?: {
      width?: number;
      includeBatchId?: string;
    }
  ): Promise<string> {
    const data: QRCodeData = {
      projectId,
      orderNumber,
      generatedAt: new Date(),
      reportType,
      batchId: options?.includeBatchId,
      url: `${window.location.origin}/projects/${projectId}`
    };

    return this.generateQRCode(data, { width: options?.width });
  }

  /**
   * Generate QR code for batch export
   */
  async generateBatchQRCode(
    batchId: string,
    projectIds: string[],
    options?: {
      width?: number;
    }
  ): Promise<string> {
    const data: QRCodeData = {
      projectId: projectIds[0] || '',
      orderNumber: `BATCH-${batchId}`,
      generatedAt: new Date(),
      reportType: 'batch_export',
      batchId,
      url: `${window.location.origin}/exports/batch/${batchId}`
    };

    return this.generateQRCode(data, { width: options?.width });
  }

  /**
   * Generate component barcode
   */
  generateComponentBarcode(
    componentId: string,
    sku: string,
    partNumber?: string,
    material?: string,
    dimensions?: string
  ): BarcodeData {
    return {
      sku,
      componentId,
      partNumber,
      material,
      dimensions
    };
  }

  /**
   * Parse QR code payload
   */
  parseQRPayload(payload: string): QRCodeData | null {
    try {
      // Try parsing as JSON first
      const data = JSON.parse(payload);

      return {
        projectId: data.projectId,
        orderNumber: data.orderNumber,
        generatedAt: new Date(data.generatedAt),
        reportType: data.reportType,
        batchId: data.batchId,
        version: data.version,
        url: data.appUrl || data.url
      };
    } catch {
      // If not JSON, treat as URL
      if (payload.startsWith('http://') || payload.startsWith('https://')) {
        // Extract project ID from URL if possible
        const match = payload.match(/\/projects\/([^\/]+)/);
        return {
          projectId: match ? match[1] : '',
          orderNumber: '',
          generatedAt: new Date(),
          reportType: 'unknown',
          url: payload
        };
      }

      return null;
    }
  }

  /**
   * Validate barcode format
   */
  validateBarcode(barcode: string): boolean {
    // Basic validation for Code128 format
    // Should contain alphanumeric characters and separators
    return /^[A-Z0-9|]+$/.test(barcode) && barcode.length > 0;
  }
}

// Export singleton instance
export const qrBarcodeGenerator = new QRBarcodeGenerator();

