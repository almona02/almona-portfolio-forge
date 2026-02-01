/**
 * useBarcodeScanner Hook
 * 
 * Listens for barcode scanner input (rapid keystrokes ending in Enter)
 * and provides simulation capabilities for testing without physical scanner.
 * 
 * Typical barcode scanners act as keyboard devices that type the barcode
 * and press Enter very quickly (< 100ms between keystrokes).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface BarcodeScannerOptions {
  enabled?: boolean;
  minLength?: number;
  maxLength?: number;
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
}

interface BarcodeScannerHook {
  isScanning: boolean;
  lastScanned: string | null;
  simulateScan: (code: string) => void;
  buffer: string;
}

const SCAN_TIMEOUT = 100; // ms between keystrokes for scan detection
const MIN_BARCODE_LENGTH = 3;
const MAX_BARCODE_LENGTH = 50;

export function useBarcodeScanner({
  enabled = true,
  minLength = MIN_BARCODE_LENGTH,
  maxLength = MAX_BARCODE_LENGTH,
  onScan,
  onError,
}: BarcodeScannerOptions): BarcodeScannerHook {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [buffer, setBuffer] = useState('');
  
  const bufferRef = useRef('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastKeypressRef = useRef<number>(0);

  // Simulate a barcode scan (for testing)
  const simulateScan = useCallback((code: string) => {
    if (!enabled) {
      onError?.('Scanner is disabled');
      return;
    }

    if (code.length < minLength || code.length > maxLength) {
      onError?.(`Invalid barcode length: ${code.length}`);
      return;
    }

    setIsScanning(true);
    setLastScanned(code);
    onScan(code);
    
    // Reset scanning state after a brief moment
    setTimeout(() => setIsScanning(false), 500);
  }, [enabled, minLength, maxLength, onScan, onError]);

  // Handle actual keyboard events from barcode scanner
  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      // Ignore events from input fields (user typing)
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      const now = Date.now();
      const timeSinceLastKeypress = now - lastKeypressRef.current;

      // Enter key signifies end of barcode
      if (event.key === 'Enter') {
        event.preventDefault();
        
        const scannedCode = bufferRef.current.trim();
        
        // Validate barcode
        if (scannedCode.length < minLength) {
          onError?.(`Barcode too short: ${scannedCode.length} < ${minLength}`);
          bufferRef.current = '';
          setBuffer('');
          return;
        }

        if (scannedCode.length > maxLength) {
          onError?.(`Barcode too long: ${scannedCode.length} > ${maxLength}`);
          bufferRef.current = '';
          setBuffer('');
          return;
        }

        // Successful scan
        setIsScanning(true);
        setLastScanned(scannedCode);
        setBuffer('');
        onScan(scannedCode);
        
        // Clear buffer
        bufferRef.current = '';
        
        // Reset scanning state
        setTimeout(() => setIsScanning(false), 500);
        
        return;
      }

      // Detect rapid keystrokes (barcode scanner behavior)
      if (timeSinceLastKeypress < SCAN_TIMEOUT) {
        // Likely a barcode scanner
        if (event.key.length === 1) { // Single character keys
          bufferRef.current += event.key;
          setBuffer(bufferRef.current);
          event.preventDefault();
        }
      } else {
        // Too slow - likely human typing, reset buffer
        bufferRef.current = event.key.length === 1 ? event.key : '';
        setBuffer(bufferRef.current);
      }

      lastKeypressRef.current = now;

      // Auto-clear buffer after timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        bufferRef.current = '';
        setBuffer('');
      }, SCAN_TIMEOUT * 2);
    };

    window.addEventListener('keypress', handleKeyPress);

    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, minLength, maxLength, onScan, onError]);

  return {
    isScanning,
    lastScanned,
    simulateScan,
    buffer,
  };
}
