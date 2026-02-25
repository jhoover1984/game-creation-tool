# V2 Visual System Tokens

Status: In Progress (Phase 0+1 baseline implemented -- 2026-02-21).

## Purpose
Define token groups for consistent, low-fatigue, professional UI styling across dashboard and
editor surfaces. Token names are stable; values vary per theme and density.

---

## Token Architecture

### Two-Layer Model

**Layer 1 -- Primitives** (`--prim-*`)
Raw values only. Never consumed directly by components or selectors.
Examples: `--prim-navy-900: #1a1a2e`, `--prim-sp-2: 8px`.

**Layer 2 -- Semantic Aliases** (no prefix)
Assigned from primitives via `var(--prim-*)`. Components and selectors consume these only.
Examples: `--bg-base: var(--prim-navy-900)`, `--panel-padding: var(--prim-sp-2)`.

---

## Adoption Rules

1. **Components use semantic aliases only.** Never reference `--prim-*` outside `:root`.
2. **Raw hex/px literals are allowed only inside `:root` primitive definitions.** Anywhere else
   is a violation unless explicitly commented with justification.
3. **Structural values** (e.g. `inset: 0`, `width: 100%`, grid column counts) are exempt from
   tokenization -- they express layout constraints, not design decisions.
4. **Sub-scale spacing values** (e.g. `6px`, `14px`, `16px`) that fall between 8px-scale steps
   are deferred to Phase 2 (CSS extraction). They must not be new raw hex colors.
5. **Status/semantic colors** (`--status-ok-*`, `--status-warn-*`, `--status-err-*`) must be
   used for all health badges, trace indicators, and diagnostic markers.

---

## Canonical Token Table

### Primitive Color
| Token | Value |
|---|---|
| `--prim-navy-900` | `#1a1a2e` |
| `--prim-navy-800` | `#121426` |
| `--prim-navy-700` | `#16213e` |
| `--prim-navy-600` | `#1b1f35` |
| `--prim-blue-700` | `#0f3460` |
| `--prim-blue-600` | `#1a5276` |
| `--prim-blue-400` | `#5dade2` |
| `--prim-slate-200` | `#e0e0e0` |
| `--prim-slate-300` | `#93a0c9` |
| `--prim-slate-400` | `#97a1c6` |
| `--prim-border-base` | `#333` |
| `--prim-border-panel` | `#2a2f4b` |
| `--prim-border-input` | `#3a415d` |
| `--prim-green-bg` | `#1a5e3a` |
| `--prim-green-txt` | `#6fcf97` |
| `--prim-amber-bg` | `#5e4b1a` |
| `--prim-amber-txt` | `#f2c94c` |
| `--prim-red-bg` | `#5e1a1a` |
| `--prim-red-txt` | `#eb5757` |

### Primitive Typography
| Token | Value |
|---|---|
| `--prim-font-ui` | `'Segoe UI', system-ui, sans-serif` |
| `--prim-font-mono` | `'Consolas', 'Cascadia Code', monospace` |
| `--prim-size-xs` | `11px` |
| `--prim-size-sm` | `12px` |
| `--prim-size-md` | `13px` |
| `--prim-size-lg` | `14px` |
| `--prim-size-xl` | `18px` |

### Primitive Spacing (8px base scale)
| Token | Value |
|---|---|
| `--prim-sp-1` | `4px` |
| `--prim-sp-2` | `8px` |
| `--prim-sp-3` | `12px` |
| `--prim-sp-4` | `16px` |
| `--prim-sp-5` | `24px` |

### Primitive Radius
| Token | Value |
|---|---|
| `--prim-r-sm` | `3px` |
| `--prim-r-md` | `4px` |
| `--prim-r-lg` | `8px` |

### Primitive Motion
| Token | Value |
|---|---|
| `--prim-duration-fast` | `0.1s` |
| `--prim-duration-normal` | `0.2s` |
| `--prim-easing` | `ease` |

### Semantic Aliases
| Token | Maps to |
|---|---|
| `--bg-base` | `--prim-navy-900` |
| `--bg-surface` | `--prim-navy-800` |
| `--bg-raised` | `--prim-navy-700` |
| `--bg-input` | `--prim-navy-600` |
| `--bg-accent` | `--prim-blue-700` |
| `--bg-accent-hover` | `--prim-blue-600` |
| `--text-primary` | `--prim-slate-200` |
| `--text-muted` | `--prim-slate-400` |
| `--text-heading` | `--prim-slate-300` |
| `--border` | `--prim-border-base` |
| `--border-panel` | `--prim-border-panel` |
| `--border-input` | `--prim-border-input` |
| `--status-ok-bg` | `--prim-green-bg` |
| `--status-ok-text` | `--prim-green-txt` |
| `--status-warn-bg` | `--prim-amber-bg` |
| `--status-warn-text` | `--prim-amber-txt` |
| `--status-err-bg` | `--prim-red-bg` |
| `--status-err-text` | `--prim-red-txt` |
| `--font-ui` | `--prim-font-ui` |
| `--font-mono` | `--prim-font-mono` |
| `--text-xs` | `--prim-size-xs` |
| `--text-sm` | `--prim-size-sm` |
| `--text-lg` | `--prim-size-lg` |
| `--text-xl` | `--prim-size-xl` |
| `--sp-1` .. `--sp-5` | `--prim-sp-1` .. `--prim-sp-5` |
| `--r-sm / --r-md / --r-lg` | `--prim-r-sm/md/lg` |
| `--panel-padding` | `--prim-sp-2` |
| `--section-gap` | `--prim-sp-3` |
| `--row-gap` | `--prim-sp-1` |
| `--control-height` | `28px` (literal -- density override target) |
| `--inspector-width` | `260px` (literal -- layout constraint) |
| `--duration-fast` | `--prim-duration-fast` |
| `--duration-normal` | `--prim-duration-normal` |
| `--easing` | `--prim-easing` |
| `--focus-ring` | `0 0 0 2px var(--prim-blue-400)` |

---

## Density Overrides

`data-density` attribute is decoupled from `data-mode` (UI-VISUAL-002 Slice B, shipped).
`data-mode` controls feature surface visibility only. `data-density` controls spacing/size only.

`data-density` contract:
- `data-density="comfort"` -- default spacing (shell root default; no overrides needed)
- `data-density="dense"` -- compact overrides
- Toggled via `EditorShellController.setDensity(density: 'comfort' | 'dense')`

Overrides in `[data-density="dense"]`:
- `--control-height`: 28px -> 22px
- `--row-gap`: 4px -> 2px
- `--panel-padding`: 8px -> 6px
- `--text-sm`: 12px -> 11px (via `--prim-size-xs`)

---

## Accessibility Rules

1. Focus ring (`--focus-ring`) is mandatory on all interactive elements via `focus-visible`.
2. All text contrast must support long-session readability (dark theme default).
3. `@media (prefers-reduced-motion: reduce)` must collapse all transition/animation durations.

---

## Deferred

- Light theme (`data-theme="light"`) -- Phase 4
- Separate `data-density` attribute -- Done (UI-VISUAL-002 Slice B)
- Elevation/shadow tokens -- Phase 4
- Token-lint CI gate -- Phase 6
