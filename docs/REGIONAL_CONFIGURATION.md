# Regional Configuration System

This document describes the dynamic regional configuration system implemented for the Almona portfolio application, supporting Turkey (TR) and Egypt (EG) with comprehensive regional settings.

## Overview

The regional configuration system provides:
- **Dynamic region detection** using IP geolocation with fallback to user preferences
- **Currency formatting** with region-specific symbols, positions, and decimal handling
- **Date and time formatting** with appropriate locales and timezones
- **Market-specific settings** including business hours, payment methods, and cultural preferences
- **Feature flags** for region-specific functionality
- **Turkish language support** with complete i18n integration

## Architecture

### Core Components

1. **`src/lib/regionalConfig.ts`** - Regional configuration definitions
2. **`src/hooks/useRegionDetection.ts`** - Region detection and management hooks
3. **`locales/tr/`** - Turkish language files
4. **`src/lib/i18n.ts`** - Updated i18n configuration with Turkish support

## Regional Configurations

### Turkey (TR)
- **Language**: Turkish (tr)
- **Currency**: Turkish Lira (₺) - positioned after amount
- **Date Format**: DD.MM.YYYY
- **Timezone**: Europe/Istanbul
- **Features**: WhatsApp enabled, local shipping, cash on delivery, Ramadan/Eid modes
- **Payment Methods**: Credit card, bank transfer, cash on delivery

### Egypt (EG)
- **Language**: Arabic (ar)
- **Currency**: Egyptian Pound (ج.م) - positioned after amount
- **Date Format**: DD/MM/YYYY
- **Timezone**: Africa/Cairo
- **Features**: WhatsApp enabled, local shipping, cash on delivery, Ramadan/Eid modes
- **Payment Methods**: Credit card, bank transfer, cash on delivery, mobile payment

### Default
- **Language**: English (en)
- **Currency**: US Dollar ($) - positioned before amount
- **Date Format**: MM/DD/YYYY
- **Timezone**: UTC
- **Features**: Basic functionality only
- **Payment Methods**: Credit card, bank transfer

## Usage

### Basic Region Detection

```typescript
import { useRegionDetection } from '@/hooks/useRegionDetection';

function MyComponent() {
  const { regionState, setRegion, refreshRegion } = useRegionDetection();
  
  return (
    <div>
      <p>Current region: {regionState.region}</p>
      <p>Detected by: {regionState.detectedBy}</p>
      <button onClick={() => setRegion('TR')}>Switch to Turkey</button>
    </div>
  );
}
```

### Regional Configuration Access

```typescript
import { useRegionalConfig } from '@/hooks/useRegionalConfig';

function MyComponent() {
  const { config, region, isLoading, error } = useRegionalConfig();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <p>Language: {config.language}</p>
      <p>Currency: {config.currency.code}</p>
      <p>Timezone: {config.date.timezone}</p>
    </div>
  );
}
```

### Regional Utilities

```typescript
import { useRegionUtils } from '@/hooks/useRegionUtils';

function MyComponent() {
  const utils = useRegionUtils();
  
  return (
    <div>
      <p>Price: {utils.formatCurrency(1234.56)}</p>
      <p>Date: {utils.formatDate(new Date())}</p>
      <p>Greeting: {utils.getGreeting()}</p>
      <p>Business Hours: {utils.isBusinessHours() ? 'Open' : 'Closed'}</p>
    </div>
  );
}
```

## API Reference

### Regional Configuration

#### `getRegionalConfig(regionCode: RegionCode): RegionalConfig`

Returns the complete regional configuration for a given region code.

#### `formatCurrency(amount: number, regionCode: RegionCode, options?): string`

Formats a number as currency according to regional settings.

**Options:**
- `showSymbol?: boolean` - Show currency symbol (default: true)
- `showCode?: boolean` - Show currency code (default: false)

#### `formatDate(date: Date | string, regionCode: RegionCode, options?): string`

Formats a date according to regional settings.

**Options:**
- `format?: string` - Custom format string
- `includeTime?: boolean` - Include time in output (default: false)

#### `isBusinessHours(regionCode: RegionCode): boolean`

Checks if current time is within business hours for the region.

#### `isFeatureEnabled(regionCode: RegionCode, feature: string): boolean`

Checks if a specific feature is enabled for the region.

### Region Detection Hook

#### `useRegionDetection(options?): RegionDetectionState`

**Options:**
- `enableIPDetection?: boolean` - Enable IP-based detection (default: true)
- `enablePreferenceStorage?: boolean` - Store user preferences (default: true)
- `fallbackRegion?: RegionCode` - Fallback region (default: 'DEFAULT')
- `cacheTimeout?: number` - Cache timeout in milliseconds (default: 24 hours)

**Returns:**
- `regionState: RegionDetectionState` - Current region state
- `setRegion: (region: RegionCode) => void` - Set user's preferred region
- `refreshRegion: () => Promise<void>` - Refresh region detection

#### `useRegionalConfig(options?): RegionalConfig`

Returns the current regional configuration with loading and error states.

#### `useRegionUtils(options?): RegionUtils`

Returns utility functions for the current region:
- `formatCurrency(amount, options?)` - Format currency
- `formatDate(date, options?)` - Format date
- `isBusinessHours()` - Check business hours
- `getGreeting()` - Get cultural greeting
- `getFarewell()` - Get cultural farewell
- `getSpecialOccasions()` - Get special occasions
- `getPaymentMethods()` - Get available payment methods
- `getShippingInfo(type)` - Get shipping information
- `isFeatureEnabled(feature)` - Check feature availability

## Region Detection Flow

1. **Cache Check** - Check for cached region data (24-hour cache)
2. **User Preference** - Check localStorage for user's preferred region
3. **IP Geolocation** - Use IP geolocation service to detect country
4. **Language Detection** - Fallback to browser language detection
5. **Default Fallback** - Use default region if all else fails

## Turkish Language Support

### Locale Files

The Turkish language support includes:

- **`locales/tr/translation.json`** - Common translations
- **`locales/tr/services.json`** - Service-related translations
- **`locales/tr/products.json`** - Product-related translations
- **`locales/tr/errors.json`** - Error message translations

### Integration

Turkish is fully integrated into the i18n system:
- Automatic language detection
- RTL/LTR layout handling (Turkish uses LTR)
- Namespace-based translations
- Fallback to English for missing translations

## Configuration Options

### Currency Configuration

```typescript
interface CurrencyConfig {
  code: string;           // ISO currency code (TRY, EGP, USD)
  symbol: string;         // Currency symbol (₺, ج.م, $)
  position: 'before' | 'after';  // Symbol position
  decimalPlaces: number;  // Number of decimal places
  thousandsSeparator: string;    // Thousands separator
  decimalSeparator: string;      // Decimal separator
}
```

### Date Configuration

```typescript
interface DateConfig {
  format: string;         // Date format string
  locale: string;         // Locale string (tr-TR, ar-EG, en-US)
  timezone: string;       // Timezone (Europe/Istanbul, Africa/Cairo, UTC)
  firstDayOfWeek: number; // 0 = Sunday, 1 = Monday
}
```

### Market Configuration

```typescript
interface MarketConfig {
  businessHours: {
    start: string;        // Business start time (HH:MM)
    end: string;          // Business end time (HH:MM)
    timezone: string;     // Business timezone
  };
  contactMethods: {
    primary: string;      // Primary contact method
    secondary: string[];  // Secondary contact methods
  };
  shipping: {
    domestic: ShippingInfo;
    international: ShippingInfo;
  };
  paymentMethods: string[];     // Available payment methods
  cultural: {
    greeting: string;     // Cultural greeting
    farewell: string;     // Cultural farewell
    specialOccasions: string[]; // Special occasions
  };
}
```

## Error Handling

The system includes comprehensive error handling:

- **IP Geolocation Failures** - Graceful fallback to language detection
- **Network Issues** - Cached data and user preferences as fallbacks
- **Invalid Regions** - Default region fallback
- **Missing Translations** - English fallback for missing Turkish translations

## Performance Considerations

- **Caching** - 24-hour cache for region detection results
- **Lazy Loading** - Regional configurations loaded on demand
- **Minimal API Calls** - IP geolocation only when necessary
- **Local Storage** - User preferences stored locally

## Security Considerations

- **IP Privacy** - IP geolocation uses external service (ipapi.co)
- **Data Storage** - Only region preferences stored locally
- **No Sensitive Data** - No personal information in regional configs
- **HTTPS Required** - IP geolocation requires secure connection

## Testing

### Example Component

See `src/components/examples/RegionalConfigExample.tsx` for a comprehensive example demonstrating all features of the regional configuration system.

### Manual Testing

1. **Region Switching** - Test switching between TR, EG, and DEFAULT
2. **Currency Formatting** - Verify correct currency symbols and positions
3. **Date Formatting** - Check date formats match regional expectations
4. **Business Hours** - Verify business hours detection
5. **Feature Flags** - Test region-specific feature availability
6. **Language Switching** - Verify Turkish language support

## Future Enhancements

- **Additional Regions** - Support for more countries/regions
- **Advanced Geolocation** - More sophisticated location detection
- **Regional Analytics** - Track regional usage patterns
- **A/B Testing** - Region-specific feature testing
- **Dynamic Configuration** - Server-side regional configuration updates

## Troubleshooting

### Common Issues

1. **Region Not Detected** - Check network connection and IP geolocation service
2. **Currency Not Formatting** - Verify regional configuration is loaded
3. **Turkish Not Loading** - Check locale files exist and are properly formatted
4. **Business Hours Wrong** - Verify timezone configuration

### Debug Mode

Enable debug mode in the region detection hook to see detailed logging:

```typescript
const { regionState } = useRegionDetection({ 
  enableIPDetection: true,
  enablePreferenceStorage: true 
});
```

## Contributing

When adding new regions:

1. Add region configuration to `regionalConfig.ts`
2. Create locale files in `locales/{region}/`
3. Update type definitions in `types/i18n.ts`
4. Add region to country mapping in `useRegionDetection.ts`
5. Test thoroughly with the example component
6. Update documentation

## License

This regional configuration system is part of the Almona portfolio application and follows the same licensing terms.
