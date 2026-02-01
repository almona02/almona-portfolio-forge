# YILMAZ Service Analytics — Quick Start

## 5-Minute Setup

### 1. Import the Component

```tsx
import { TechChecklist } from '@/services/ticketing/yilmaz';

function YilmazServicePage() {
  return (
    <TechChecklist
      language="ar"
      onAdvisoryGenerated={(advisory) => {
        console.log('Advisory:', advisory);
        // Handle advisory (create ticket, show approval dialog, etc.)
      }}
    />
  );
}
```

### 2. Run in Browser

```bash
npm run dev
# Navigate to: http://localhost:5173/yilmaz-service
```

### 3. Test the Flow

1. Select **Machine Model**: AIM_4410
2. Enter **Serial Number**: YIL-2024-TEST
3. Set **Hydraulic Pressure**: 145 bar
4. Set **Spindle Temperature**: 72°C
5. Set **Input Voltage**: 218V
6. Set **Dust Level**: 4 (Heavy)
7. Enter **Symptoms**: `spindle overheating, fan noise`
8. Click **"Generate Advisory"**

You should see:
- ✅ Advisory generated in ~25ms
- ✅ Rule matched: `YIL-EGY-001` (Khamsin Dust Clog)
- ✅ Urgency: High
- ✅ Confidence: 89%
- ✅ Parts: 3 items, 5,450 EGP
- ✅ Downtime: 3 hours
- ✅ Bilingual suggestions (EN/AR)

---

## Advanced Usage

### Programmatic Advisory Generation

```typescript
import { yilmazExpertAdvisor } from '@/services/ticketing/yilmaz';

const technicianInput = {
  machineModel: 'AIM_4410',
  machineSerial: 'YIL-2024-12345',
  installationYear: 2019,
  hydraulicPressureBar: 145,
  spindleTempCelsius: 72,
  inputVoltage: 218,
  dustLevel: 4,
  ambientTempCelsius: 32,
  symptoms: ['spindle overheating', 'fan noise'],
  currentMonth: 4, // April (Khamsin season)
  location: 'cairo'
};

const advisory = await yilmazExpertAdvisor.generateAdvisory(technicianInput);
console.log('Suggestion:', advisory.suggestionEn);
console.log('Cost:', advisory.totalCostEGP, 'EGP');
```

### Direct Rules Execution

```typescript
import { yilmazEgyptRulesEngine } from '@/services/ticketing/yilmaz';

const result = yilmazEgyptRulesEngine.executeRules(technicianInput);
console.log('Rule matched:', result.ruleMatched);
console.log('Rule ID:', result.ruleId);
console.log('Parts:', result.recommendedParts);
```

---

## Common Scenarios

### Scenario 1: Khamsin Season (March-May)
```typescript
const input = {
  machineModel: 'AIM_4410',
  machineSerial: 'YIL-2019-07812',
  dustLevel: 4,
  currentMonth: 4, // April
  symptoms: ['spindle overheating'],
  location: 'cairo'
};
// Result: YIL-EGY-001 (Khamsin Dust Clog) → 5,450 EGP
```

### Scenario 2: Voltage Fluctuation
```typescript
const input = {
  machineModel: 'AIM_7510',
  machineSerial: 'YIL-2020-05234',
  inputVoltage: 195, // Below 200V
  symptoms: ['positioning drift'],
  location: 'giza'
};
// Result: YIL-EGY-002 (Voltage Instability) → 26,400 EGP [CRITICAL]
```

### Scenario 3: Summer Overheating (June-Sept)
```typescript
const input = {
  machineModel: 'ALM_6510',
  machineSerial: 'YIL-2024-01103',
  spindleTempCelsius: 82,
  ambientTempCelsius: 44,
  currentMonth: 7, // July
  symptoms: ['thermal shutdown'],
  location: 'cairo'
};
// Result: YIL-EGY-003 (Summer Overheating) → 16,180 EGP
```

---

## Integration with Ticketing

```typescript
const handleAdvisoryGenerated = async (advisory) => {
  // Create preventive maintenance ticket
  const ticket = await ticketsV2.createPreventiveMaintenanceTicket({
    title: advisory.suggestedTicketTitle,
    description: advisory.suggestedTicketDescription,
    priority: advisory.suggestedTicketPriority,
    machine_serial_number: advisory.machineSerial,
    maintenance_metadata: {
      advisoryId: advisory.advisoryId,
      recommendedParts: advisory.recommendedParts,
      totalCostEGP: advisory.totalCostEGP
    }
  });

  console.log('Ticket created:', ticket.ticket_number);
};
```

---

## Troubleshooting

### Issue: Advisory not generating
**Solution**: Check input validation
```typescript
const validation = yilmazEgyptRulesEngine.validateInput(input);
if (!validation.valid) {
  console.error('Errors:', validation.errors);
}
```

### Issue: No rule matched
**Solution**: Check thresholds
```typescript
// Ensure at least one condition triggers:
// - dustLevel >= 3 (during Khamsin season)
// - inputVoltage < 200 or > 240
// - spindleTempCelsius > 70
// - hydraulicPressureBar < 120
```

### Issue: Parts not showing
**Solution**: Rule must match first
```typescript
if (!result.ruleMatched) {
  console.log('No rule matched — routine inspection recommended');
}
```

---

## Documentation

- 📘 **Full Technical Spec**: `WAVE3_YILMAZ_SERVICE_ANALYTICS_COMPLETE.md`
- 📗 **Integration Guide**: `INTEGRATION_GUIDE.md`
- 📕 **Implementation Summary**: `WAVE3_IMPLEMENTATION_SUMMARY.md`
- 📙 **AICS-001 Spec**: `docs/AICS-001_ALMONA_INDUSTRIAL_COMPUTING_SPECIFICATION.md`

---

## Support

For help:
1. Check the integration guide
2. Review example scenarios
3. Validate input format
4. Check wiring manifest registration
5. Contact system architect

**Happy Coding!** 🚀
