/**
 * ALMONA COMMERCIAL ENGINE - PRECISE MONEY TYPES
 * 
 * Implements strict Integer Math for all financial calculations.
 * Stores values in minor units (e.g., cents) to avoid floating point errors.
 * 
 * Constitutional: Deterministic pricing, 100% precision.
 */

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'TRY' | 'SAR' | 'AED' | 'EGP';

export class Money {
  // Value stored in minor units (cents, kurus, etc.)
  // e.g., $10.99 -> 1099
  private readonly _amount: number;
  private readonly _currency: CurrencyCode;

  private constructor(minorAmount: number, currency: CurrencyCode = 'EGP') {
    if (!Number.isInteger(minorAmount)) {
        // Auto-correct floating point inputs if they are close to integer (handling JS weirdness)
        // strict mode should throw, but lenient mode rounds.
        this._amount = Math.round(minorAmount);
    } else {
        this._amount = minorAmount;
    }
    this._currency = currency;
  }

  /**
   * Creates a Money instance from a major unit amount (e.g., 10.99)
   */
  static fromMajor(amount: number, currency: CurrencyCode = 'EGP'): Money {
    return new Money(Math.round(amount * 100), currency);
  }

  /**
   * Creates a Money instance from a minor unit amount (e.g., 1099 for $10.99)
   */
  static fromMinor(amount: number, currency: CurrencyCode = 'EGP'): Money {
    return new Money(amount, currency);
  }

  /**
   * Returns a zero value money object
   */
  static zero(currency: CurrencyCode = 'EGP'): Money {
    return new Money(0, currency);
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): CurrencyCode {
    return this._currency;
  }

  /**
   * Adds another Money object
   */
  add(other: Money): Money {
    this.checkCurrency(other);
    return new Money(this._amount + other._amount, this._currency);
  }

  /**
   * Subtracts another Money object
   */
  subtract(other: Money): Money {
    this.checkCurrency(other);
    return new Money(this._amount - other._amount, this._currency);
  }

  /**
   * Multiplies by a scalar factor
   */
  multiply(factor: number): Money {
    return new Money(Math.round(this._amount * factor), this._currency);
  }

  /**
   * Divides by a scalar factor
   */
  divide(divisor: number): Money {
    return new Money(Math.round(this._amount / divisor), this._currency);
  }

  /**
   * Converts to major unit number (e.g. 10.99) - usage for UI only
   */
  toMajor(): number {
    return this._amount / 100;
  }

  /**
   * Formats the value as a localized string
   */
  format(locale: string = 'en-US'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this._currency
    }).format(this.toMajor());
  }

  private checkCurrency(other: Money) {
    if (this._currency !== other._currency) {
      throw new Error(`Currency Mismatch: Cannot operate on ${this._currency} and ${other._currency}`);
    }
  }

  // Value Object equality
  equals(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }
}
