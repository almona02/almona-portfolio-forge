import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface UseClipboardOptions {
  /**
   * Time in milliseconds to show "copied" state
   * @default 2000
   */
  copiedDuration?: number;
  /**
   * Success message to show when copy succeeds
   * If not provided, uses default message
   */
  successMessage?: string;
  /**
   * Error message to show when copy fails
   * If not provided, uses default message
   */
  errorMessage?: string;
  /**
   * Label for the copied item (used in toast messages)
   * e.g., "quote number", "digital twin code"
   */
  label?: string;
}

export interface UseClipboardResult {
  /**
   * Copy text to clipboard
   */
  copyToClipboard: (text: string, label?: string) => Promise<boolean>;
  /**
   * Currently copied text (for visual feedback)
   */
  copiedText: string | null;
  /**
   * Whether a copy operation is in progress
   */
  isCopying: boolean;
  /**
   * Clear the copied state
   */
  clearCopied: () => void;
}

/**
 * React hook for copying text to clipboard with modern Clipboard API
 * Includes fallback support, toast notifications, and visual feedback
 * 
 * @param options - Configuration options
 * @returns Clipboard utilities and state
 * 
 * @example
 * ```tsx
 * const { copyToClipboard, copiedText, isCopying } = useClipboard({
 *   label: 'quote number',
 *   successMessage: 'Quote number copied!'
 * });
 * 
 * <button onClick={() => copyToClipboard(quoteNumber)}>
 *   {copiedText === quoteNumber ? <Check /> : <Copy />}
 * </button>
 * ```
 */
export function useClipboard(options: UseClipboardOptions = {}): UseClipboardResult {
  const {
    copiedDuration = 2000,
    successMessage,
    errorMessage,
    label = 'text'
  } = options;

  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);

  /**
   * Fallback method for older browsers
   */
  const fallbackCopyToClipboard = useCallback((text: string): boolean => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      return successful;
    } catch (error) {
      console.error('[Clipboard] Fallback copy failed:', error);
      return false;
    }
  }, []);

  /**
   * Copy text to clipboard using modern API with fallback
   */
  const copyToClipboard = useCallback(
    async (text: string, itemLabel?: string): Promise<boolean> => {
      if (!text) {
        toast.error('Nothing to copy');
        return false;
      }

      setIsCopying(true);
      const displayLabel = itemLabel || label;

      try {
        // Try modern Clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          
          // Success
          setCopiedText(text);
          setTimeout(() => setCopiedText(null), copiedDuration);
          
          const message = successMessage || `${displayLabel ? displayLabel.charAt(0).toUpperCase() + displayLabel.slice(1) : 'Text'} copied to clipboard`;
          toast.success(message);
          
          setIsCopying(false);
          return true;
        } else {
          // Fallback for older browsers
          const success = fallbackCopyToClipboard(text);
          
          if (success) {
            setCopiedText(text);
            setTimeout(() => setCopiedText(null), copiedDuration);
            
            const message = successMessage || `${displayLabel ? displayLabel.charAt(0).toUpperCase() + displayLabel.slice(1) : 'Text'} copied to clipboard`;
            toast.success(message);
            
            setIsCopying(false);
            return true;
          } else {
            throw new Error('Copy command failed');
          }
        }
      } catch (error) {
        console.error('[Clipboard] Copy failed:', error);
        
        const message = errorMessage || `Failed to copy ${displayLabel}. Please try again.`;
        toast.error(message);
        
        setIsCopying(false);
        return false;
      }
    },
    [copiedDuration, successMessage, errorMessage, label, fallbackCopyToClipboard]
  );

  const clearCopied = useCallback(() => {
    setCopiedText(null);
  }, []);

  return {
    copyToClipboard,
    copiedText,
    isCopying,
    clearCopied
  };
}

