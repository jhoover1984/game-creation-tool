# Visual Design System (v1)

Last updated: 2026-02-16
Owner: Frontend + UX
Scope: `v1-core` desktop/web shell

## Purpose
- Define one coherent visual language that is easy on the eyes and fast to scan.
- Keep UI upgrades low-risk while Sprint 2 runtime work continues.
- Provide implementation-ready tokens and component rules so styling does not drift.

## Current Status Snapshot
- Phase A (tokenization): Shipped.
- Phase B (component polish): Shipped (selector-stable CSS pass).
- Phase C (theme + density + perf polish): In Progress (runtime controls shipped; visual regression expansion pending).
- Phase D (visual personality): Planned.

Status source of truth:
- execution details: `docs/sprints/Sprint Plan.md`
- historical shipped record: `docs/CHANGELOG.md`

Companion implementation plan:
- `docs/frontend/UI UX Execution Plan.md` (prioritized delivery order, mockup intake decisions, and release gates)

## Design Principles
1. Viewport first: the map/playtest surface gets primary visual weight.
2. Calm chrome: neutral panels, low-noise borders, restrained shadows.
3. Color as meaning: accent for action, semantic colors for system state.
4. Progressive disclosure: beginner mode removes complexity, not capability.
5. Accessibility baseline: WCAG AA contrast and visible keyboard focus.
6. Entry clarity: first launch should begin at a dashboard, not a dense editor shell.

## Entry Surface Rules (Launch Dashboard)
1. Primary action is always visible above fold: `Create Project`.
2. Secondary actions are grouped and lower emphasis: `Open`, `Recent`, `Recover`, `Learn`.
3. Template cards include plain-language metadata:
   - time estimate
   - difficulty
   - what is prewired
4. Beginner defaults are explicit and visible:
   - profile default: `Game Boy`
   - UI mode default: `Beginner`
5. Dashboard layout should use card groups and strong section headings, not dense toolbars.

## Theme Modes
1. `dark` (default)
2. `light`
3. `dark_high_contrast`

## Core Tokens (Initial)
Use CSS variables in `apps/desktop/src/styles.css`.

```css
:root {
  --bg-0: #111317;
  --bg-1: #1a1e24;
  --panel: #222833;
  --panel-elevated: #283040;
  --border: #2f3745;
  --text-1: #e7ecf3;
  --text-2: #aeb8c7;
  --accent: #58a6ff;
  --accent-weak: #2d6fb7;
  --success: #4cc38a;
  --warning: #f2c14e;
  --error: #e16767;
  --focus: #7cc2ff;
}
```

Profile flavor accents (optional, sparing use):
- Game Boy: `--profile-accent: #8bd450`
- NES: `--profile-accent: #ff8c42`
- SNES: `--profile-accent: #49b6ff`

Rule: profile accents are decorative/supportive only. Primary interaction remains `--accent` for consistency.

## Typography and Density
- Base font size: `14px`
- Scale: `12 / 14 / 16 / 20 / 24`
- Spacing grid: `4px` base, primary layout uses `8px` multiples.
- Density presets:
  - `comfortable`: default panel spacing and row height
  - `compact`: reduced panel padding and row height for advanced users

## Iconography
- Use one icon set only across the product.
- Recommended set: Fluent System Icons (outlined) or Material Symbols (outlined).
- Sizes: `16`, `20`, `24` only.
- No mixed icon families.
- Icons must pair with text labels in primary workflows (beginner clarity).

## Component Visual Rules
### Topbar
- Keep height stable and minimal.
- Left: project identity + runtime/profile status.
- Center: primary create/play/export actions.
- Right: mode/theme/help/settings.

### Left Rail (Tools)
- Single-column icon + label entries.
- Active tool uses accent border + subtle background.
- Hover/pressed states use opacity and border change, not saturated fills.

### Inspector + Issues Drawer
- Shared panel language: same spacing, border, heading style.
- Severity styling:
  - error: `--error`
  - warning: `--warning`
  - info: `--accent`
- Always render one clear recovery action when available.

### Canvas + Playtest Viewport
- Internal game resolution remains profile-authentic.
- Presentation supports scalable zoom (`fit`, integer multipliers).
- Use crisp nearest-neighbor scaling for retro profiles.
- Keep overlay chrome outside pixel area when possible.

### Onboarding Panels
- Quick Start, Help, Walkthrough should share one card style.
- Each step includes: action, why it matters, expected outcome.
- Completion state offers exactly three follow-ups: playtest, export preview, restart.

## Motion and Interaction
- Motion budget: subtle and purposeful.
- Allowed transitions:
  - panel open/close
  - focus/selection highlight
  - walkthrough step focus hop
- Duration range: `120-180ms`.
- Respect reduced-motion preference (`prefers-reduced-motion`).

## Accessibility Baseline
- Text contrast >= 4.5:1 for normal body text.
- Interactive controls must have visible focus ring.
- Color cannot be the only signal for errors/warnings.
- Hit target minimum: `32x32` for desktop pointer controls.
- Keyboard path must reach all topbar actions and core editor actions.
- Tabs and grouped panels must follow ARIA keyboard patterns (arrow keys + Home/End where applicable).

## Implementation Plan (Low-Risk)
### Phase A: Tokenization (Shipped)
- Replace ad-hoc colors with design tokens.
- Do not change layout structure or DOM shape.
- Validate with existing smoke + Playwright suite.

### Phase B: Component polish (Shipped)
- Normalize topbar/rail/panel visual hierarchy.
- Introduce consistent icon sizing and button states.
- Keep selectors stable to avoid E2E churn.

### Phase C: Theme and density settings (In Progress)
- Shipped:
  - theme switcher wiring (`dark`, `light`, `dark_high_contrast`) with persisted preference.
  - density toggle wiring (`comfortable`, `compact`) with persisted preference.
  - runtime application through `body` data attributes and token overrides.
- Remaining:
  - maintain/extend snapshot set as new visual surfaces are added (theme/density core + responsive baseline is now in place).

### Phase D: Guided visual personality (Sprint 4+)
- Add profile accent flavoring and subtle brand surfaces.
- Keep this optional and non-blocking for core flow.

## Target Layout Architecture (Modern Shell)

The editor must feel like a modern creative tool (Figma, Linear), not an IDE or legacy editor.
These rules apply to all user profiles — pro users want power, not clutter.

### Dashboard
- Large clean hero with one primary CTA: "New Project"
- Secondary actions as subtle text links or small buttons, not a button grid
- Template gallery uses visual cards with preview thumbnails, not dropdown selectors
- Recent projects as a clean list with hover actions, not a dense table
- No visible dropdowns on the dashboard surface — use inline pickers or modal flows
- Empty state is friendly and directive, not a blank panel

### Editor Workspace — Layout Rules
1. **Maximize canvas**: the game viewport gets 70%+ of screen space at all times
2. **One sidebar, not two**: context panel on the right, toolbar strip on the left (icon-only, vertical)
3. **Contextual right panel**: shows content based on current action, not all sections at once
   - Nothing selected: scene overview (entity count, tile stats, quick actions)
   - Entity selected: that entity's properties and components
   - Paint tool active: tile palette and brush options
   - Playtest active: debug controls and watch panel
   - No empty sections ever visible
4. **Floating toolbar over canvas**: map tools (select/paint/erase/create) as a compact floating bar, not a fixed button row in the chrome
5. **Command palette (Ctrl+K)**: primary discovery mechanism for power features — keeps them accessible without cluttering the surface
6. **Bottom bar**: minimal status line (mode, selection count, project name). Log/trace expandable on demand, collapsed by default

### What to Remove from Persistent UI
- Playtest speed/zoom/breakpoint buttons — move to playtest overlay or command palette
- Overlay toggles (grid/collision/IDs) — move to command palette or right-click context menu
- Script Lab section — opens as a focused mode or modal, not a sidebar panel
- Audio Routing section — moves into entity inspector when relevant, or a focused mode
- Quick Start / Walkthrough / Help — overlay or command palette, not permanent sidebar sections
- Draw Studio section — opens as a focused mode (full canvas takeover) when user enters draw workflow

### Interaction Patterns
- **Right-click context menus** for entity/tile actions instead of toolbar buttons
- **Inline editing** — click a value to edit it, no separate edit mode
- **Hover reveals** — show action buttons on entity list items on hover, not always visible
- **Modal workflows** for complex tasks (export, project settings, script editing) instead of sidebar panels
- **Keyboard-first power**: every action reachable via Ctrl+K, shortcuts shown inline

### Visual Treatment
- Panels use subtle borders, not visible card outlines with headers
- Reduce heading count — most sections don't need an H2
- Use whitespace for grouping instead of borders and backgrounds
- Buttons use ghost/text style by default, filled only for primary actions
- Icons over text labels for toolbar actions (with tooltips)
- No section is visible unless it has active content to show

### Comparison Targets
- Figma: minimal chrome, contextual right panel, floating toolbar
- Linear: clean surfaces, keyboard-first, no visual noise
- Blender (viewport mode): maximized 3D view with floating gizmo controls
- Aseprite: focused tool with contextual panels, not everything at once

## Best Time To Update UI Without Disrupting Tooling
- Layout restructuring should happen as a dedicated sprint, not incremental patches.
- The contextual panel system is a structural change — plan it, execute it, test it.
- Gate every UI batch with:
  1. `npm run lint`
  2. `npm test`
  3. `npm run test:e2e`

## Acceptance Checklist For Visual Updates
1. No regression in map paint/select/move/erase loops.
2. No regression in playtest entry/exit and debugger panel updates.
3. Canvas gets 70%+ of viewport width in default layout.
4. Right panel shows only contextually relevant content.
5. No empty sections visible at any time.
6. Contrast checks pass on topbar, panels, and issue states.
7. All power features reachable via Ctrl+K command palette.
8. Tool feels approachable to a first-time user who has never made a game.

## References
- Figma editor layout and contextual panel patterns.
- Linear app interaction and keyboard-first design.
- Blender viewport mode and floating gizmo UX.
- Aseprite focused tool workspace.
- Unity Foundations color palette guidance.
- Godot editor appearance settings.
- WCAG contrast requirements.

