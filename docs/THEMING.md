# Application palettes

One `next-themes` provider wraps loading/error states and the router. Root `.light` / `.dark` classes control Tailwind, native form controls, Fabricator helpers, admin screens, and Radix portals under `body`. Pages must not force independent color schemes.

| Mode | Workspace | Raised surface | Text |
| --- | --- | --- | --- |
| Light: RAL 1013 Oyster White | `#E3D9C6` | `#F5F0E6` | `#252526` |
| Dark: RAL 9004 Signal Black | `#2B2B2C` | `#333334` | `#F5F1E8` |

These are screen approximations, not paint color certification. References: [Oyster White](https://hues.page/ral-colors/1013), [Signal Black](https://hues.page/ral-colors/9004). HSL channels live in `src/styles/app-palettes.css`. Blue/gold brand accents remain separate from workspace and text colors.

## Component roles

Use `bg-background text-foreground` for pages, `bg-card text-card-foreground` for panels, `bg-popover text-popover-foreground` for menus, `bg-muted text-muted-foreground` for secondary surfaces, and `border-border` / `border-input` for boundaries. Opacity modifiers remain supported. Filled actions pair `bg-primary text-primary-foreground` or `bg-brand text-brand-foreground`. Selected/hover surfaces pair `bg-accent text-accent-foreground`. Status text uses `text-success`, `text-warning`, `text-destructive`, or `text-info`.

Avoid fixed gray/slate utilities in new UI. Photo overlays, CAD geometry/material swatches, and fixed brand actions can intentionally retain literal colors. Theme changes must not recolor exports or physical profile finishes. `text-white` is for inverse surfaces, not ordinary headings.

Use `useTheme` from `next-themes` and `components/theme/ThemeToggle`. `theme` is the saved preference (light/dark/system); `resolvedTheme` is the rendered palette. Fabricator's old toggle re-exports the shared component; convenience hooks forward to the global provider. Deprecated Zustand fields remain compatible with old saved preferences and are not consumed by active theme controls.

## Startup

`public/theme-init.js` runs in the head before the application, validates stored preferences, handles restricted storage, and imports a legacy Fabricator preference only if no global choice exists. `next-themes` owns later persistence, OS changes and cross-tab storage events. Settings offers three preferences; shared toggles choose light/dark. Native color scheme and toolbar color follow the resolved mode. Avoid per-component DOM listeners and whole-tree theme animations.

## Verification

`npm run test:theme` checks startup, corrupt/blocked storage, legacy precedence, normal-text WCAG AA contrast (4.5:1), toggles, system changes, cross-tab updates and root inheritance by portals. Startup/contrast tests run in Full Pipeline; React tests run in the frontend suite. Token checks do not certify every page or image overlay. Review representative pages, menus/dialogs, focus, RTL and narrow screens when adding UI.

## Initial migration validation

The RAL palette rollout replaces neutral utility colors across the existing UI rather than adding an override for each page. No manufacturing calculations, physical swatches, API permissions, or dependency versions are changed. Integration checks: 352 frontend test files passed (2,219 tests), five startup/contrast checks passed, and the type regression gate retained six existing errors with no new signatures or occurrence increases. Browser checks cover the real shared menu/dialog primitives, saved preference reload, cross-tab synchronization and a mobile RTL layout. The production marketplace route was visually reviewed in the light palette. Authenticated role dashboards still require normal signed-in preview review; token contrast checks are not a certification of every rendered page.
