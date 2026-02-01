# Keyboard Shortcut Architecture — ALMONA
Version: 1.0.0
Updated: 2026-01-07
Owners: FE Lead, UX

Objective
Provide a centralized, conflict-free, accessible keyboard shortcut system with 85%+ parity to industry leaders. The system must normalize platforms (Win/macOS), handle scopes (global/workspace/modal), avoid hijacking text inputs, and maintain performance.

Non-Functional Requirements
- Performance: Single top-level listener per scope; no jank; minimal allocations; remove listeners on unmount.
- Accessibility: Respect text input behavior; visible focus; discoverability via help modal (?); users can disable/override (phase 2+).
- Reliability: Deterministic conflict resolution; robust in presence of nested components; no memory leaks.
- Testability: QA matrix in qa/KeyboardShortcutTestMatrix.csv; automated tests for registry and handler resolution.

Architecture Overview
- KeyboardContext (Provider)
  - Detects platform (Win/macOS/Linux); normalizes modifiers (Cmd→Ctrl abstraction).
  - Manages active scopes: global, workspace, modal.
  - Exposes API to register/unregister handlers at runtime with priorities.
  - Maintains focus-aware state: whether an editable element is focused.

- useKeyboardShortcuts Hook
  - Signature: useKeyboardShortcuts(registry: ShortcutRegistry, enabled: boolean, options?: UseShortcutOptions)
  - Registers a local registry into the active scope.
  - Handles event.preventDefault only if necessary to suppress unwanted browser behavior.
  - Guards against event.repeat if repeat is undesired.

- ShortcutRegistry
  - Record<Chord, Handler> where Chord := string like "Ctrl+Z", "Shift+F", "?".
  - Handler: () => void | boolean (return false to indicate fallback/propagate if needed).
  - Supports wildcards or aliases if required later (e.g., "CmdOrCtrl" macro).

- Scope Resolution
  - Scopes: modal > workspace > global (priority).
  - If multiple entries for the same chord exist, the more specific scope wins.
  - Within a scope, last-in wins (later registrations override earlier ones), with a development warning logged.

- Focus Safety
  - If focus is in input/textarea/contenteditable:
    - Allow native edit chords (Undo/Redo/Cut/Copy/Paste) to pass through unless app explicit override is enabled.
    - Suppress global/workspace chords (e.g., drawing tools) to avoid hijacking typing.

- Event Strategy
  - Attach keydown listeners at document level only for active scopes.
  - Use passive: false only when preventDefault may be required (e.g., Delete to avoid browser back navigation).
  - Normalize event.key and modifiers into canonical chord string.

TypeScript Contracts
/*
export type ShortcutHandler = () => void | boolean;
export type ShortcutRegistry = Record<string, ShortcutHandler>;

export interface UseShortcutOptions {
  scope?: 'global' | 'workspace' | 'modal';
  preventDefault?: boolean; // default smart: true for non-text contexts where browser navigation may occur
  stopPropagation?: boolean; // default true
  allowInInputs?: string[]; // list of chords that are allowed in inputs, otherwise suppressed
}

export interface KeyboardContextValue {
  platform: 'windows' | 'macos' | 'linux';
  activeScope: 'global' | 'workspace' | 'modal';
  setActiveScope(scope: 'global' | 'workspace' | 'modal'): void;
  register(scope: 'global' | 'workspace' | 'modal', registry: ShortcutRegistry): () => void; // returns unregister
  isEditableFocused(): boolean;
  normalizeChord(e: KeyboardEvent): string; // maps Cmd→Ctrl on macOS
}

export function useKeyboardShortcuts(
  registry: ShortcutRegistry,
  enabled: boolean,
  options?: UseShortcutOptions
): void;
*/

Chord Normalization
- macOS:
  - Meta maps to logical Ctrl for registry match (so "Ctrl+Z" handlers work on mac as "Cmd+Z").
  - Keep Shift/Alt (Option) as-is.
- Windows/Linux:
  - Use Ctrl; ignore Meta for default chords.
- Represent plus as literal "+" (e.g., "+" or "=" keys for zoom in must be disambiguated using event.code if needed).

Conflict Examples and Policy
- Example: Ctrl+F in input fields
  - Native find in input should not be overridden; global search ("/" focus) is primary trigger.
- Example: Delete/backspace
  - In canvas/list, preventDefault to avoid browser back navigation.
  - In inputs, let native backspace work.

Discoverability & Help
- Help modal opens on "?" (global, not while typing).
- F1 opens context help for focused area.
- Include visual cue in toolbar when tools are selected via shortcuts.
- Provide a "View/Customize Shortcuts" link from modal (future enhancement).

Testing Strategy
- Unit: Normalize chord logic; registry merges; scope precedence; input safety.
- Integration: Canvas tool selection via shortcuts; modal suppression; global project commands.
- E2E: Cross-platform validation; ensure browser default behaviors remain correct in inputs.
- QA Matrix: See qa/KeyboardShortcutTestMatrix.csv, fill outcomes and notes.

Performance Considerations
- Avoid creating new handler closures on each render; memoize registries.
- Batch register/unregister operations; single listener per scope.
- Use requestAnimationFrame for repeated transform actions (e.g., key-hold zoom) when needed, with rate limiting.

Security & Telemetry
- No sensitive data in shortcut events.
- Optional telemetry: chord usage frequency for UX improvement (respect privacy/telemetry flags).

Rollout Plan
- Phase 1: Architecture and global/workspace handler with core chords implemented.
- Phase 2: Help modal, customization stubs, setting to disable/override.
- Phase 3: Analytics on usage (optional).

Acceptance Criteria
- 85%+ shortcuts in KEYBOARD_SHORTCUTS.md function as specified.
- No critical conflicts in text inputs or modals.
- Works on Windows and macOS with normalized chords.
- QA matrix passes with documented evidence.
