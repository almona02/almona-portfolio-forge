# ALMONA Spacing System — 4px Base Grid
Version: 1.0.0
Updated: 2026-01-07
Owner: Design System

Purpose
- Define a cohesive spacing rhythm for layout, components, and typography using a 4px base system.
- Improve visual hierarchy and consistency to support enterprise-grade polish and WCAG AA readability.

Scale
- Base unit: 4px
- Tokens:
  - XS: 4px
  - SM: 8px
  - MD: 16px
  - LG: 24px
  - XL: 32px
  - 2XL: 48px
  - 3XL: 64px

Usage Guidelines
- Vertical Rhythm:
  - Maintain consistent vertical spacing between sections using MD (16px) or LG (24px) as the default.
  - Use XL (32px) or 2XL (48px) to separate major page sections or stacked panels.
- Horizontal Spacing:
  - Default gutter inside cards and panels: MD (16px) or LG (24px).
  - Larger layouts (desktop) may use XL (32px) gutters for primary containers.
- Component Padding:
  - Buttons: Y = 8px (SM), X = 12–16px (SM–MD). Increase by size variant.
  - Inputs: Vertical 8–12px; Horizontal 12–16px; Ensure comfortable hit areas.
  - Cards: MD (16px) internal padding, LG (24px) for media or primary containers.
  - Modals/Dialogs: Content padding LG (24px) to XL (32px); footer/header MD–LG.
- Density Modes:
  - Comfortable (default): MD (16px) baseline spacing.
  - Compact (data-dense views): Reduce by one step (e.g., 16px → 8px) while preserving rhythm.
  - Spacious (marketing/hero): Increase by one step (e.g., 16px → 24px or 32px).

Do / Don’t
- Do:
  - Stick to the 4px multiples; avoid odd values that break rhythm.
  - Use larger spacing (LG/XL) to separate conceptually distinct blocks.
  - Respect accessibility and readability—avoid cramping text.
- Don’t:
  - Mix arbitrary spacings (e.g., 5px, 13px) that disrupt harmony.
  - Overuse XL/2XL inside dense UIs (tables, wizard forms) where scan speed matters.

Tailwind Mapping Guidance
- Prefer Tailwind spacing scale extended or mapped to the 4px base:
  - 1 = 4px, 2 = 8px, 4 = 16px, 6 = 24px, 8 = 32px, 12 = 48px, 16 = 64px
- Example classes:
  - px-4 py-2 → 16px X, 8px Y
  - p-4 md:p-6 → 16px mobile, 24px desktop
  - gap-4 md:gap-6 → 16px mobile, 24px desktop

Containers & Layout
- Page Container:
  - Max width: 1280–1440px for desktop UIs, with responsive breakpoints.
  - Side padding: 24–32px (LG–XL).
- Panel/Sidebar:
  - Internal padding: MD–LG.
  - Inter-section spacing: LG for grouping; MD for related items.
- Grids:
  - Default column gap: MD (16px), increase to LG (24px) on larger breakpoints.
  - Row gap: MD (16px) for forms; SM–MD for dense tables.

Accessibility
- Maintain adequate spacing for touch targets and keyboard navigation:
  - Touch targets min height: 40–44px
  - Focus outlines should not clip due to tight spacing
- Ensure whitespace supports scannability and visual grouping

Quality Checks (Phase 1 QA)
- Vertical rhythm is consistent across pages and panels
- Component paddings align to tokens
- No arbitrary non-4px values in CSS except for borders/hairlines
- Mobile density adjusted appropriately (compact where needed)
