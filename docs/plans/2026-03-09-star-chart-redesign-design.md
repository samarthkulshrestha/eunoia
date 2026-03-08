# Eunoia Star Chart Redesign

## Overview

Redesign the Eunoia UI from its current minimal dark-mode aesthetic to a "Star Chart" visual language — inspired by astronomical cartography, observatory instruments, and constellation maps. Simultaneously add spatial clustering (force-directed layout) and a constellation mode to surface the connectedness of interests that was lost when moving from graph-and-node to galaxy view.

## Design Direction

**Metaphor:** The user is an astronomer charting their intellectual universe. The UI is their instrument panel; the 3D view is their telescope; constellation mode is their star chart overlay.

**Key principles:**
- Star chart cartography: diamond markers, dashed constellation lines, coordinate readouts, radial diagrams
- Monospaced data mixed with Playfair Display headings
- Galaxy accent color (derived from selected interest) as the unifying accent
- Warm off-white text (`#e8e4df`) for readability, not grey
- Faint graph-paper grid overlays on panels (~3% opacity)

---

## Section 1: Spatial Layout & Force-Directed Positioning

- Client-side force-directed simulation runs on interest load
- Connected interests attract (spring force proportional to edge strength)
- All interests repel (prevents overlap)
- Constraints: min distance 3 units, max distance 15 units
- Simulation runs ~100 iterations on load and on interest add/remove
- Updates existing posX/posY/posZ fields with computed positions
- Effect: related interests cluster organically, unrelated ones drift apart

## Section 2: Constellation Mode

**Toggle:**
- New button in top bar alongside bridge toggle
- Styled as instrument switch: `CONST` in tracked monospace, thin bordered
- Active state: accent-colored text + subtle glow

**Lines:**
- Thin white lines (opacity ~0.4) connecting every pair of interests sharing an edge
- Rendered as Three.js Line2 segments in 3D space (move with camera)
- Small diamond-shaped markers at endpoints where lines meet galaxies
- Subtle dashed pattern (star chart aesthetic)

**Interaction:**
- Hovering a galaxy in constellation mode highlights its connections (full opacity), dims the rest

**Performance:**
- Lines instantiated only when mode is on, destroyed when off

## Section 3: Side Panel — Star Chart Legend

**Frame:**
- 420px width, thin left border in selected galaxy's accent color
- Background: solid #0a0a0f with faint graph-paper grid overlay (~3% opacity)
- Top-right: coordinate readout in monospaced type (e.g., `RA 07.32 / DEC -14.08 / D 6.1`)

**Header:**
- Interest name in Playfair Display, text-xl, full white
- Circular radial diagram: ring showing 6 knowledge dimensions as segments, filled proportionally to item count, in accent color — an at-a-glance completeness fingerprint
- Description in warm off-white (#e8e4df)

**Knowledge tree:**
- Dimension headers: filled circle (accent) + tracked uppercase monospace name
- Items separated by thin ruled lines (chart gridlines)
- Item titles in off-white, descriptions in #b8b4af
- Expanded sections get a thin vertical accent-colored left rule

**Resources:**
- Type badges as small rectangular monospaced chart labels (bordered, not filled)
- Dot markers per resource (plotted points)
- Author and "why" in warm off-white

## Section 4: Top Bar — Navigation Instruments

**Title "eunoia":**
- text-base or text-lg, tracked uppercase Playfair Display, full white
- Thin horizontal ruled line extending ~80px right (chart axis)
- Below rule: monospaced readout of counts (e.g., `7 BODIES / 12 LINKS`)

**Search bar:**
- Top-center, monospaced placeholder: `SEARCH CATALOGUE...`
- Thin white border, accent glow on focus
- Crosshair/reticle icon instead of magnifying glass

**Constellation toggle:**
- `CONST` in tracked monospace, thin bordered rectangle
- Active: accent-colored text + glow

**Bridge toggle:**
- Restyled to match: `BRIDGE` in tracked monospace
- Both toggles feel like instrument mode switches

## Section 5: Input Panel — Chart Entry Form

- Same graph-paper grid background as side panel (~3% opacity)
- Monospaced placeholder: `LOG OBSERVATION...`
- Thin white border matching search bar
- Type selector pills: small rectangular instrument labels — monospaced, thin-bordered, uppercase
- Active pill: accent color border and text
- Submit button: thin-bordered rectangle, `CATALOGUE` in tracked monospace
- Thin accent-colored top border (white/60 when no galaxy selected)

---

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| void | #0a0a0f | Background, panel backgrounds |
| text-primary | #ffffff | Headings, titles, active elements |
| text-body | #e8e4df | Body text, descriptions |
| text-secondary | #b8b4af | Sub-descriptions, metadata |
| text-muted | #787470 | Disabled, tertiary info |
| accent | per-galaxy HSL | Borders, indicators, active states |
| grid | white @ 3% | Graph-paper overlay |
| constellation-line | white @ 40% | Constellation mode lines |
| border | white @ 15% | Panel and input borders |

## Typography

| Element | Font | Size | Weight | Style |
|---------|------|------|--------|-------|
| App title | Playfair Display | text-lg | light | tracking-[0.3em] uppercase |
| Interest name | Playfair Display | text-xl | light | — |
| Section headers | Monospace (system) | text-xs | normal | tracking-widest uppercase |
| Body text | Playfair Display | text-sm | light | — |
| Data readouts | Monospace (system) | text-xs | normal | — |
| Button labels | Monospace (system) | text-xs | normal | tracking-wider uppercase |
| Placeholders | Monospace (system) | text-sm | normal | — |
