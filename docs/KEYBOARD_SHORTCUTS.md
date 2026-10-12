# PACT OS Keyboard Shortcuts & Modal Navigation Specification

This document is the canonical reference for keyboard shortcuts, modal and overlay navigation, focus trapping, and keyboard accessibility across **PACT OS**.

> [!NOTE]
> All shortcuts and behaviors documented here are verified against the actual repository source code. Planned, reserved, or visual-only shortcuts are explicitly distinguished from active, implemented keybindings.

---

## Table of Contents

1. [Key Notation Conventions](#1-key-notation-conventions)
2. [Platform Differences & Modifiers](#2-platform-differences--modifiers)
3. [Master Global Keyboard Shortcuts Matrix](#3-master-global-keyboard-shortcuts-matrix)
4. [Universal Command Palette Navigation](#4-universal-command-palette-navigation)
5. [Focus Timer Keyboard Interactions](#5-focus-timer-keyboard-interactions)
6. [Modal & Overlay Navigation Specification](#6-modal--overlay-navigation-specification)
7. [Context & Feature-Specific Keybindings](#7-context--feature-specific-keybindings)
8. [Accessibility (a11y) & Focus Management](#8-accessibility-a11y--focus-management)
9. [Input Exceptions & Browser Caveats](#9-input-exceptions--browser-caveats)
10. [Implementation Architecture & Limitations](#10-implementation-architecture--limitations)
11. [Maintenance Policy](#11-maintenance-policy)

---

## 1. Key Notation Conventions

This reference follows standardized formatting across all tables and descriptions:

- **Combinations (`+`)**: Keys joined by a plus sign must be pressed simultaneously (e.g., `Cmd + K` or `Ctrl + K`).
- **Sequential Sequences (`then`)**: Keys separated by "then" must be pressed in sequence (e.g., `G then T`). *(Note: Sequence hotkeys are currently reserved; see [Section 10](#10-implementation-architecture--limitations)).*
- **Case-Insensitive Handling**: Key listeners in PACT OS evaluate key strings case-insensitively unless Shift is explicitly required.
- **`<kbd>` Tag Styling**: Keys are presented in monospace pill notation (`Esc`, `Tab`, `Enter`).

---

## 2. Platform Differences & Modifiers

PACT OS standardizes primary modifier handling through an internal abstraction (`mod`):

| Abstract Modifier | macOS Equivalent | Windows & Linux Equivalent | DOM Implementation |
| :--- | :--- | :--- | :--- |
| `mod` | **Command (`Cmd` / `⌘`)** | **Control (`Ctrl`)** | `e.metaKey \|\| e.ctrlKey` |
| `alt` / `option` | **Option (`⌥`)** | **Alt** | `e.altKey` |
| `shift` | **Shift (`⇧`)** | **Shift** | `e.shiftKey` |
| `ctrl` | **Control (`⌃`)** | **Control (`Ctrl`)** | `e.ctrlKey` |

### Platform-Specific Details
- **Command vs. Control**: On macOS, users press `Cmd + K`. On Windows and Linux, users press `Ctrl + K`. Both trigger identical actions through `(e.metaKey || e.ctrlKey)`.
- **Browser Collision Prevention**: PACT OS avoids overriding browser-reserved defaults such as `Cmd/Ctrl + W` (close tab), `Cmd/Ctrl + T` (new tab), or `Cmd/Ctrl + R` (reload).
- **Default Suppression**: When a recognized PACT shortcut matches, the handler explicitly executes `event.preventDefault()` to stop default browser actions (such as focusing the browser address bar on `Cmd/Ctrl + K` in some browsers).

---

## 3. Master Global Keyboard Shortcuts Matrix

The following matrix documents active, globally accessible keyboard shortcuts in PACT OS:

| Key Combination | Scope | Action | Accessibility & Focus Hints | Source Reference |
| :--- | :--- | :--- | :--- | :--- |
| <kbd>Cmd + K</kbd> *(macOS)*<br><kbd>Ctrl + K</kbd> *(Win/Linux)* | Global (Everywhere) | Toggle Universal Command Palette open or closed | Calls `preventDefault()`. Immediately moves focus to the command search input (`role="combobox"`). Works even when typing in input fields. | [`command-center-context.tsx`](../src/features/command-center/command-center-context.tsx) |
| <kbd>?</kbd> *(or <kbd>Shift + /</kbd>)* | Global (Outside form fields) | Open Keyboard Shortcuts Guide Modal | Calls `preventDefault()`. Activates focus trap (`createFocusTrap`) within the modal dialog. Suppressed when typing in `<input>`, `<textarea>`, or `contentEditable` elements. | [`keyboard-shortcuts-modal.tsx`](../src/components/ui/keyboard-shortcuts-modal.tsx) |
| <kbd>Esc</kbd> | Active Overlay / Modal | Close active modal, drawer, popover, or dropdown | Closes open overlay. Focus-trapped dialogs restore focus to the trigger element that originally opened the overlay. | [`focus-trap.ts`](../src/lib/a11y/focus-trap.ts)<br>[`modal.tsx`](../src/components/ui/modal.tsx) |
| <kbd>Esc</kbd> | Active Selection | Clear multi-item selection in Bulk Action Toolbar | Invokes `onClear()`. Dismisses floating selection bar without affecting underlying items. | [`bulk-action-toolbar.tsx`](../src/components/ui/bulk-action-toolbar.tsx) |

---

## 4. Universal Command Palette Navigation

When the Universal Command Palette is opened (`Cmd + K` / `Ctrl + K`), keyboard control is handled inside the modal:

| Key Combination | Scope | Action | Event Behavior |
| :--- | :--- | :--- | :--- |
| <kbd>↓</kbd> *(Arrow Down)* | Command Palette Input | Select next command or entity | Moves highlight downward. Wraps smoothly from the last item back to the first item (`getNextSelectedIndex`). Calls `preventDefault()`. |
| <kbd>↑</kbd> *(Arrow Up)* | Command Palette Input | Select previous command or entity | Moves highlight upward. Wraps smoothly from the first item to the last item. Calls `preventDefault()`. |
| <kbd>Home</kbd> | Command Palette Input | Jump to first search result | Clamps selection to index `0`. Calls `preventDefault()`. |
| <kbd>End</kbd> | Command Palette Input | Jump to last search result | Clamps selection to `flattenedItems.length - 1`. Calls `preventDefault()`. |
| <kbd>Enter</kbd> | Command Palette Input | Execute highlighted command | Triggers route navigation (`router.push`) or opens the corresponding quick-action modal. Calls `preventDefault()`. |
| <kbd>Esc</kbd> | Command Palette Input | Close Command Palette | Dismisses the modal and returns the user to the underlying view. Calls `preventDefault()`. |
| <kbd>Cmd + K</kbd> / <kbd>Ctrl + K</kbd> | Command Palette Input | Toggle Command Palette closed | Global listener detects modifier combination and closes the modal. Calls `preventDefault()`. |

### Command Palette Focus & Scroll Behaviors
- **Autofocus**: On mount, focus is automatically set to the search input (`inputRef.current?.focus()`).
- **Autoscroll**: As the highlighted index changes via arrow keys, the active element is smoothly scrolled into view (`scrollIntoView({ block: 'nearest', behavior: 'smooth' })`).
- **Debounced Search**: Typing queries triggers a debounced (150ms) search transition across tasks, goals, projects, and transactions without interrupting keyboard typing cadence.

---

## 5. Focus Timer Keyboard Interactions

The Focus Timer (`/app/focus`) manages deep work countdowns and stopwatch sessions.

### Implemented Focus Timer Behavior
- **Native Keyboard Activation**: In the active timer display (`FocusTimerDisplay`), all primary controls (Resume, Pause, Complete, Abandon, Wake Lock, Sound Toggle) are standard accessible `<button>` elements.
- **<kbd>Tab</kbd> / <kbd>Shift + Tab</kbd>**: Cycles through the active controls with prominent focus rings (`focus-visible`).
- **<kbd>Enter</kbd> or <kbd>Space</kbd>**: Activates whichever control currently holds focus.

### Verified Limitation: Global Timer Shortcut
> [!IMPORTANT]
> While the Keyboard Shortcuts cheat sheet modal lists `Space` as an action hotkey to *"Start / Pause active Focus Timer"*, `focus-timer-display.tsx` does **not** currently bind a global `window` listener for `Space`.
>
> Pressing `Space` while focus is not on the Pause/Resume button will scroll the page rather than toggling the timer. Binding a dedicated global timer shortcut is a tracked enhancement for future releases.

---

## 6. Modal & Overlay Navigation Specification

PACT OS employs distinct overlay layers across the user interface:

### 1. Focus-Trapped Modals
Implemented via `createFocusTrap()` in [`src/lib/a11y/focus-trap.ts`](../src/lib/a11y/focus-trap.ts). Currently utilized by:
- **Keyboard Shortcuts Guide** (`KeyboardShortcutsModal`)
- **Unsaved Changes Dialog** (`UnsavedChangesModal`)

**Behavior Specification:**
1. **Initial Focus**: On opening, searches for focusable elements (`a[href]`, `button:not([disabled])`, `input:not([disabled])`, `textarea:not([disabled])`, `select:not([disabled])`, `[tabindex]:not([tabindex="-1"])`) that are visible and not `aria-hidden`. Places immediate focus onto the first valid element.
2. **Tab Cycling**: Pressing <kbd>Tab</kbd> on the last element wraps focus back to the first element.
3. **Shift + Tab Cycling**: Pressing <kbd>Shift + Tab</kbd> on the first element wraps focus to the last element.
4. **Escape to Close**: Pressing <kbd>Esc</kbd> executes `preventDefault()`, fires the dismissal callback, and restores browser focus to the element that held focus prior to opening.
5. **Body Scroll Lock**: Sets `document.body.style.overflow = 'hidden'` while mounted and restores the previous overflow on unmount.

### 2. Standard Animated Modals
Implemented via `Modal` primitive in [`src/components/ui/modal.tsx`](../src/components/ui/modal.tsx). Used for forms and confirmation flows (e.g., `ProjectFormModal`, `GoalFormModal`, `DeleteGoalModal`).

**Behavior Specification:**
- **Escape Listener**: Binds a `keydown` listener to `window` when `isOpen` is true. Pressing <kbd>Esc</kbd> invokes `onClose()`.
- **Backdrop Dismissal**: Clicking the backdrop overlay dismisses the dialog if `closeOnBackdropClick` is enabled (default `true`).
- **Body Scroll Lock**: Prevents background body scrolling while active.
- **Accessibility Attributes**: Declares `role="dialog"`, `aria-modal="true"`, and dynamic `aria-labelledby` / `aria-describedby` IDs.

### 3. Popovers, Drawers & Dropdowns
- **Mobile Navigation Drawer** ([`app-header.tsx`](../src/components/ui/app-header.tsx)): Pressing <kbd>Esc</kbd> closes the drawer when open.
- **Notification Popover** ([`notification-popover.tsx`](../src/components/ui/notification-popover.tsx)): Closes on <kbd>Esc</kbd> or click-outside.
- **User Profile Dropdown** ([`user-profile-dropdown.tsx`](../src/components/ui/user-profile-dropdown.tsx)): Closes on <kbd>Esc</kbd> or click-outside.

---

## 7. Context & Feature-Specific Keybindings

| Feature / Component | Key Combination | Action | Guard / Condition | Source Reference |
| :--- | :--- | :--- | :--- | :--- |
| **Habit Streak Heatmap** | <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> | Navigate 2D grid cells across weeks and days | Roving `tabIndex` (`role="gridcell"`). Updates active coordinate and focuses target cell. Prevents default. | [`habit-streak-heatmap.tsx`](../src/components/analytics/habit-streak-heatmap.tsx) |
| **Search Input** | <kbd>Esc</kbd> | Clear current query | Triggers when the input has non-empty text. Clears value and calls `preventDefault()`. | [`search-input.tsx`](../src/components/ui/search-input.tsx) |
| **Habit Completion Note** | <kbd>Enter</kbd> | Save completion reflection | Commits note to backend. | [`habit-card.tsx`](../src/features/habits/components/habit-card.tsx) |
| **Habit Completion Note** | <kbd>Esc</kbd> | Cancel editing note | Reverts input state without saving. | [`habit-card.tsx`](../src/features/habits/components/habit-card.tsx) |
| **Weekly Review Priorities** | <kbd>Enter</kbd> | Add new priority to weekly plan | Adds item to priorities array (up to 5 items max). Calls `preventDefault()`. | [`planning-step.tsx`](../src/features/weekly-review/components/steps/planning-step.tsx) |
| **Notification Settings** | <kbd>Enter</kbd> / <kbd>Space</kbd> | Toggle custom notification switch | Custom switch button (`tabIndex={0}`). Calls `preventDefault()` and inverts boolean state. | [`notification-settings-card.tsx`](../src/features/settings/components/notification-settings-card.tsx) |

---

## 8. Accessibility (a11y) & Focus Management

PACT OS implements keyboard accessibility conforming to baseline standards:

1. **Logical Tab Order**: Interactive elements follow natural visual order in the DOM. Floating bars and drawer overlays are rendered with appropriate `z-index` and conditional listeners.
2. **Visible Focus Rings**: All interactive buttons, links, inputs, and custom checkboxes feature prominent `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50` (or `focus-visible:ring-[#d4af37]`) indicators.
3. **Screen Reader Semantics**:
   - Modals define `role="dialog"` or `role="alertdialog"`, `aria-modal="true"`, and label references.
   - Heatmap uses `role="grid"`, `role="row"`, and `role="gridcell"` with detailed screen-reader labels (e.g., *"Oct 6, 2026: 4 of 5 habits completed"*).
   - Command palette input uses `role="combobox"`, `aria-autocomplete="list"`, and `aria-expanded`.
4. **Focus Restoration**: Components using `createFocusTrap()` cache `document.activeElement` when opened and restore focus to that element upon dismissal.

---

## 9. Input Exceptions & Browser Caveats

### Form Input Suppression
To prevent accidental triggers while users write task titles, reflection notes, or journal entries:
- Single-key shortcuts such as <kbd>?</kbd> check the event target. If `target.tagName === 'INPUT'`, `target.tagName === 'TEXTAREA'`, or `target.isContentEditable` is true, the shortcut is **ignored**.
- Modifier-based shortcuts (<kbd>Cmd + K</kbd> / <kbd>Ctrl + K</kbd>) intentionally **bypass** this guard so power users can invoke the Command Palette from anywhere without having to click away first.

### Browser Zoom and Virtual Keys
- PACT OS uses `e.key` rather than `e.keyCode` or `e.which` to ensure consistent handling across modern browsers.
- Key chords do not intercept browser-native navigation keys (such as <kbd>F5</kbd>, <kbd>Ctrl + Tab</kbd>, or browser DevTools keys).

---

## 10. Implementation Architecture & Limitations

### Shortcut Infrastructure
PACT provides a dedicated programmatic registry class in [`src/lib/ui/shortcuts.ts`](../src/lib/ui/shortcuts.ts):
- Normalizes key combinations (`mod+k`, `shift+?`, `ctrl+shift+p`).
- Validates against duplicate registrations.
- Fully unit-tested in [`tests/shortcut-registry.test.ts`](../tests/shortcut-registry.test.ts).

### Verified Implementation Gaps (Planned vs. Active)
A comparison between the cheat sheet modal copy and active repository code reveals three planned shortcuts:

| Shortcut in Cheat Sheet Modal | Claimed Purpose | Current Implementation Status | Source Verification |
| :--- | :--- | :--- | :--- |
| <kbd>Space</kbd> | Start / Pause active Focus Timer | **Planned** — Not attached to `window`. Relies on browser-native button focus. | [`focus-timer-display.tsx`](../src/features/focus/components/focus-timer-display.tsx) |
| <kbd>G then T</kbd>, <kbd>G then P</kbd>, etc. | Navigate to workspaces (Tasks, Planner, Focus, etc.) | **Planned / Reserved** — No multi-key sequential chord listener exists in the app shell. | [`keyboard-shortcuts-modal.tsx`](../src/components/ui/keyboard-shortcuts-modal.tsx) |
| <kbd>C</kbd> / <kbd>C T</kbd> | Quick-capture new task or commitment | **Planned / Reserved** — Shortcut badges are displayed in `STATIC_QUICK_ACTIONS`, but no key listener is attached. | [`registry.ts`](../src/lib/command-center/registry.ts) |

---

## 11. Maintenance Policy

1. **Codebase Truth**: Whenever new keyboard shortcuts or modal listeners are introduced or modified in application code, this specification must be updated in the same pull request.
2. **No Fictitious Documentation**: Contributors must never document planned or intended hotkeys as functional without verifying that the corresponding DOM event listeners and handlers are implemented and tested.
3. **Link Integrity**: All relative file references in this document are audited by `scratch/check-links.mjs` during CI pipeline validation.
