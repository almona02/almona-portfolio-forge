# Enhanced3DPreview Integration Guide

## Quick Integration into ProductionCommand.tsx

To integrate the Enhanced3DPreview component into your existing ProductionCommand workflow:

```typescript
// Add to imports
import { Enhanced3DPreview } from './Enhanced3DPreview';
import { FeatureFlagManager } from '@/lib/featureFlags';
import { FeedbackWidget } from '@/components/beta/FeedbackWidget';

// In ProductionCommand component, add state:
const [viewMode, setViewMode] = useState<'legacy' | 'enhanced'>('legacy');
const isDualOutputEnabled = FeatureFlagManager.isEnabled('DUAL_OUTPUT_BETA_ENABLED');

// In render, add toggle:
{isDualOutputEnabled && (
  <div className="flex items-center space-x-4 mb-4">
    <span className="text-sm font-medium">View Mode:</span>
    <div className="flex rounded-lg border border-gray-300 p-1">
      <button
        className={`px-3 py-1 text-sm rounded ${
          viewMode === 'legacy' 
            ? 'bg-blue-600 text-white' 
            : 'bg-white text-gray-700'
        }`}
        onClick={() => setViewMode('legacy')}
      >
        Legacy (99.8%)
      </button>
      <button
        className={`px-3 py-1 text-sm rounded ${
          viewMode === 'enhanced' 
            ? 'bg-blue-600 text-white' 
            : 'bg-white text-gray-700'
        }`}
        onClick={() => setViewMode('enhanced')}
      >
        Enhanced (85% + 99.8%)
      </button>
    </div>
  </div>
)}

// Conditionally render Enhanced3DPreview:
{viewMode === 'enhanced' && isDualOutputEnabled && project ? (
  <Enhanced3DPreview 
    windowUnit={project}
    onValidationChange={(validation) => {
      // Store validation results
      console.log('Validation:', validation);
    }}
  />
) : (
  // Existing legacy view
  <div className="legacy-production-view">
    {/* Existing ProductionCommand content */}
  </div>
)}

// Add feedback widget for beta testers:
{isDualOutputEnabled && (
  <FeedbackWidget 
    feature="dual-output-preview"
    context={`project-${project?.id}`}
  />
)}
```

## Feature Flag Configuration

### Enable for Specific Workshop
```typescript
import { FeatureFlagManager } from '@/lib/featureFlags';

// Enable dual-output for a beta workshop
FeatureFlagManager.enableForWorkshop('workshop_alpha', 'DUAL_OUTPUT_BETA_ENABLED');
```

### Environment Variables
```bash
# .env.local
NEXT_PUBLIC_ENABLE_DUAL_OUTPUT=true
NEXT_PUBLIC_ENABLE_PATTERN_SUGGESTIONS=false
NEXT_PUBLIC_ENABLE_WEB_WORKERS=true
```

## Running Audit & Benchmarks

### Pattern Library Audit
```bash
npx ts-node scripts/audit-patterns.ts
# Output: pattern-audit-report.json
```

### Performance Benchmarks
```bash
npx ts-node scripts/benchmark-dual-output.ts
# Output: dual-output-benchmark-report.json
```

### Launch Readiness Check
```bash
npx ts-node scripts/launch-readiness-checklist.ts
# Output: launch-readiness-report.json
```

## Beta Testing Workflow

### Enroll Workshop
```typescript
import { betaTestingFramework } from '@/lib/beta/betaTestingFramework';

const tester = await betaTestingFramework.enrollWorkshop(
  'workshop_alpha',
  ['dual-output-preview', 'enhanced-3d']
);
```

### Generate Beta Report
```typescript
await betaTestingFramework.generateBetaReport();
// Output: beta-testing-report.json (or localStorage in browser)
```

## Next Steps

1. **Run Pattern Audit** - Identify incomplete patterns
2. **Run Benchmarks** - Verify performance targets
3. **Select Beta Workshops** - Choose 3 priority customers
4. **Enable Features** - Use FeatureFlagManager
5. **Monitor Feedback** - Watch beta-testing-report.json
6. **Update Launch Checklist** - Track progress

