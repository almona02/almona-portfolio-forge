# ALMONA Keyboard Shortcuts — Gold‑Tier Parity Map
Version: 1.0.0
Updated: 2026-01-07
Owner: Engineering + UX

Purpose
- Achieve 85%+ keyboard parity with industry leaders (Klaes/AutoCAD patterns).
- Standardize a conflict-free, accessible shortcut system spanning global, workspace, and modal contexts.
- Provide a contract for implementation and QA.

Platform Normalization
- Windows/Linux: Ctrl = Control, Meta = Windows key
- macOS: Cmd = Command (⌘), Ctrl = Control
- Use “Ctrl” in docs to mean “Ctrl on Win/Linux” and “Cmd on macOS” (auto-normalized by handler).
- Shift/Alt mean platform equivalents (⇧, ⌥ on macOS).

Context & Scope Rules
- Global: always active unless a modal or text input owns focus.
- Workspace: active within drafting/engineering canvases and related panels.
- Modal: only modal-specific shortcuts (Esc to close, Enter to confirm) are active; global/workspace are suspended.
- Text Inputs: editing safe mode — navigation/edit shortcuts disabled to avoid conflicts; standard edit keys (Ctrl/Cmd+C/X/V, Ctrl/Cmd+Z/Y) remain in text fields where native behavior is expected.

Conflict Resolution Policy
- Text fields have priority: prevent overriding native editing behavior unless explicitly allowed.
- The most specific scope wins (modal > workspace > global).
- If two handlers claim the same chord, the one registered later in the more specific scope is active; a warning is logged in dev mode.
- Provide a “Shortcut Inspector” (dev only) to debug effective handlers per element focus.

Discoverability
- Press ? to open the Keyboard Shortcuts modal (unless in text inputs).
- F1 opens context help in focused area.
- A printable “Cheat Sheet” is available from the modal.

======================================================================
1) Drawing Tools (Workspace)
======================================================================
- R → Rectangle (selectTool('rectangle'))
- C → Circle (selectTool('circle'))
- L → Line (selectTool('line'))
- A → Arc (selectTool('arc'))
- P → Polygon (selectTool('polygon'))
- M → Material selector (openMaterialPicker())
- H → Hardware tool (selectTool('hardware'))
- S → Structural tool (selectTool('structural'))
- T → Transform tool (selectTool('transform'))

Notes:
- If an input field is focused inside the properties panel, these are suspended.
- Provide visual feedback in toolbar when a tool is selected by shortcut.

======================================================================
2) Edit Operations
======================================================================
- Ctrl/Cmd+Z → Undo
- Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z → Redo (support both patterns)
- Ctrl/Cmd+X → Cut (focus-aware: text vs canvas selection)
- Ctrl/Cmd+C → Copy (focus-aware)
- Ctrl/Cmd+V → Paste (focus-aware; paste at cursor or centered)
- Delete/Backspace → Delete selected (Backspace should not navigate browser history)
- Ctrl/Cmd+A → Select All (workspace items if canvas focused)
- Ctrl/Cmd+D → Deselect (clear selection)

Notes:
- When in text fields, use native behavior for copy/cut/paste/undo/redo.
- Delete key must call preventDefault to avoid browser navigation regressions.

======================================================================
3) View Operations (Workspace)
======================================================================
- Home → Zoom to fit (zoomToFit())
- Ctrl/Cmd+0 → Reset view (resetZoom())
- + / = → Zoom in
- - → Zoom out
- Spacebar + Drag → Pan
- Middle Mouse Button → Pan (native mapping)
- Ctrl/Cmd + Mouse Wheel → Zoom (with clamp)

Notes:
- Respect prefers-reduced-motion for animated zooms/pans.

======================================================================
4) Project Operations (Global or Project Context)
======================================================================
- Ctrl/Cmd+N → New project (openNewProjectWizard())
- Ctrl/Cmd+O → Open project (openProjectDialog())
- Ctrl/Cmd+S → Save (saveProject())
- Ctrl/Cmd+Shift+S → Save As (saveAsDialog())
- Ctrl/Cmd+P → Print / Export dialog (printOrExport())

Notes:
- When modal dialogs intercept Enter/Esc, project shortcuts are suspended.

======================================================================
5) Help & Meta
======================================================================
- ? → Open Keyboard Shortcuts Modal (if not in text field)
- F1 → Context Help (focused area’s documentation)
- Ctrl/Cmd+/ → Quick Command Palette (optional, if implemented)

======================================================================
6) Selection & Navigation (Workspace)
======================================================================
- Arrow Keys → Nudge selection by small step (Shift+Arrow for larger step)
- Tab / Shift+Tab → Cycle through selectable items (deterministic order)
- G → Group selection (if supported)
- U → Ungroup selection (if supported)
- Ctrl/Cmd+G (hold) → Snap grid toggle (if supported)
- Shift+Click → Multi-select add/remove

======================================================================
7) Transform Operations (Workspace)
======================================================================
- Ctrl/Cmd+R → Rename selected (if textual naming is supported)
- Ctrl/Cmd+Shift+R → Reset transforms
- Ctrl/Cmd+Arrow → Rotate by step (optional)
- F → Flip horizontally
- Shift+F → Flip vertically
- M → Mirror across axis (context prompt)

======================================================================
8) Measurement/Properties (Workspace)
======================================================================
- E → Edit properties (focus first editable field in Properties Panel)
- Enter → Confirm edits in properties panel
- Esc → Cancel current operation/close editor

======================================================================
9) Filters/Search (Projects Page)
======================================================================
- / → Focus search bar
- Ctrl/Cmd+F → Open in-page search (primary app search preferred when not in inputs)
- Enter in search → Execute search
- Esc → Clear or close search results

======================================================================
10) Bulk Operations (Projects/Positions)
======================================================================
- Shift+Click → Range select (grid/list)
- Ctrl/Cmd+Click → Toggle select
- Ctrl/Cmd+A → Select all
- Delete → Bulk delete (with confirmation)
- Ctrl/Cmd+E → Bulk edit dialog
- Ctrl/Cmd+Shift+E → Bulk export dialog

======================================================================
Implementation Guidance
======================================================================
Architecture
- Hook: useKeyboardShortcuts(registry, enabled)
- Context Provider: KeyboardContext provides platform detection and normalized event data.
- Registry supports multiple scopes (global/workspace/modal) with priority resolution.
- Ensure passive listeners where appropriate; call preventDefault only when needed to suppress browser behavior.

Normalization & Handling
- Convert macOS Cmd to logical Ctrl in registry for unified mapping.
- Ignore chords when focus is inside editable inputs/textareas unless the chord is an edit-native key (Undo/Redo/Cut/Copy/Paste).
- Use event.repeat guard to avoid repeat-trigger behaviors where not wanted.
- Support multi-modifier combos consistently (Ctrl+Shift+Key).

Accessibility
- Shortcut help modal lists all shortcuts with context, conflict notes, and localization.
- Users can disable/override shortcuts in settings (phase 2+ enhancement).
- Provide ARIA roles and headings for the help modal for screen readers.

Performance
- Register one top-level keydown listener per scope; avoid many individual listeners.
- Debounce high-frequency operations (e.g., holding keys for zoom) to appropriate intervals.
- Remove listeners on unmount; test memory leaks.

Testing & QA (see qa/KeyboardShortcutTestMatrix.csv)
- Validate on Windows and macOS.
- Test within:
  - Global (no modals, no text focus)
  - Workspace (canvas focused)
  - Modal open
  - Text input focus (properties panel, forms)
- Verify no conflicts and correct prevention of default browser behaviors.

Acceptance Criteria
- 85%+ of mapped shortcuts function as specified.
- No critical conflicts in text fields or modals.
- Help modal (?) and context help (F1) implemented.
- Cross-platform parity verified (Windows/macOS).
