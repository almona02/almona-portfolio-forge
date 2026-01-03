# Fabricator Authority & Responsibility Model

**Version:** 1.0 (Frozen)
**Status:** Active
**Purpose:** Defines the single source of truth for system authority, accuracy claims, and liability boundaries.

---

## 1. Accuracy Contract (Immutable)
These values are hardcoded in `src/lib/authority/ACCURACY_CONTRACT.ts` and must not change without legal review.

| Output Type | Accuracy Claim | Purpose | Liability Scope |
|-------------|----------------|---------|-----------------|
| **Visual Preview** | **85%** | Design Review, Customer Approval | "Artist's Impression" - Not for measurement. |
| **Production Data** | **99.8%** | CNC Execution, Cutting, BOM | **Full Liability**. Certified for manufacturing. |

## 2. Operation Modes
System behavior changes based on the active mode.

| Mode | Visual Indicator | Data State | User Rights |
|------|------------------|------------|-------------|
| **Sandbox** | 🧪 Gray/Blue | Ephemeral (Not Saved) | All overrides allowed. No audit log. |
| **Production** | 🏭 Orange | Persisted (Logged) | Standard validation. Overrides logged. |
| **Certified** | 🔒 Gold | Persisted (Audit Trail) | **Strict enforcement.** No overrides. Egyptian Code 2020 locked. |

## 3. Consequence Categories
All errors must map to one of these impact categories:

1.  **Machine:** Physical risk to equipment (Collision, Tool breakage).
2.  **Compliance:** Violation of building codes (EGY-2020, Saudi SBC).
3.  **Material:** Economic loss (Waste > 15%).
4.  **Legal:** Warranty voiding or liability exposure.
5.  **Financial:** Direct ROI impact.

## 4. Responsibility Matrix

| Action | Operator | Supervisor | Manager | Inspector |
|--------|----------|------------|---------|-----------|
| View Design | ✅ | ✅ | ✅ | ✅ |
| Edit Design | ❌ | ✅ | ✅ | ❌ |
| Override Safety | ❌ | ✅ (Prod) | ✅ (Prod) | ❌ |
| Export G-Code | ✅ | ✅ | ✅ | ❌ |
| Audit Logs | ❌ | ❌ | ✅ | ✅ |

---
**Signed:** Almona Product Engineering

