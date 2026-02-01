# Fabricator Wiring Infrastructure

> **Reference:** AICS-001 §5.10.3 Intelligence Gate Enforcement  
> **Status:** Active  
> **Last Updated:** 2026-01-18

## Purpose

This directory contains the constitutional wiring infrastructure for fabricator components. All advisory and presentation components must be imported through these gates—never directly from `/future/`.

## Directory Structure

```
wiring/
├── gates/
│   └── AdvisoryGate.tsx    # Tier 2 and Presentation wrappers
├── styles/
│   └── advisory-boundaries.css  # Constitutional boundary styles
├── advisoryWiring.ts       # Single source of truth for advisory imports
└── README.md               # This file
```

## Usage

```typescript
// ✅ CORRECT: Import through advisory wiring
import { getAdvisoryComponent, ADVISORY_WIRING } from '@/lib/fabricator/wiring/advisoryWiring';

const AISuggestions = getAdvisoryComponent('AISuggestionPanel');

// ❌ WRONG: Direct import from /future/
import { AISuggestionPanel } from '@/future/advisory-panels/AISuggestionPanel';
```

## Tier Classifications

| Tier | Purpose | Gate Required |
|------|---------|---------------|
| **Tier 2** | Collaborative Intelligence | `AdvisoryGate.tier2()` |
| **Tier 2 Limited** | Suggestions only | `AdvisoryGate.tier2Limited()` |
| **Presentation** | Read-only, no AI | `AdvisoryGate.presentation()` |

## Constitutional Guarantees

1. All advisory components show visible tier boundaries
2. Human review requirements are clearly indicated
3. No state mutation from advisory components
4. Confidence thresholds are enforced
