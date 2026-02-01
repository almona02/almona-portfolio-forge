# Golden Master Test Suite

**Purpose:** Validated, production-grade test cases that serve as the "source of truth" for accuracy validation.

**Supreme Source:** AICS-001 Section 7.5 (Deterministic Replay Guarantee)

---

## Structure

Each golden master file contains:

```json
{
  "id": "anchor_client_facade_project_A",
  "name": "Anchor Client - Project A (Unitized Curtain Wall)",
  "input": {
    // WindowUnit or BIM import data
  },
  "expectedBOM": {
    // Expected BOM output
  },
  "expectedCutList": {
    // Expected cut list output
  },
  "expectedAccuracy": 0.998,
  "validatedBy": "Anchor Client Technical Lead",
  "validatedAt": "2026-01-15",
  "notes": "Real project from anchor client validation"
}
```

---

## Adding Golden Masters

1. **Source:** Use real projects from anchor client validation
2. **Validation:** Must be validated by client technical lead
3. **Format:** JSON files in this directory
4. **Naming:** `{client}_{project_type}_{project_id}.json`

---

## Usage

```typescript
import { loadGoldenMaster } from '@/tests/constitutional/GuaranteeVerification.test';

const goldenMaster = loadGoldenMaster('anchor_client_facade_project_A');
const result = await runFullPipeline(goldenMaster.input);
expect(result.bom).toEqual(goldenMaster.expectedBOM);
```

---

**Status:** Placeholder - Add real golden masters from anchor client validation




















