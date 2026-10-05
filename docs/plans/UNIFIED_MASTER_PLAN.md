# UNIFIED MASTER PLAN: Almona Portfolio Forge
**"Accuracy Meets Excellence"**

**Date:** January 17, 2026
**Strategic Focus:** Merging **Constitutional Integrity** (Truth) with **Gold-Tier UX** (Beauty).

---

## 1. Executive Vision

This plan supersedes all previous planning documents (`DRAFTING_GAPS_...`, `ALMONA_UX_...`, `ACCURATE_PROJECT_...`). It acknowledges that we have successfully hardened the core (Drafting/Engine) and verified its reality. The next phase is to wrap this robust engine in a world-class, "Gold-Tier" user experience, while maintaining the rigorous verification standards we have established.

**The Directive:**
1.  **Truth:** Never claim a feature exists unless verified by line count and functionality.
2.  **Beauty:** Every UI interaction must feel "Premium" (Transitions, Shadows, Typography).
3.  **Speed:** 60fps performance is a non-negotiable requirement.

---

## 2. The 4-Phase Roadmap

### 🏁 Phase 0: Baseline Verification (Completed/Ongoing)
**Source:** `ACCURATE_PROJECT_PLAN.md`
*   ✅ **Drafting Integrity:** Verified `ApexEngineV2` (845 lines) and `DraftingWorkbench` (1,420 lines).
*   ✅ **Component Audit:** Confirmed existence of `GoldTier` components.
*   ✅ **Export Parity:** PDF verified complete; DWG deferred to server-side.
*   **Ongoing Rule:** Any new code written in subsequent phases must pass the "Reality Check" (File existence + Line count checks).

### 🎨 Phase 1: The "Gold Tier" Visual Upgrade (Weeks 1-2)
**Source:** `ALMONA_UX_EXECUTION_PLAN_GOLD_TIER.md` (Visual Polish Foundation)
*   **Objective:** Replace "Prototype" feel with "Professional" feel.
*   **Key Deliverables:**
    *   [x] **Design System:** Implement the "Gold" Shadow & Typography systems (`src/styles/theme-gold.css`).
    *   [x] **Transitions:** Implement `src/lib/animations/motion.ts` (Smooth, 60fps Spring Physics).
    *   [x] **Component Polish:** Refactor `Button`, `Input`, `Card` to fully utilize the new Gold Tier system (deprecate old variants).
    *   [ ] **Micro-Interactions:** Add hover lifts, focus rings, and click ripples to *all* interactive elements.

### ⚡ Phase 2: Professional Interaction (Weeks 3-4)
**Source:** `ALMONA_UX_EXECUTION_PLAN_GOLD_TIER.md` (Keyboard/Touch)
*   **Objective:** Enable "Power User" workflows.
*   **Key Deliverables:**
    *   [x] **Command Palette:** `Ctrl+K` global command center (Implemented with `cmdk`).
    *   [ ] **Keyboard System:** AutoCAD-style shortcuts (`L` for Line, `C` for Circle) with a conflict manager.
    *   [ ] **Touch Gestures:** Pinch-to-zoom, two-finger pan (Critical for tablet users).
    *   [ ] **Macro Recorder:** Finalize and verify the Macro system.

### 🛡️ Phase 3: Performance & Hardening (Week 5)
**Source:** `ACCURATE_PROJECT_PLAN.md` (Verification)
*   **Objective:** Ensure the pretty UI doesn't break the robust engine.
*   **Key Deliverables:**
    *   [ ] **Lighthouse Score:** 95+ Performance, 100% Accessibility.
    *   [ ] **Bundle Analysis:** Ensure Gold Tier components don't bloat the bundle.
    *   [ ] **Stress Test:** 1000+ element drafting arrays with 60fps rendering.
    *   [ ] **Final Audit:** Re-run the `ACCURATE_PROJECT_PLAN` verification scripts.

---

## 3. Implementation Priorities (Next 5 Days)

This is the immediate execution list for the current sprint.

1.  **Consolidate Styling:**
    *   Create/Verify `src/styles/theme-gold.css` (combining shadows, type, colors).
    *   Ensure Tailwind config extends these accurately.

2.  **Animation Library:**
    *   Create `src/lib/animations/motion.ts` (Standardized spring physics).
    *   Apply to `DraftingWorkbench` tool selection.

3.  **Component Standardisation:**
    *   Audit current usages of `<Button>` vs `<ButtonGoldTier>`.
    *   Strategy: **Replace**, don't just add. Migrate 5 key screens to strictly use Gold Tier components.

## 4. Verification Standard

For every task marked "Complete":
1.  **File Check:** Does the file exist?
2.  **Line Count:** Does it have substantial logic?
3.  **Terminal Proof:** Can we import and run it?
4.  **Visual Proof:** Does it look like the "market leader" reference?

---

**Status:** APPROVED FOR EXECUTION
**Owner:** Antigravity Agent
**Constitution:** Tier 0 (No AI hallucination in verified stats)
