/**
 * Yilmaz USB Bridge
 * USB file transfer automation for Yilmaz machines
 * Handles file transfer to USB-connected machines
 */

export interface USBTransferOptions {
  overwrite: boolean;
  verify: boolean;
  retryOnFailure: boolean;
  maxRetries: number;
}

export interface USBFileInfo {
  filename: string;
  size: number;
  modified: Date;
  type: 'csv' | 'mdb' | 'gcode' | 'other';
}

export interface USBDeviceInfo {
  deviceId: string;
  vendorId: string;
  productId: string;
  manufacturer: string;
  product: string;
  serialNumber?: string;
  mounted: boolean;
  mountPath?: string;
}

export class YilmazUSBBridge {
  private devices: Map<string, USBDeviceInfo> = new Map();
  private transferQueue: Array<{ file: File | Buffer; destination: string; options: USBTransferOptions }> = [];

  /**
   * Detect USB devices
   * Note: In browser environment, this uses Web USB API
   * In Node.js, this would use usb library
   */
  async detectDevices(): Promise<USBDeviceInfo[]> {
    try {
      // Web USB API (browser)
      if ('usb' in navigator) {
        const devices = await (navigator as any).usb.getDevices();
        return devices.map((device: any) => this.mapUSBDevice(device));
      }

      // Fallback: Return empty array if Web USB not available
      console.warn('Web USB API not available');
      return [];
    } catch (error) {
      console.error('Error detecting USB devices:', error);
      return [];
    }
  }

  /**
   * Request USB device access
   */
  async requestDeviceAccess(filters?: USBDeviceRequestOptions[]): Promise<USBDeviceInfo | null> {
    try {
      if ('usb' in navigator) {
        const device = await (navigator as any).usb.requestDevice({
          filters: filters || [
            { vendorId: 0x1234 }, // Yilmaz vendor ID (example)
            { classCode: 8 } // Mass storage class
          ]
        });

        const deviceInfo = this.mapUSBDevice(device);
        this.devices.set(deviceInfo.deviceId, deviceInfo);
        return deviceInfo;
      }

      return null;
    } catch (error) {
      console.error('Error requesting USB device access:', error);
      return null;
    }
  }

  /**
   * Transfer file to USB device
   */
  async transferFile(
    file: File | Buffer,
    destination: string,
    options: USBTransferOptions = {
      overwrite: true,
      verify: true,
      retryOnFailure: true,
      maxRetries: 3
    }
  ): Promise<boolean> {
    try {
      // In browser: Use File System Access API or download
      // In Node.js: Use fs to write to USB mount point

      if (file instanceof File) {
        return await this.transferFileBrowser(file, destination, options);
      } else {
        return await this.transferFileBuffer(file, destination, options);
      }
    } catch (error) {
      console.error('File transfer error:', error);
      
      if (options.retryOnFailure && options.maxRetries > 0) {
        return await this.retryTransfer(file, destination, {
          ...options,
          maxRetries: options.maxRetries - 1
        });
      }

      return false;
    }
  }

  /**
   * Transfer file in browser environment
   */
  private async transferFileBrowser(
    file: File,
    destination: string,
    options: USBTransferOptions
  ): Promise<boolean> {
    // Option 1: Use File System Access API
    if ('showSaveFilePicker' in window) {
      try {
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: destination,
          types: [{
            description: 'Cutting List Files',
            accept: {
              'text/csv': ['.csv'],
              'application/x-msaccess': ['.mdb']
            }
          }]
        });

        const writable = await fileHandle.createWritable();
        await writable.write(file);
        await writable.close();

        if (options.verify) {
          return await this.verifyFile(fileHandle, file);
        }

        return true;
      } catch (error) {
        console.error('File System Access API error:', error);
      }
    }

    // Option 2: Fallback to download
    return this.downloadFile(file, destination);
  }

  /**
   * Transfer file buffer (Node.js or server-side)
   */
  private async transferFileBuffer(
    buffer: Buffer,
    destination: string,
    options: USBTransferOptions
  ): Promise<boolean> {
    // This would use Node.js fs module in a server environment
    // For browser, we convert to File first
    const blob = new Blob([buffer]);
    const file = new File([blob], destination);
    return this.transferFileBrowser(file, destination, options);
  }

  /**
   * Download file as fallback
   */
  private downloadFile(file: File, filename: string): boolean {
    try {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('Download error:', error);
      return false;
    }
  }

  /**
   * Verify transferred file
   */
  private async verifyFile(fileHandle: any, originalFile: File): Promise<boolean> {
    try {
      const file = await fileHandle.getFile();
      return file.size === originalFile.size;
    } catch (error) {
      console.error('File verification error:', error);
      return false;
    }
  }

  /**
   * Retry file transfer
   */
  private async retryTransfer(
    file: File | Buffer,
    destination: string,
    options: USBTransferOptions
  ): Promise<boolean> {
    console.log(`Retrying file transfer (${options.maxRetries} attempts remaining)...`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    return this.transferFile(file, destination, options);
  }

  /**
   * List files on USB device
   */
  async listFiles(deviceId: string, _path: string = '/'): Promise<USBFileInfo[]> {
    // This would require file system access
    // In browser, limited by security restrictions
    // In Node.js, would use fs.readdir
    
    console.warn('File listing not fully supported in browser environment');
    return [];
  }

  /**
   * Delete file from USB device
   */
  async deleteFile(_deviceId: string, _filename: string): Promise<boolean> {
    // This would require file system access
    console.warn('File deletion not fully supported in browser environment');
    return false;
  }

  /**
   * Get USB device info
   */
  getDeviceInfo(deviceId: string): USBDeviceInfo | undefined {
    return this.devices.get(deviceId);
  }

  /**
   * Get all connected devices
   */
  getConnectedDevices(): USBDeviceInfo[] {
    return Array.from(this.devices.values());
  }

  /**
   * Map USB device to device info
   */
  private mapUSBDevice(device: any): USBDeviceInfo {
    return {
      deviceId: device.serialNumber || `${device.vendorId}-${device.productId}`,
      vendorId: `0x${device.vendorId.toString(16).padStart(4, '0')}`,
      productId: `0x${device.productId.toString(16).padStart(4, '0')}`,
      manufacturer: device.manufacturerName || 'Unknown',
      product: device.productName || 'Unknown',
      serialNumber: device.serialNumber,
      mounted: false,
      mountPath: undefined
    };
  }

  /**
   * Eject USB device
   */
  async ejectDevice(deviceId: string): Promise<boolean> {
    const device = this.devices.get(deviceId);
    if (!device) {
      return false;
    }

    try {
      // In browser: Close device connection
      // In Node.js: Unmount device
      this.devices.delete(deviceId);
      return true;
    } catch (error) {
      console.error('Error ejecting device:', error);
      return false;
    }
  }

  /**
   * Check if file exists on device
   */
  async fileExists(deviceId: string, filename: string): Promise<boolean> {
    const files = await this.listFiles(deviceId);
    return files.some(file => file.filename === filename);
  }

  /**
   * Get file info
   */
  async getFileInfo(deviceId: string, filename: string): Promise<USBFileInfo | null> {
    const files = await this.listFiles(deviceId);
    return files.find(file => file.filename === filename) || null;
  }
}

interface USBDeviceRequestOptions {
  vendorId?: number;
  productId?: number;
  classCode?: number;
  serialNumber?: string;
}

