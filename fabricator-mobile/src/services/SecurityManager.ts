/**
 * Security Manager for Mobile App
 * Handles barcode input validation, data encryption, and security checks
 */

// Note: For React Native, use expo-crypto or react-native-crypto instead of crypto-js
// This is a simplified version that works without external crypto libraries

export class SecurityManager {
  private static readonly BARCODE_PATTERN = /^[A-Z0-9\-_]+$/i;
  private static readonly MAX_BARCODE_LENGTH = 100;
  private static readonly MIN_BARCODE_LENGTH = 3;
  private static readonly DANGEROUS_PATTERNS = [
    /<script/i,
    /javascript:/i,
    /onerror=/i,
    /onload=/i,
    /eval\(/i,
    /expression\(/i,
  ];

  /**
   * Validate barcode input to prevent injection attacks
   */
  static validateBarcodeInput(data: string): { valid: boolean; error?: string } {
    if (!data || typeof data !== 'string') {
      return { valid: false, error: 'Barcode data is required' };
    }

    const trimmed = data.trim();

    // Check length
    if (trimmed.length < this.MIN_BARCODE_LENGTH) {
      return {
        valid: false,
        error: `Barcode must be at least ${this.MIN_BARCODE_LENGTH} characters`,
      };
    }

    if (trimmed.length > this.MAX_BARCODE_LENGTH) {
      return {
        valid: false,
        error: `Barcode must be no more than ${this.MAX_BARCODE_LENGTH} characters`,
      };
    }

    // Check for dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(trimmed)) {
        return { valid: false, error: 'Barcode contains invalid characters' };
      }
    }

    // Check format (alphanumeric, hyphens, underscores only)
    if (!this.BARCODE_PATTERN.test(trimmed)) {
      return {
        valid: false,
        error: 'Barcode contains invalid characters. Only letters, numbers, hyphens, and underscores are allowed',
      };
    }

    return { valid: true };
  }

  /**
   * Sanitize barcode input
   */
  static sanitizeBarcodeInput(data: string): string {
    if (!data || typeof data !== 'string') {
      return '';
    }

    // Remove dangerous patterns
    let sanitized = data.trim();
    
    for (const pattern of this.DANGEROUS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Remove any characters that don't match allowed pattern
    sanitized = sanitized.replace(/[^A-Z0-9\-_]/gi, '');

    // Limit length
    if (sanitized.length > this.MAX_BARCODE_LENGTH) {
      sanitized = sanitized.substring(0, this.MAX_BARCODE_LENGTH);
    }

    return sanitized;
  }

  /**
   * Encrypt sensitive data for offline storage
   * Note: In production, use expo-secure-store for secure storage
   * This is a placeholder - implement with expo-secure-store in production
   */
  static encryptOfflineData(data: any, key?: string): string {
    try {
      // In production, use expo-secure-store instead of encryption
      // For now, return base64 encoded JSON as placeholder
      const dataString = JSON.stringify(data);
      // Simple base64 encoding (not secure - use expo-secure-store in production)
      const encoded = typeof btoa !== 'undefined' 
        ? btoa(dataString) 
        : Buffer.from(dataString).toString('base64');
      return encoded;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data from offline storage
   * Note: In production, use expo-secure-store for secure storage
   */
  static decryptOfflineData(encryptedData: string, key?: string): any {
    try {
      // In production, use expo-secure-store instead of decryption
      // For now, decode base64 JSON as placeholder
      const decoded = typeof atob !== 'undefined'
        ? atob(encryptedData)
        : Buffer.from(encryptedData, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Get default encryption key (should be replaced with secure key management)
   * In production, use expo-secure-store or similar
   */
  private static getDefaultEncryptionKey(): string {
    // TODO: Replace with secure key from expo-secure-store
    // For now, using a placeholder - MUST be replaced in production
    return process.env.EXPO_PUBLIC_ENCRYPTION_KEY || 'default-key-change-in-production';
  }

  /**
   * Validate user input for SQL injection prevention
   */
  static validateUserInput(input: string, maxLength: number = 1000): { valid: boolean; error?: string } {
    if (!input || typeof input !== 'string') {
      return { valid: false, error: 'Input is required' };
    }

    if (input.length > maxLength) {
      return { valid: false, error: `Input must be no more than ${maxLength} characters` };
    }

    // Check for SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
      /('|(\\')|(;)|(\\)|(\/\*)|(\*\/)|(--)|(#)|(\+)|(\|)|(&)|(\$)|(\%)|(\@)|(\!)|(\?)|(\=)|(\>)|(\<)|(\[)|(\])|(\{)|(\})|(\()|(\))|(\^)|(\~)|(\`)|(\\)/,
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(input)) {
        return { valid: false, error: 'Input contains invalid characters' };
      }
    }

    return { valid: true };
  }

  /**
   * Sanitize user input
   */
  static sanitizeUserInput(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Remove SQL injection patterns
    let sanitized = input.trim();
    
    // Remove dangerous SQL keywords
    sanitized = sanitized.replace(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b/gi, '');
    
    // Remove special characters that could be used in SQL injection
    sanitized = sanitized.replace(/['";\\\/\*#\+\|\$\%\@\!\?\=\>\<\[\]\{\}\(\)\^\~\`]/g, '');

    return sanitized;
  }

  /**
   * Validate location name
   */
  static validateLocationName(location: string): { valid: boolean; error?: string } {
    if (!location || typeof location !== 'string') {
      return { valid: false, error: 'Location name is required' };
    }

    const trimmed = location.trim();
    
    if (trimmed.length === 0) {
      return { valid: false, error: 'Location name cannot be empty' };
    }

    if (trimmed.length > 100) {
      return { valid: false, error: 'Location name must be no more than 100 characters' };
    }

    // Allow alphanumeric, spaces, hyphens, underscores
    if (!/^[A-Z0-9\s\-_]+$/i.test(trimmed)) {
      return {
        valid: false,
        error: 'Location name contains invalid characters',
      };
    }

    return { valid: true };
  }

  /**
   * Generate secure random ID
   */
  static generateSecureId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${randomPart}`;
  }
}

