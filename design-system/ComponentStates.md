# ALMONA Component State Specifications
Version: 1.0.0
Updated: 2026-01-07
Owner: Design System

Purpose
Define canonical visual and interaction states for core UI components to achieve enterprise-grade polish, accessibility (WCAG 2.1 AA), and performance (transform/opacity-only animations where possible). These specifications align with ALMONA Dark Gold Prestige theme tokens.

Principles
- Predictable: Same state logic across components.
- Accessible: Keyboard reachable, visible focus, ARIA roles/labels.
- Performant: Use transform/opacity for transitions; avoid layout thrash.
- Theming: Driven by design tokens (colors/typography), not hard-coded values.

======================================================================
Buttons
======================================================================
Variants: primary, secondary, outline, ghost, destructive
Sizes: sm, md, lg (touch-friendly min height 40–44px)

States
- Default
  - Cursor: pointer
  - Background/Foreground/Border: per token mapping (see colors.json semantic.dark.interactive.button.*)
  - Shadow: none or subtle elevation for primary buttons
- Hover
  - Visual: transform: scale(1.02), transition: transform 150ms ease, will-change: transform
  - Background color: shift to hover token (e.g., amber.400 for primary)
  - Tooltip: optional; delayed 400–600ms for icon-only buttons
- Active
  - Visual: scale(0.99), darken/brighten towards active token
  - Remove hover shadow to indicate press
- Focus (Keyboard)
  - Focus ring: ring-2 ring-[accent] ring-offset-2; offset background-aware
  - No layout shift; ensure outline doesn’t clip
- Disabled
  - Opacity: 0.5
  - Cursor: not-allowed
  - No hover/active/focus effects
- Loading
  - Spinner placed before label (aria-hidden), role="progressbar" on spinner
  - Button treated as disabled (no pointer events, maintain focus ring if already focused)
  - Accessible label includes state (e.g., aria-live="polite" status text nearby for long ops)

A11y
- role="button" (native button preferred)
- Keyboard: Enter/Space triggers
- aria-busy for loading buttons where appropriate
- Focus management: return focus after dialogs close when triggered by button

======================================================================
Inputs (Text, Number, Password, etc.)
======================================================================
States
- Default
  - Background: semantic.dark.interactive.input.bg
  - Border: semantic.dark.interactive.input.border.default
  - Placeholder: 45% opacity per token
- Hover
  - Border: lighten by one step (do not reflow)
- Focus
  - Border: semantic.dark.interactive.input.border.focus (amber glow)
  - Box-shadow: 0 0 0 2px var(--ring) using focus ring tokens
  - Caret color: matches text color
- Error
  - Border: semantic.dark.interactive.input.border.error
  - Helper text: small, red tone with clear message
  - aria-invalid="true", link to error via aria-describedby
- Disabled
  - Background: subdued
  - Text: 60–70% opacity; placeholder slightly lighter
  - No focus ring
- Readonly
  - Same as default with cursor: default
  - Consider subtle background tint

A11y
- Label element with for= control id
- aria-required where applicable
- Descriptive helper text using aria-describedby
- Maintain 44px min height for touch targets

======================================================================
Select/Dropdown
======================================================================
States (Trigger)
- Default/Hover/Focus/Disabled: same patterns as Inputs
- Selected value visible with sufficient contrast
- Indicator icon spacing consistent; clickable area includes icon

Menu Panel
- Open/Close Animation: opacity 0 → 1 and translateY(4px → 0) over 150–200ms
- Backdrop: optional for full-screen overlays; otherwise elevation/shadow for context menus
- Items
  - Default: adequate padding (8–12px), clear text contrast
  - Hover: subtle background tint (transform/opacity only)
  - Active/Selected: left accent bar or checkmark; high contrast
  - Disabled: 50% opacity, no hover
- Keyboard Navigation
  - Arrow keys to move; Enter to select; Esc to close
  - Focus trapped within menu when open
- Typeahead Search (optional)
  - Buffer keystrokes to jump to matching items
  - Announce match count for screen readers

A11y
- role="combobox" with aria-expanded, aria-controls
- role="listbox" and role="option" for menu and items
- aria-activedescendant to track focus
- Ensure focus returns to trigger on close

======================================================================
Dialog/Modal
======================================================================
Structure
- Backdrop: semantic.dark.interactive.overlay.backdrop (60% opacity)
- Container: elevated surface with backdrop-filter: blur(10px) (verify perf)
- Header: title, optional subtitle; close button with focusable target
- Body: scrollable region if content exceeds viewport
- Footer: primary/secondary actions aligned to end; consistent spacing

States &amp; Motion
- Enter: opacity 0 → 1 and scale 0.98 → 1 over ~200ms ease-out
- Exit: opacity 1 → 0 and scale 1 → 0.98 over ~150ms ease-in
- Backdrop: fade in/out synchronized
- Focus Trap: initial focus on first interactive; Esc closes (configurable)
- Scroll Lock: disable body scrolling when open
- Responsive: full-screen modal on small screens when appropriate

A11y
- role="dialog" aria-modal="true"
- aria-labelledby and aria-describedby connected to title/content
- Ensure keyboard and screen reader users can reach all content
- Restore focus to invoking control on close

======================================================================
Cards
======================================================================
States
- Default: surface-1 background; subtle border (divider token)
- Hover (interactive cards only): subtle lift
  - transform: translateY(-1px), shadow elevation 150ms
- Selected (if applicable): left accent bar (amber) or border highlight
- Disabled: reduce opacity to 0.6 and remove elevation
- Content: standardized paddings (MD–LG) and heading hierarchy

A11y
- Interactive cards use role="button" if clickable; ensure Enter/Space support
- Headings structured (h2/h3) for screen reader navigation

======================================================================
Tooltips
======================================================================
- Delay: 400–600ms on hover; immediate on keyboard focus
- Placement: above/below with fallback
- Motion: opacity + slight translateY (150ms)
- A11y: For purely icon buttons, ensure aria-label or tooltip is accessible via screen reader

======================================================================
Toasts/Notifications
======================================================================
- Types: success, info, warning, error
- Duration: 3–6s default; persistent for critical errors until dismissed
- Motion: slide from edge using transform; 150–200ms
- A11y: aria-live="polite" for non-critical; "assertive" for critical; focusable close button

======================================================================
Status Bar &amp; Inline Feedback
======================================================================
- Colors: use status tokens (success/warning/error/info)
- Icons: consistent sizing (16–20px)
- Text: ensure contrast; avoid red-on-dark without adequate contrast
- Motion: minimal; use opacity transitions for appearance

======================================================================
Performance Rules
======================================================================
- Use transform and opacity for animations (GPU friendly), not top/left
- Prefer CSS transitions over JS where possible
- Reduce box-shadow blur radii for perf on low-end devices
- Avoid triggering layout/paint repeatedly (batch class changes)
- Prefers-reduced-motion: reduce or disable motion where user requests

======================================================================
Accessibility Rules
======================================================================
- Always visible focus indicators on interactive elements
- Color contrast: text≥4.5:1, large text≥3:1; icons/indicators≥3:1
- Keyboard support: Tab order, Enter/Space, Esc where applicable
- ARIA: roles consistent; labels and descriptions properly wired
- Do not rely on color alone to convey state

======================================================================
Testing &amp; QA
======================================================================
- Cross-browser: Chrome, Firefox, Safari, Edge (latest)
- Keyboard-only navigation across primary flows
- Screen reader pass (NVDA/JAWS/VoiceOver) for dialogs, menus, toasts
- Visual regression: snapshot where stable
- Performance: DevTools performance profile for transitions; 60fps target

======================================================================
Tailwind/shadcn Mapping Guidance
======================================================================
Examples (indicative; map tokens in tailwind.config.ts):
- Button (primary)
  - Base: "inline-flex items-center justify-center font-medium transition-transform duration-150 will-change-transform"
  - Colors: "bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]"
  - Hover: "hover:scale-[1.02]"
  - Focus: "focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-[var(--ring-offset)]"
  - Disabled: "disabled:opacity-50 disabled:cursor-not-allowed"
- Input
  - Base: "bg-[var(--input-bg)] text-[var(--input-fg)] placeholder-[var(--input-placeholder)] border border-[var(--input-border)]"
  - Focus: "focus:border-[var(--input-border-focus)] focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2"
  - Error: "data-[error=true]:border-[var(--input-border-error)]"
- Dialog
  - Backdrop: "bg-[color:var(--overlay-backdrop)]"
  - Panel: "backdrop-blur-md shadow-xl transition-transform duration-200"

Keep token-driven CSS variables for theming and dark/light switches.
