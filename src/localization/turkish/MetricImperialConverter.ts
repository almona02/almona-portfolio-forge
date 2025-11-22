/**
 * Metric Imperial Converter
 * Egyptian market requirements - handles both metric and imperial units
 * Converts between mm, cm, m, inches, feet for cutting lists
 */

export type MetricUnit = 'mm' | 'cm' | 'm';
export type ImperialUnit = 'in' | 'ft' | 'yd';

export interface ConversionResult {
  value: number;
  unit: string;
  originalValue: number;
  originalUnit: string;
}

export class MetricImperialConverter {
  // Conversion factors
  private static readonly MM_TO_INCH = 0.0393701;
  private static readonly INCH_TO_MM = 25.4;
  private static readonly CM_TO_INCH = 0.393701;
  private static readonly INCH_TO_CM = 2.54;
  private static readonly M_TO_FT = 3.28084;
  private static readonly FT_TO_M = 0.3048;
  private static readonly FT_TO_INCH = 12;
  private static readonly YD_TO_FT = 3;

  /**
   * Convert metric to imperial
   */
  static metricToImperial(
    value: number,
    fromUnit: MetricUnit,
    toUnit: ImperialUnit
  ): ConversionResult {
    let result: number;

    // Convert to base metric (mm)
    const baseValue = this.toMillimeters(value, fromUnit);

    // Convert to target imperial unit
    switch (toUnit) {
      case 'in':
        result = baseValue * this.MM_TO_INCH;
        break;
      case 'ft':
        result = (baseValue * this.MM_TO_INCH) / this.FT_TO_INCH;
        break;
      case 'yd':
        result = ((baseValue * this.MM_TO_INCH) / this.FT_TO_INCH) / this.YD_TO_FT;
        break;
      default:
        throw new Error(`Unsupported imperial unit: ${toUnit}`);
    }

    return {
      value: this.round(result, 4),
      unit: toUnit,
      originalValue: value,
      originalUnit: fromUnit
    };
  }

  /**
   * Convert imperial to metric
   */
  static imperialToMetric(
    value: number,
    fromUnit: ImperialUnit,
    toUnit: MetricUnit
  ): ConversionResult {
    let result: number;

    // Convert to base imperial (inches)
    const baseValue = this.toInches(value, fromUnit);

    // Convert to target metric unit
    switch (toUnit) {
      case 'mm':
        result = baseValue * this.INCH_TO_MM;
        break;
      case 'cm':
        result = baseValue * this.INCH_TO_CM;
        break;
      case 'm':
        result = (baseValue * this.INCH_TO_MM) / 1000;
        break;
      default:
        throw new Error(`Unsupported metric unit: ${toUnit}`);
    }

    return {
      value: this.round(result, 2),
      unit: toUnit,
      originalValue: value,
      originalUnit: fromUnit
    };
  }

  /**
   * Convert to millimeters (base metric)
   */
  private static toMillimeters(value: number, unit: MetricUnit): number {
    switch (unit) {
      case 'mm':
        return value;
      case 'cm':
        return value * 10;
      case 'm':
        return value * 1000;
      default:
        throw new Error(`Unsupported metric unit: ${unit}`);
    }
  }

  /**
   * Convert to inches (base imperial)
   */
  private static toInches(value: number, unit: ImperialUnit): number {
    switch (unit) {
      case 'in':
        return value;
      case 'ft':
        return value * this.FT_TO_INCH;
      case 'yd':
        return value * this.YD_TO_FT * this.FT_TO_INCH;
      default:
        throw new Error(`Unsupported imperial unit: ${unit}`);
    }
  }

  /**
   * Round to specified decimal places
   */
  private static round(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  /**
   * Format value with unit
   */
  static format(value: number, unit: string, precision: number = 2): string {
    const rounded = this.round(value, precision);
    return `${rounded} ${unit}`;
  }

  /**
   * Convert cutting length (for Egyptian market - often uses inches)
   */
  static convertCuttingLength(
    length: number,
    fromUnit: MetricUnit | ImperialUnit,
    toUnit: MetricUnit | ImperialUnit
  ): number {
    if (this.isMetric(fromUnit) && this.isMetric(toUnit)) {
      return this.convertMetricToMetric(length, fromUnit as MetricUnit, toUnit as MetricUnit);
    }

    if (this.isImperial(fromUnit) && this.isImperial(toUnit)) {
      return this.convertImperialToImperial(length, fromUnit as ImperialUnit, toUnit as ImperialUnit);
    }

    if (this.isMetric(fromUnit) && this.isImperial(toUnit)) {
      return this.metricToImperial(length, fromUnit as MetricUnit, toUnit as ImperialUnit).value;
    }

    if (this.isImperial(fromUnit) && this.isMetric(toUnit)) {
      return this.imperialToMetric(length, fromUnit as ImperialUnit, toUnit as MetricUnit).value;
    }

    throw new Error('Invalid unit conversion');
  }

  /**
   * Convert metric to metric
   */
  private static convertMetricToMetric(
    value: number,
    fromUnit: MetricUnit,
    toUnit: MetricUnit
  ): number {
    const baseValue = this.toMillimeters(value, fromUnit);
    return this.fromMillimeters(baseValue, toUnit);
  }

  /**
   * Convert imperial to imperial
   */
  private static convertImperialToImperial(
    value: number,
    fromUnit: ImperialUnit,
    toUnit: ImperialUnit
  ): number {
    const baseValue = this.toInches(value, fromUnit);
    return this.fromInches(baseValue, toUnit);
  }

  /**
   * Convert from millimeters
   */
  private static fromMillimeters(value: number, toUnit: MetricUnit): number {
    switch (toUnit) {
      case 'mm':
        return value;
      case 'cm':
        return value / 10;
      case 'm':
        return value / 1000;
      default:
        throw new Error(`Unsupported metric unit: ${toUnit}`);
    }
  }

  /**
   * Convert from inches
   */
  private static fromInches(value: number, toUnit: ImperialUnit): number {
    switch (toUnit) {
      case 'in':
        return value;
      case 'ft':
        return value / this.FT_TO_INCH;
      case 'yd':
        return value / (this.FT_TO_INCH * this.YD_TO_FT);
      default:
        throw new Error(`Unsupported imperial unit: ${toUnit}`);
    }
  }

  /**
   * Check if unit is metric
   */
  private static isMetric(unit: string): boolean {
    return ['mm', 'cm', 'm'].includes(unit);
  }

  /**
   * Check if unit is imperial
   */
  private static isImperial(unit: string): boolean {
    return ['in', 'ft', 'yd'].includes(unit);
  }

  /**
   * Convert for Egyptian market (typically uses inches for cutting)
   */
  static convertForEgyptianMarket(
    length: number,
    unit: MetricUnit = 'mm'
  ): { metric: number; imperial: number; display: string } {
    const imperial = this.metricToImperial(length, unit, 'in');
    
    return {
      metric: length,
      imperial: imperial.value,
      display: `${this.format(length, unit)} (${this.format(imperial.value, 'in')})`
    };
  }

  /**
   * Parse measurement string (e.g., "2000mm", "78.74in")
   */
  static parseMeasurement(input: string): { value: number; unit: string } | null {
    const match = input.match(/^([\d.]+)\s*([a-zA-Z]+)$/);
    if (!match) {
      return null;
    }

    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();

    if (isNaN(value)) {
      return null;
    }

    // Normalize unit
    const normalizedUnit = this.normalizeUnit(unit);
    if (!normalizedUnit) {
      return null;
    }

    return { value, unit: normalizedUnit };
  }

  /**
   * Normalize unit string
   */
  private static normalizeUnit(unit: string): string | null {
    const unitMap: Record<string, string> = {
      'mm': 'mm',
      'millimeter': 'mm',
      'millimeters': 'mm',
      'cm': 'cm',
      'centimeter': 'cm',
      'centimeters': 'cm',
      'm': 'm',
      'meter': 'm',
      'meters': 'm',
      'metre': 'm',
      'metres': 'm',
      'in': 'in',
      'inch': 'in',
      'inches': 'in',
      '"': 'in',
      'ft': 'ft',
      'foot': 'ft',
      'feet': 'ft',
      "'": 'ft',
      'yd': 'yd',
      'yard': 'yd',
      'yards': 'yd'
    };

    return unitMap[unit.toLowerCase()] || null;
  }

  /**
   * Get conversion factor between two units
   */
  static getConversionFactor(
    fromUnit: MetricUnit | ImperialUnit,
    toUnit: MetricUnit | ImperialUnit
  ): number {
    if (fromUnit === toUnit) {
      return 1;
    }

    // Convert 1 unit of fromUnit to toUnit
    const testValue = 1;
    return this.convertCuttingLength(testValue, fromUnit, toUnit);
  }
}

