/**
 * Turkish Lira (TRY) Currency Calculator
 * Handles pricing, currency conversion, and Turkish tax calculations
 */

export interface CurrencyRate {
  from: string;
  to: string;
  rate: number;
  date: Date;
  source: string;
}

export interface TurkishTaxInfo {
  kdv: number; // KDV (VAT) rate
  otv?: number; // ÖTV (Special Consumption Tax) rate
  stopaj?: number; // Stopaj (Withholding Tax) rate
}

export interface PriceBreakdown {
  basePrice: number;
  kdv: number;
  otv?: number;
  stopaj?: number;
  total: number;
  currency: string;
}

export class TRYCurrencyCalculator {
  private exchangeRates: Map<string, CurrencyRate> = new Map();
  private defaultTaxInfo: TurkishTaxInfo = {
    kdv: 0.20, // 20% KDV (standard rate)
    otv: 0, // ÖTV varies by product
    stopaj: 0 // Stopaj varies
  };

  constructor() {
    this.initializeExchangeRates();
  }

  /**
   * Initialize default exchange rates
   */
  private initializeExchangeRates(): void {
    // These would typically be fetched from an API
    const rates: CurrencyRate[] = [
      {
        from: 'USD',
        to: 'TRY',
        rate: 30.50, // Example rate
        date: new Date(),
        source: 'TCMB' // Turkish Central Bank
      },
      {
        from: 'EUR',
        to: 'TRY',
        rate: 33.20, // Example rate
        date: new Date(),
        source: 'TCMB'
      },
      {
        from: 'GBP',
        to: 'TRY',
        rate: 38.80, // Example rate
        date: new Date(),
        source: 'TCMB'
      }
    ];

    rates.forEach(rate => {
      const key = `${rate.from}_${rate.to}`;
      this.exchangeRates.set(key, rate);
    });
  }

  /**
   * Convert currency to Turkish Lira
   */
  convertToTRY(
    amount: number,
    fromCurrency: string,
    date?: Date
  ): number {
    if (fromCurrency === 'TRY') {
      return amount;
    }

    const rate = this.getExchangeRate(fromCurrency, 'TRY', date);
    return amount * rate;
  }

  /**
   * Convert from Turkish Lira to another currency
   */
  convertFromTRY(
    amount: number,
    toCurrency: string,
    date?: Date
  ): number {
    if (toCurrency === 'TRY') {
      return amount;
    }

    const rate = this.getExchangeRate('TRY', toCurrency, date);
    return amount * rate;
  }

  /**
   * Get exchange rate
   */
  getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    date?: Date
  ): number {
    if (fromCurrency === toCurrency) {
      return 1;
    }

    const key = `${fromCurrency}_${toCurrency}`;
    const rate = this.exchangeRates.get(key);

    if (!rate) {
      // Try reverse rate
      const reverseKey = `${toCurrency}_${fromCurrency}`;
      const reverseRate = this.exchangeRates.get(reverseKey);
      if (reverseRate) {
        return 1 / reverseRate.rate;
      }

      throw new Error(`Exchange rate not found: ${fromCurrency} to ${toCurrency}`);
    }

    return rate.rate;
  }

  /**
   * Update exchange rate
   */
  updateExchangeRate(rate: CurrencyRate): void {
    const key = `${rate.from}_${rate.to}`;
    this.exchangeRates.set(key, rate);
  }

  /**
   * Calculate price with Turkish taxes
   */
  calculatePriceWithTax(
    basePrice: number,
    currency: string = 'TRY',
    taxInfo?: Partial<TurkishTaxInfo>
  ): PriceBreakdown {
    // Convert to TRY if needed
    const basePriceTRY = currency === 'TRY' 
      ? basePrice 
      : this.convertToTRY(basePrice, currency);

    const taxes = { ...this.defaultTaxInfo, ...taxInfo };

    // Calculate KDV (VAT)
    const kdv = basePriceTRY * taxes.kdv;

    // Calculate ÖTV if applicable
    const otv = taxes.otv ? basePriceTRY * taxes.otv : 0;

    // Calculate Stopaj if applicable
    const stopaj = taxes.stopaj ? basePriceTRY * taxes.stopaj : 0;

    // Total price
    const total = basePriceTRY + kdv + otv + stopaj;

    return {
      basePrice: this.round(basePriceTRY, 2),
      kdv: this.round(kdv, 2),
      otv: taxes.otv ? this.round(otv, 2) : undefined,
      stopaj: taxes.stopaj ? this.round(stopaj, 2) : undefined,
      total: this.round(total, 2),
      currency: 'TRY'
    };
  }

  /**
   * Calculate price breakdown for multiple items
   */
  calculateBulkPrice(
    items: Array<{ price: number; quantity: number; currency?: string; taxInfo?: Partial<TurkishTaxInfo> }>,
    currency: string = 'TRY'
  ): PriceBreakdown {
    let totalBase = 0;
    let totalKDV = 0;
    let totalOTV = 0;
    let totalStopaj = 0;

    items.forEach(item => {
      const itemCurrency = item.currency || currency;
      const itemPriceTRY = itemCurrency === 'TRY' 
        ? item.price 
        : this.convertToTRY(item.price, itemCurrency);

      const itemTotal = itemPriceTRY * item.quantity;
      totalBase += itemTotal;

      const taxes = { ...this.defaultTaxInfo, ...item.taxInfo };
      totalKDV += itemTotal * taxes.kdv;
      if (taxes.otv) {
        totalOTV += itemTotal * taxes.otv;
      }
      if (taxes.stopaj) {
        totalStopaj += itemTotal * taxes.stopaj;
      }
    });

    return {
      basePrice: this.round(totalBase, 2),
      kdv: this.round(totalKDV, 2),
      otv: totalOTV > 0 ? this.round(totalOTV, 2) : undefined,
      stopaj: totalStopaj > 0 ? this.round(totalStopaj, 2) : undefined,
      total: this.round(totalBase + totalKDV + totalOTV + totalStopaj, 2),
      currency: 'TRY'
    };
  }

  /**
   * Format price in Turkish Lira
   */
  formatTRY(amount: number, includeCurrency: boolean = true): string {
    const formatted = new Intl.NumberFormat('tr-TR', {
      style: includeCurrency ? 'currency' : 'decimal',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);

    return formatted;
  }

  /**
   * Format price breakdown
   */
  formatPriceBreakdown(breakdown: PriceBreakdown): string {
    const lines: string[] = [];

    lines.push(`Base Price: ${this.formatTRY(breakdown.basePrice)}`);
    lines.push(`KDV (${(this.defaultTaxInfo.kdv * 100).toFixed(0)}%): ${this.formatTRY(breakdown.kdv)}`);

    if (breakdown.otv) {
      lines.push(`ÖTV: ${this.formatTRY(breakdown.otv)}`);
    }

    if (breakdown.stopaj) {
      lines.push(`Stopaj: ${this.formatTRY(breakdown.stopaj)}`);
    }

    lines.push(`Total: ${this.formatTRY(breakdown.total)}`);

    return lines.join('\n');
  }

  /**
   * Calculate discount
   */
  calculateDiscount(
    price: number,
    discountPercent: number,
    currency: string = 'TRY'
  ): { original: number; discount: number; final: number; currency: string } {
    const original = currency === 'TRY' ? price : this.convertToTRY(price, currency);
    const discount = original * (discountPercent / 100);
    const final = original - discount;

    return {
      original: this.round(original, 2),
      discount: this.round(discount, 2),
      final: this.round(final, 2),
      currency: 'TRY'
    };
  }

  /**
   * Calculate installment payment
   */
  calculateInstallment(
    totalAmount: number,
    numberOfInstallments: number,
    interestRate: number = 0
  ): { installmentAmount: number; totalInterest: number; totalAmount: number } {
    if (numberOfInstallments <= 0) {
      throw new Error('Number of installments must be greater than 0');
    }

    if (interestRate === 0) {
      const installmentAmount = totalAmount / numberOfInstallments;
      return {
        installmentAmount: this.round(installmentAmount, 2),
        totalInterest: 0,
        totalAmount: this.round(totalAmount, 2)
      };
    }

    // Calculate with interest (simple interest formula)
    const monthlyRate = interestRate / 100 / 12;
    const installmentAmount = (totalAmount * monthlyRate * Math.pow(1 + monthlyRate, numberOfInstallments)) /
      (Math.pow(1 + monthlyRate, numberOfInstallments) - 1);

    const totalInterest = (installmentAmount * numberOfInstallments) - totalAmount;

    return {
      installmentAmount: this.round(installmentAmount, 2),
      totalInterest: this.round(totalInterest, 2),
      totalAmount: this.round(totalAmount + totalInterest, 2)
    };
  }

  /**
   * Round to specified decimal places
   */
  private round(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  /**
   * Get tax info for specific product category
   */
  getTaxInfoForCategory(category: string): TurkishTaxInfo {
    // Different categories may have different tax rates
    const categoryTaxes: Record<string, TurkishTaxInfo> = {
      'aluminum': {
        kdv: 0.20,
        otv: 0,
        stopaj: 0
      },
      'upvc': {
        kdv: 0.20,
        otv: 0,
        stopaj: 0
      },
      'hardware': {
        kdv: 0.20,
        otv: 0,
        stopaj: 0.02 // 2% stopaj for hardware
      },
      'glass': {
        kdv: 0.20,
        otv: 0,
        stopaj: 0
      }
    };

    return categoryTaxes[category.toLowerCase()] || this.defaultTaxInfo;
  }

  /**
   * Fetch latest exchange rates (would call API in real implementation)
   */
  async fetchLatestRates(): Promise<void> {
    // In a real implementation, this would fetch from TCMB API or similar
    console.log('Fetching latest exchange rates...');
    // Placeholder - would make API call here
  }
}

