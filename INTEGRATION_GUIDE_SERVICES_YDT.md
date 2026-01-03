# Services YDT Integration Guide
## Step-by-Step Integration Instructions

**Date:** January 7, 2026  
**Status:** Ready for Integration  
**Estimated Time:** 2-4 hours

---

## 🎯 PRE-INTEGRATION CHECKLIST

### Prerequisites

- [ ] All Week 1 code files are in place
- [ ] TypeScript compilation passes (no errors)
- [ ] YDT Core Service is operational
- [ ] Services page is accessible
- [ ] Ticket creation flow works without YDT

### Files to Verify

- [ ] `src/lib/services/YDTServiceIntelligence.ts` exists
- [ ] `src/lib/ydt/YDTEnforcementService.ts` exists
- [ ] `src/lib/services/YDTServiceLogger.ts` exists
- [ ] `src/components/services/YDTSuggestionsPanel.tsx` exists
- [ ] `src/components/services/TicketWizardWithYDT.tsx` exists
- [ ] `src/components/services/ServicesYDTDashboard.tsx` exists

---

## 📝 STEP 1: UPDATE SERVICES PAGE

### 1.1 Locate Ticket Creation Point

Find where `TicketWizardDialog` is used in your services pages:

```bash
# Search for TicketWizardDialog usage
grep -r "TicketWizardDialog" src/pages/
grep -r "TicketWizardDialog" src/components/
```

**Common locations:**
- `src/pages/Services.tsx`
- `src/pages/CreateTicketPage.tsx`
- `src/components/support/` (various components)

### 1.2 Replace Import

**BEFORE:**
```typescript
import TicketWizardDialog from '@/components/support/TicketWizardDialog';
```

**AFTER:**
```typescript
import TicketWizardWithYDT from '@/components/services/TicketWizardWithYDT';
```

### 1.3 Replace Component Usage

**BEFORE:**
```typescript
<TicketWizardDialog
  open={ticketWizardOpen}
  onOpenChange={setTicketWizardOpen}
  initialValues={ticketInitialValues}
  onTicketCreated={handleTicketCreated}
/>
```

**AFTER:**
```typescript
<TicketWizardWithYDT
  open={ticketWizardOpen}
  onOpenChange={setTicketWizardOpen}
  initialValues={ticketInitialValues}
  onTicketCreated={handleTicketCreated}
  showYdtPanel={true}
  autoAcceptHighConfidence={false} // Set to true if you want auto-accept
/>
```

### 1.4 Verify Props Compatibility

`TicketWizardWithYDT` extends `TicketWizardDialogProps`, so all existing props work:
- `open` ✅
- `onOpenChange` ✅
- `onTicketCreated` ✅
- `initialValues` ✅

**New props (optional):**
- `showYdtPanel?: boolean` (default: `true`)
- `autoAcceptHighConfidence?: boolean` (default: `false`)

---

## 📝 STEP 2: ADD YDT DASHBOARD

### 2.1 Locate Services Dashboard

Find where the services dashboard is rendered:

```bash
# Search for services dashboard
grep -r "Services.*Dashboard" src/pages/
grep -r "dashboard" src/pages/Services.tsx
```

**Common locations:**
- `src/pages/Services.tsx` (dashboard tab)
- `src/components/services/MaintenanceDashboard.tsx`
- Separate dashboard page

### 2.2 Add Dashboard Component

**Add import:**
```typescript
import ServicesYDTDashboard from '@/components/services/ServicesYDTDashboard';
```

**Add to dashboard section:**
```typescript
// In Services page or dashboard component
<div className="services-ydt-section">
  <h2>YDT Service Intelligence</h2>
  <ServicesYDTDashboard />
</div>
```

### 2.3 Optional: Add to Existing Dashboard Tab

If you have a dashboard tab in Services page:

```typescript
// In Services.tsx, find the dashboard tab
<TabsContent value="dashboard">
  {/* Existing dashboard components */}
  <MaintenanceDashboard />
  
  {/* NEW: Add YDT Dashboard */}
  <div className="mt-8">
    <ServicesYDTDashboard />
  </div>
</TabsContent>
```

---

## 📝 STEP 3: CONFIGURE YDT SERVICE

### 3.1 Create Services Config File (Optional)

Create `src/config/services.ts`:

```typescript
export const servicesConfig = {
  ydt: {
    enabled: true,
    timeoutMs: 150,
    retryCount: 2,
    fallbackStrategy: 'cache' as const,
    mandatoryServices: [
      'ticket_assignment',
      'resolution_prediction',
      'spare_parts_suggestion'
    ],
    trackMetrics: true,
    logLevel: 'info' as const,
    features: {
      autoAcceptHighConfidence: false, // Start with false, enable after testing
      showConfidenceScores: true,
      enableFallbackAnalytics: true,
      realtimeDashboard: true
    }
  }
};
```

### 3.2 Initialize YDT Service (If Needed)

If you need to configure YDT service at app startup:

```typescript
// In your app initialization (e.g., App.tsx or main.tsx)
import { getYDTServiceIntelligence } from '@/lib/services/YDTServiceIntelligence';

// Configure YDT service
const ydtService = getYDTServiceIntelligence();
ydtService.updateConfig({
  enabled: true,
  timeoutMs: 150,
  fallbackStrategy: 'cache'
});
```

---

## 📝 STEP 4: TEST INTEGRATION

### 4.1 Basic Functionality Test

1. **Open Services page**
   - Navigate to `/services`
   - Verify page loads without errors

2. **Open Ticket Creation**
   - Click "Create Ticket" or similar
   - Verify `TicketWizardWithYDT` opens

3. **Enter Ticket Description**
   - Type: "CNC machine showing alarm 302 during aluminum cutting"
   - Wait 500ms for YDT suggestions

4. **Verify YDT Panel Appears**
   - Check right sidebar for YDT suggestions panel
   - Verify confidence score is displayed
   - Verify suggestions are shown

### 4.2 Circuit Breaker Test

1. **Simulate YDT Timeout**
   - Open browser DevTools → Network tab
   - Throttle network to "Slow 3G"
   - Or block YDT API endpoint

2. **Create Ticket**
   - Enter description >20 chars
   - Wait for YDT suggestions

3. **Verify Fallback**
   - Should see "Using cached suggestions" or similar
   - System should not crash
   - Ticket creation should continue

### 4.3 Dashboard Test

1. **Navigate to Dashboard**
   - Go to Services dashboard tab
   - Or navigate to `/services/dashboard`

2. **Verify YDT Dashboard**
   - Check for "Services YDT Integration" section
   - Verify metrics are displayed
   - Check for recommendations/alerts

3. **Create Test Tickets**
   - Create 3-5 test tickets
   - Verify metrics update
   - Check acceptance/fallback rates

---

## 📝 STEP 5: VERIFY METRICS

### 5.1 Check Browser Console

Open browser DevTools → Console:

**Expected logs:**
- `YDT Service Log: { ... }` (for each YDT call)
- No error messages
- Circuit breaker state changes (if applicable)

**Red flags:**
- Error messages about YDT
- Timeout errors
- Network errors

### 5.2 Check localStorage

Open browser DevTools → Application → Local Storage:

**Expected data:**
- `ydt_service_logs` key exists
- Contains array of log entries
- Each entry has: timestamp, service, success, confidence, etc.

**Verify:**
```javascript
// In browser console
const logs = JSON.parse(localStorage.getItem('ydt_service_logs') || '[]');
console.log('Total YDT calls:', logs.length);
console.log('Success rate:', logs.filter(l => l.success).length / logs.length);
```

### 5.3 Check Dashboard Metrics

**Verify metrics display:**
- Total calls > 0 (after creating tickets)
- Success rate displayed
- Avg confidence displayed
- Fallback rate displayed

---

## 🐛 TROUBLESHOOTING

### Issue 1: YDT Suggestions Not Appearing

**Symptoms:**
- Ticket wizard opens
- No YDT panel visible
- No suggestions shown

**Diagnosis:**
1. Check `showYdtPanel` prop is `true`
2. Verify description is >20 characters
3. Check browser console for errors
4. Verify YDT service is enabled

**Fix:**
```typescript
// Ensure showYdtPanel is true
<TicketWizardWithYDT
  showYdtPanel={true} // Explicitly set
  {...otherProps}
/>

// Check YDT service is enabled
const ydtService = getYDTServiceIntelligence();
console.log('YDT enabled:', ydtService.isEnabled());
```

---

### Issue 2: High Fallback Rate

**Symptoms:**
- Dashboard shows fallback rate >30%
- "Using cached suggestions" message appears frequently
- YDT suggestions are slow

**Diagnosis:**
1. Check YDT API endpoint is accessible
2. Verify network connectivity
3. Check YDT response time (should be <150ms)
4. Review circuit breaker state

**Fix:**
```typescript
// Check circuit breaker state
const enforcer = ydtService['enforcer'];
console.log('Circuit breaker state:', enforcer.getState());

// If state is 'open', YDT is failing
// Check YDT API health
fetch('/api/ydt/health')
  .then(r => r.json())
  .then(console.log);
```

---

### Issue 3: System Crashes or Errors

**Symptoms:**
- Ticket creation fails
- Browser console shows errors
- Application becomes unresponsive

**Diagnosis:**
1. Check error messages in console
2. Verify circuit breaker is working
3. Check if fallback is being used
4. Review error logs

**Fix:**
```typescript
// Verify circuit breaker is configured
const ydtService = getYDTServiceIntelligence();
const config = ydtService.getConfig();
console.log('YDT config:', config);

// If issues persist, temporarily disable YDT
ydtService.updateConfig({ enabled: false });
```

---

### Issue 4: Performance Issues

**Symptoms:**
- Ticket creation is slow
- YDT suggestions take >500ms
- Page becomes unresponsive

**Diagnosis:**
1. Measure YDT response time
2. Check network throttling
3. Verify debounce is working (500ms)
4. Review cache effectiveness

**Fix:**
```typescript
// Check response times in logs
const logs = JSON.parse(localStorage.getItem('ydt_service_logs') || '[]');
const avgResponseTime = logs.reduce((sum, l) => sum + l.responseTime, 0) / logs.length;
console.log('Avg response time:', avgResponseTime, 'ms');

// If >200ms, consider increasing timeout or optimizing
```

---

## ✅ POST-INTEGRATION CHECKLIST

### Immediate (Day 1)

- [ ] Integration complete
- [ ] Basic functionality test passed
- [ ] Circuit breaker test passed
- [ ] Dashboard displays metrics
- [ ] No console errors

### Short-term (Day 2-3)

- [ ] Created 10+ test tickets
- [ ] Acceptance rate calculated
- [ ] Fallback rate calculated
- [ ] Agent feedback collected (if applicable)
- [ ] Performance impact measured

### Medium-term (Day 4-7)

- [ ] Created 50+ tickets with YDT
- [ ] Acceptance rate ≥50% (target)
- [ ] Fallback rate <30% (target)
- [ ] No system crashes
- [ ] Week 1 review completed

---

## 📊 SUCCESS VALIDATION

### Integration is Successful If:

1. ✅ YDT suggestions appear when description >20 chars
2. ✅ Circuit breaker prevents crashes on timeout
3. ✅ Metrics are logged and displayed
4. ✅ Fallback to cache/baseline works
5. ✅ No blocking errors in console
6. ✅ Ticket creation flow remains smooth

### Integration Needs Fixing If:

1. ❌ YDT suggestions never appear
2. ❌ System crashes on YDT timeout
3. ❌ Metrics not logging
4. ❌ Fallback not working
5. ❌ Console errors blocking functionality
6. ❌ Ticket creation flow broken

---

## 🚀 NEXT STEPS AFTER INTEGRATION

### Day 1-2: Monitor & Validate

1. Monitor dashboard metrics
2. Collect agent feedback
3. Track acceptance rate
4. Document any issues

### Day 3-7: Analyze & Decide

1. Calculate Week 1 metrics
2. Use Week 2 Go/No-Go decision tree
3. Plan Week 2 based on data
4. Document Week 1 review

---

## 📞 SUPPORT

### If Integration Fails

1. **Check error messages** in browser console
2. **Verify all files exist** (use checklist above)
3. **Test in isolation** (create minimal test page)
4. **Review code** for TypeScript errors
5. **Check YDT service** is operational

### If You Need Help

1. Review this integration guide
2. Check `WEEK1_REVIEW_MEMO.md` for troubleshooting
3. Review code comments in implementation files
4. Check browser console for specific errors

---

**INTEGRATION STATUS:** ⚠️ **PENDING**  
**ESTIMATED TIME:** 2-4 hours  
**DIFFICULTY:** Medium (requires code changes)

**"Integration is the moment of truth. Test thoroughly."**

