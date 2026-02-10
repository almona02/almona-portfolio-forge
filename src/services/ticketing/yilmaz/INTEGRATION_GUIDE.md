# YILMAZ Service Analytics — Integration Guide

## Quick Start

### 1. Import the Components

```typescript
// Import everything
import {
  yilmazEgyptRulesEngine,
  yilmazExpertAdvisor,
  TechChecklist,
  type YilmazTechnicianInput,
  type YilmazExpertAdvisory
} from '@/services/ticketing/yilmaz';
```

### 2. Use in a React Component

```tsx
import React, { useState } from 'react';
import { TechChecklist, YilmazExpertAdvisory } from '@/services/ticketing/yilmaz';
import { Button } from '@/shared/ui/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/ui/dialog';

export const YilmazServicePage: React.FC = () => {
  const [advisory, setAdvisory] = useState<YilmazExpertAdvisory | null>(null);
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);

  const handleAdvisoryGenerated = (generatedAdvisory: YilmazExpertAdvisory) => {
    setAdvisory(generatedAdvisory);
    setApprovalModalVisible(true);
  };

  const handleApprove = async () => {
    if (!advisory) return;

    // Create preventive maintenance ticket
    const ticketPayload = {
      title: advisory.suggestedTicketTitle,
      description: advisory.suggestedTicketDescription,
      type: 'maintenance' as const,
      priority: advisory.suggestedTicketPriority,
      category: 'preventive_maintenance',
      machine_serial_number: advisory.machineSerial,
      machine_model: advisory.machineModel,
      maintenance_metadata: {
        advisoryId: advisory.advisoryId,
        ruleId: advisory.ruleId,
        recommendedParts: advisory.recommendedParts,
        estimatedCostEGP: advisory.totalCostEGP,
        estimatedDowntimeHours: advisory.estimatedDowntimeHours,
        confidence: advisory.confidence,
        urgency: advisory.urgency
      }
    };

    // Call your ticket API
    // await ticketsV2.createPreventiveMaintenanceTicket(ticketPayload);
    
    setApprovalModalVisible(false);
    // Show success message
  };

  return (
    <div>
      <h1>YILMAZ Service Checklist</h1>
      
      <TechChecklist
        language="ar"
        onAdvisoryGenerated={handleAdvisoryGenerated}
      />

      <Dialog open={approvalModalVisible} onOpenChange={(open) => !open && setApprovalModalVisible(false)}>
        <DialogContent className="max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Advisory Approval Required</DialogTitle>
          </DialogHeader>
          {advisory && (
            <div className="space-y-4">
              <p><strong>Confidence:</strong> {(advisory.confidence * 100).toFixed(0)}%</p>
              <p><strong>Urgency:</strong> {advisory.urgency.toUpperCase()}</p>
              <p><strong>Total Cost:</strong> {advisory.totalCostEGP.toLocaleString('en-EG')} EGP</p>
              <p><strong>Downtime:</strong> {advisory.estimatedDowntimeHours} hours</p>
              
              <h3>Parts Required:</h3>
              <ul>
                {advisory.recommendedParts.map(part => (
                  <li key={part.partNumber}>
                    {part.nameEn} ({part.partNumber}) — {part.priceEGP.toLocaleString('en-EG')} EGP
                  </li>
                ))}
              </ul>

              <p className="text-xs text-muted-foreground mt-4">
                {advisory.constitutionalDisclaimer}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalModalVisible(false)}>Cancel</Button>
            <Button onClick={handleApprove}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
```

### 3. Use Rules Engine Directly (Programmatic)

```typescript
import {
  yilmazEgyptRulesEngine,
  type YilmazTechnicianInput
} from '@/services/ticketing/yilmaz';

// Programmatic rule execution
const technicianInput: YilmazTechnicianInput = {
  machineModel: 'AIM_4410',
  machineSerial: 'YIL-2024-12345',
  installationYear: 2019,
  hydraulicPressureBar: 145,
  spindleTempCelsius: 72,
  inputVoltage: 218,
  dustLevel: 4,
  ambientTempCelsius: 32,
  symptoms: ['spindle overheating', 'fan noise'],
  currentMonth: 4, // April
  location: 'cairo'
};

// Execute rules
const result = yilmazEgyptRulesEngine.executeRules(technicianInput);

console.log('Rule matched:', result.ruleMatched);
console.log('Rule ID:', result.ruleId);
console.log('Urgency:', result.urgency);
console.log('Total cost:', result.totalCostEGP, 'EGP');
console.log('Recommended parts:', result.recommendedParts);
```

### 4. Use Expert Advisor Directly (Programmatic)

```typescript
import {
  yilmazExpertAdvisor,
  type YilmazTechnicianInput
} from '@/services/ticketing/yilmaz';

// Generate expert advisory
const advisory = await yilmazExpertAdvisor.generateAdvisory(technicianInput);

console.log('Suggestion (EN):', advisory.suggestionEn);
console.log('Suggestion (AR):', advisory.suggestionAr);
console.log('Confidence:', advisory.confidence);
console.log('Ticket title:', advisory.suggestedTicketTitle);
console.log('Ticket description:', advisory.suggestedTicketDescription);
```

---

## Integration with Existing Ticketing System

### Option 1: Direct API Call (V2 Tickets)

```typescript
import { ticketsV2 } from '@/lib/api/ticketsV2';

const createTicketFromAdvisory = async (advisory: YilmazExpertAdvisory) => {
  const response = await ticketsV2.createPreventiveMaintenanceTicket({
    title: advisory.suggestedTicketTitle,
    description: advisory.suggestedTicketDescription,
    priority: advisory.suggestedTicketPriority,
    machine_serial_number: advisory.machineSerial,
    scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    maintenance_metadata: {
      advisoryId: advisory.advisoryId,
      ruleId: advisory.ruleId,
      category: advisory.category,
      recommendedParts: advisory.recommendedParts,
      estimatedCostEGP: advisory.totalCostEGP,
      estimatedDowntimeHours: advisory.estimatedDowntimeHours,
      confidence: advisory.confidence,
      urgency: advisory.urgency,
      preventiveActionsEn: advisory.preventiveActionsEn,
      preventiveActionsAr: advisory.preventiveActionsAr,
      seasonalWarningEn: advisory.seasonalWarningEn,
      seasonalWarningAr: advisory.seasonalWarningAr
    }
  });

  return response;
};
```

### Option 2: Use Existing Ticket Wizard

```typescript
import { useNavigate } from 'react-router-dom';

const YilmazServiceComponent = () => {
  const navigate = useNavigate();

  const handleAdvisoryGenerated = (advisory: YilmazExpertAdvisory) => {
    // Navigate to Create Ticket page with prefilled data
    navigate('/support/tickets/new', {
      state: {
        type: 'maintenance',
        maintenance_type: 'preventive',
        priority: advisory.suggestedTicketPriority,
        title: advisory.suggestedTicketTitle,
        description: advisory.suggestedTicketDescription,
        machine_serial_number: advisory.machineSerial,
        machine_model: advisory.machineModel,
        metadata: {
          advisoryId: advisory.advisoryId,
          recommendedParts: advisory.recommendedParts,
          totalCostEGP: advisory.totalCostEGP
        }
      }
    });
  };

  return (
    <TechChecklist onAdvisoryGenerated={handleAdvisoryGenerated} />
  );
};
```

---

## Parts Catalog Integration

### Get All Parts

```typescript
import { YILMAZ_EGYPT_PARTS } from '@/services/ticketing/yilmaz';

// Get all parts
const allParts = YILMAZ_EGYPT_PARTS;

// Example: Display parts catalog
Object.entries(allParts).forEach(([partNumber, partInfo]) => {
  console.log(`${partNumber}: ${partInfo.name} — ${partInfo.priceEGP} EGP`);
  console.log(`  Stock: ${partInfo.stockLevel}, Lead Time: ${partInfo.leadTimeDays} days`);
  console.log(`  Compatible: ${partInfo.machineModels.join(', ')}`);
});
```

### Check Part Availability

```typescript
import { yilmazEgyptRulesEngine } from '@/services/ticketing/yilmaz';

const partsCatalog = yilmazEgyptRulesEngine.getPartsCatalog();

const checkPartAvailability = (partNumber: string) => {
  const part = partsCatalog[partNumber];
  
  if (!part) {
    return { available: false, message: 'Part not found' };
  }

  return {
    available: part.stockLevel !== 'out_of_stock',
    stockLevel: part.stockLevel,
    leadTimeDays: part.leadTimeDays,
    priceEGP: part.priceEGP,
    name: part.name
  };
};
```

---

## Environment Constants

```typescript
import { EGYPT_ENV_CONSTANTS } from '@/services/ticketing/yilmaz';

// Check if current month is Khamsin season
const currentMonth = new Date().getMonth();
const isKhamsinSeason = 
  currentMonth >= EGYPT_ENV_CONSTANTS.KHAMSIN_SEASON_START &&
  currentMonth <= EGYPT_ENV_CONSTANTS.KHAMSIN_SEASON_END;

if (isKhamsinSeason) {
  console.log('⚠️ Khamsin season active — Recommend daily filter checks');
}

// Check if summer heat is a concern
const currentTemp = 42; // °C
if (currentTemp > EGYPT_ENV_CONSTANTS.SUMMER_TEMP_THRESHOLD) {
  console.log('⚠️ Summer heat threshold exceeded — Monitor spindle temperature');
}

// Check voltage
const measuredVoltage = 195; // V
if (measuredVoltage < EGYPT_ENV_CONSTANTS.VOLTAGE_MIN) {
  console.log('🚨 Critical voltage low — Install AVR immediately');
}
```

---

## Mobile App Integration (React Native)

The `TechChecklist` component uses Ant Design, which is web-only. For mobile apps, you need to adapt the UI:

```tsx
// mobile/components/YilmazChecklist.tsx (React Native)
import React, { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView } from 'react-native';
import { yilmazExpertAdvisor, type YilmazTechnicianInput } from '@/services/ticketing/yilmaz';

export const YilmazChecklistMobile = () => {
  const [input, setInput] = useState<Partial<YilmazTechnicianInput>>({});
  const [advisory, setAdvisory] = useState(null);

  const handleSubmit = async () => {
    const advisory = await yilmazExpertAdvisor.generateAdvisory(input as YilmazTechnicianInput);
    setAdvisory(advisory);
  };

  return (
    <ScrollView>
      <Text>Machine Model</Text>
      <TextInput
        value={input.machineModel}
        onChangeText={(text) => setInput({ ...input, machineModel: text })}
      />
      
      <Text>Hydraulic Pressure (bar)</Text>
      <TextInput
        keyboardType="numeric"
        value={input.hydraulicPressureBar?.toString()}
        onChangeText={(text) => setInput({ ...input, hydraulicPressureBar: parseFloat(text) })}
      />
      
      {/* Add more fields */}
      
      <Button title="Generate Advisory" onPress={handleSubmit} />
      
      {advisory && (
        <View>
          <Text>{advisory.suggestionEn}</Text>
          <Text>Confidence: {(advisory.confidence * 100).toFixed(0)}%</Text>
          {/* Render advisory details */}
        </View>
      )}
    </ScrollView>
  );
};
```

---

## Testing

### Unit Test Example

```typescript
// YilmazEgyptRules.test.ts
import { yilmazEgyptRulesEngine, YilmazTechnicianInput } from '@/services/ticketing/yilmaz';

describe('YilmazEgyptRulesEngine', () => {
  it('should match Khamsin dust rule in April with high dust', () => {
    const input: YilmazTechnicianInput = {
      machineModel: 'AIM_4410',
      machineSerial: 'TEST-001',
      installationYear: 2020,
      dustLevel: 4,
      spindleTempCelsius: 72,
      currentMonth: 3, // April (0-indexed)
      location: 'cairo',
      symptoms: []
    };

    const result = yilmazEgyptRulesEngine.executeRules(input);

    expect(result.ruleMatched).toBe(true);
    expect(result.ruleId).toBe('YIL-EGY-001');
    expect(result.category).toBe('DUST_KHAMSIN_CLOG');
    expect(result.urgency).toBe('high');
    expect(result.recommendedParts.length).toBeGreaterThan(0);
  });

  it('should match voltage fluctuation rule with low voltage', () => {
    const input: YilmazTechnicianInput = {
      machineModel: 'AIM_7510',
      machineSerial: 'TEST-002',
      installationYear: 2020,
      inputVoltage: 195, // Below 200
      symptoms: ['positioning drift'],
      currentMonth: 10,
      location: 'giza'
    };

    const result = yilmazEgyptRulesEngine.executeRules(input);

    expect(result.ruleMatched).toBe(true);
    expect(result.ruleId).toBe('YIL-EGY-002');
    expect(result.urgency).toBe('critical');
  });
});
```

---

## Troubleshooting

### Issue: Advisory not generating

**Solution**: Check technician input validation

```typescript
import { yilmazEgyptRulesEngine } from '@/services/ticketing/yilmaz';

const validation = yilmazEgyptRulesEngine.validateInput(technicianInput);
if (!validation.valid) {
  console.error('Invalid input:', validation.errors);
}
```

### Issue: Parts not showing correct prices

**Solution**: Parts are hardcoded in EGP. If you need dynamic pricing, integrate with inventory API:

```typescript
import { YILMAZ_EGYPT_PARTS } from '@/services/ticketing/yilmaz';

const enrichPartsWithLiveData = async (parts: any[]) => {
  return Promise.all(parts.map(async (part) => {
    const liveData = await inventoryAPI.getPart(part.partNumber);
    return {
      ...part,
      priceEGP: liveData.priceEGP, // Live price
      stockLevel: liveData.stockLevel // Live stock
    };
  }));
};
```

### Issue: Bilingual text not rendering correctly

**Solution**: Ensure your app supports Arabic fonts and RTL layout:

```css
/* Add to global CSS */
[dir="rtl"] {
  direction: rtl;
  text-align: right;
}

/* Use Arabic-friendly fonts */
body {
  font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
}
```

---

## Best Practices

1. **Always validate technician input** before generating advisory
2. **Display constitutional disclaimer** prominently
3. **Require human approval** before creating tickets
4. **Log advisory outcomes** for future analysis
5. **Update parts catalog** quarterly based on YILMAZ Egypt inventory
6. **Test seasonal rules** in simulation (don't wait for Khamsin/Summer)
7. **Mobile-optimize** for field technicians (large touch targets, minimal typing)
8. **Offline support** — Rules engine works without network
9. **Audit trail** — Save advisoryId with every ticket created

---

## Support

For questions or issues:
- Review `WAVE3_YILMAZ_SERVICE_ANALYTICS_COMPLETE.md`
- Check AICS-001 specification
- Contact system architect
- Review wiring manifest for constitutional compliance
