/**
 * YilmazFileFormats — Downloadable File Generators
 *
 * Creates browser-downloadable Blob files for:
 *   - CNC program (.cnc) — G-code with Yilmaz-compatible naming
 *   - CSV Cut List (.csv)
 *   - MDB cut-list interchange (.mdb.json) — JSON table structure used by existing ALM paths
 *   - JSON Manifest (.json)
 *
 * Includes checksum computation and file naming conventions.
 * Real Jet/Access binary MDB and live-machine verification remain follow-ups.
 */

import type { YilmazMachineModel } from '@/integrations/yilmaz/YilmazGCodeGenerator';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExportFile {
  filename: string;
  content: string;
  mimeType: string;
  size: number;
  blob: Blob;
}

export interface ExportFileBundle {
  gcode: ExportFile | null;
  csv: ExportFile | null;
  mdb: ExportFile | null;
  manifest: ExportFile | null;
}

export interface BundleInput {
  gcode: string | null;
  csv: string | null;
  mdb: string | null;
  manifest: Record<string, unknown> | null;
  machineModel: YilmazMachineModel;
  orderNumber: string;
}

// ─── File Format Generators ──────────────────────────────────────────────────

export class YilmazFileFormats {
  /**
   * Create a complete file bundle from raw content strings.
   */
  static createBundle(input: BundleInput): ExportFileBundle {
    const timestamp = YilmazFileFormats.getTimestamp();
    const prefix = YilmazFileFormats.sanitizeFilename(input.orderNumber);

    return {
      gcode: input.gcode
        ? YilmazFileFormats.createGCodeFile(input.gcode, prefix, input.machineModel, timestamp)
        : null,
      csv: input.csv
        ? YilmazFileFormats.createCSVFile(input.csv, prefix, timestamp)
        : null,
      mdb: input.mdb
        ? YilmazFileFormats.createMDBFile(input.mdb, prefix, input.machineModel, timestamp)
        : null,
      manifest: input.manifest
        ? YilmazFileFormats.createManifestFile(input.manifest, prefix, timestamp)
        : null,
    };
  }

  /**
   * Create a CNC program file (.cnc) with Yilmaz-specific naming.
   * Content is ISO G-code; extension matches USB-transfer naming used on shop floor.
   */
  static createGCodeFile(
    content: string,
    prefix: string,
    machineModel: YilmazMachineModel,
    timestamp: string
  ): ExportFile {
    const filename = `${prefix}_${machineModel}_${timestamp}.cnc`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });

    return {
      filename,
      content,
      mimeType: 'text/plain',
      size: blob.size,
      blob,
    };
  }

  /**
   * Create a CSV cut list file.
   */
  static createCSVFile(content: string, prefix: string, timestamp: string): ExportFile {
    // Add BOM for Excel compatibility
    const bom = '\uFEFF';
    const fullContent = bom + content;
    const filename = `${prefix}_cutlist_${timestamp}.csv`;
    const blob = new Blob([fullContent], { type: 'text/csv;charset=utf-8' });

    return {
      filename,
      content: fullContent,
      mimeType: 'text/csv',
      size: blob.size,
      blob,
    };
  }

  /**
   * Create an MDB cut-list interchange file (.mdb.json).
   * Payload is the structured table JSON already produced by CNC/DC generators
   * (same interchange shape used by ALM 6510 export). Not a Jet binary engine file.
   */
  static createMDBFile(
    content: string,
    prefix: string,
    machineModel: YilmazMachineModel,
    timestamp: string
  ): ExportFile {
    const filename = `${prefix}_${machineModel}_${timestamp}.mdb.json`;
    const blob = new Blob([content], { type: 'application/json' });

    return {
      filename,
      content,
      mimeType: 'application/json',
      size: blob.size,
      blob,
    };
  }

  /**
   * Create a JSON manifest file with export metadata.
   */
  static createManifestFile(
    manifest: Record<string, unknown>,
    prefix: string,
    timestamp: string
  ): ExportFile {
    const content = JSON.stringify(manifest, null, 2);
    const filename = `${prefix}_manifest_${timestamp}.json`;
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });

    return {
      filename,
      content,
      mimeType: 'application/json',
      size: blob.size,
      blob,
    };
  }

  /**
   * Trigger browser download for a single file.
   */
  static downloadFile(file: ExportFile): void {
    const url = URL.createObjectURL(file.blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();

    // Cleanup
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(anchor);
    }, 100);
  }

  /**
   * Download all files in a bundle.
   */
  static downloadBundle(bundle: ExportFileBundle): void {
    const files = [bundle.gcode, bundle.csv, bundle.mdb, bundle.manifest].filter(
      (f): f is ExportFile => f !== null
    );

    // Stagger downloads to avoid browser blocking
    files.forEach((file, index) => {
      setTimeout(() => {
        YilmazFileFormats.downloadFile(file);
      }, index * 300);
    });
  }

  /**
   * Compute a simple CRC32-like checksum for content integrity.
   * Uses a fast hash suitable for file verification (not cryptographic).
   */
  static computeChecksum(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0; // Convert to 32-bit integer
    }
    // Convert to unsigned hex
    return (hash >>> 0).toString(16).padStart(8, '0').toUpperCase();
  }

  /**
   * Format file size for display.
   */
  static formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Decode Buffer / Uint8Array / string payloads from cut-list generators.
   */
  static utf8FromBinary(data: string | Uint8Array | ArrayBuffer): string {
    if (typeof data === 'string') return data;
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    return new TextDecoder().decode(bytes);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private static getTimestamp(): string {
    const now = new Date();
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      '_',
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
    ].join('');
  }

  private static sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
  }
}
