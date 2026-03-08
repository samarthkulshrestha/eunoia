# Star Chart Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign Eunoia's UI to a "Star Chart" visual language with force-directed spatial clustering and constellation mode for visualizing interest connections.

**Architecture:** Force-directed layout computes positions client-side on interest load. Constellation mode renders Three.js Line2 segments with diamond markers between connected interests. All UI panels adopt star-chart cartography styling: monospaced data readouts, graph-paper grid overlays, coordinate displays, radial diagrams.

**Tech Stack:** React, Three.js / @react-three/fiber, Zustand, Tailwind CSS, existing Playfair Display + system monospace fonts.

---

### Task 1: Force-Directed Layout Engine

**Files:**
- Create: `src/lib/forceLayout.ts`

**Step 1: Create the force-directed simulation module**

```typescript
import { Interest } from "./types";

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

const MIN_DIST = 3;
const MAX_DIST = 15;
const SPRING_K = 0.01;
const REPULSION_K = 2.0;
const DAMPING = 0.9;
const ITERATIONS = 100;

export function computeForceLayout(interests: Interest[]): Map<string, Vec3> {
  // Initialize positions from current interest positions
  const positions = new Map<string, Vec3>();
  interests.forEach((i) => {
    positions.set(i.id, { x: i.posX, y: i.posY, z: i.posZ });
  });

  if (interests.length <= 1) return positions;

  // Build edge lookup: interest id -> list of { targetId, strength }
  const edges = new Map<string, { targetId: string; strength: number }[]>();
  interests.forEach((i) => {
    const conns: { targetId: string; strength: number }[] = [];
    i.edgesFrom?.forEach((e) => conns.push({ targetId: e.toId, strength: e.strength }));
    i.edgesTo?.forEach((e) => conns.push({ targetId: e.fromId, strength: e.strength }));
    edges.set(i.id, conns);
  });

  const velocities = new Map<string, Vec3>();
  interests.forEach((i) => velocities.set(i.id, { x: 0, y: 0, z: 0 }));

  for (let iter = 0; iter < ITERATIONS; iter++) {
    // Repulsion between all pairs
    for (let i = 0; i < interests.length; i++) {
      for (let j = i + 1; j < interests.length; j++) {
        const a = positions.get(interests[i].id)!;
        const b = positions.get(interests[j].id)!;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz), 0.1);
        const force = REPULSION_K / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;

        const va = velocities.get(interests[i].id)!;
        const vb = velocities.get(interests[j].id)!;
        va.x += fx; va.y += fy; va.z += fz;
        vb.x -= fx; vb.y -= fy; vb.z -= fz;
      }
    }

    // Spring attraction along edges
    interests.forEach((interest) => {
      const conns = edges.get(interest.id) || [];
      conns.forEach(({ targetId, strength }) => {
        const a = positions.get(interest.id)!;
        const b = positions.get(targetId);
        if (!b) return;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const force = SPRING_K * strength * dist;
        const va = velocities.get(interest.id)!;
        va.x += (dx / dist) * force;
        va.y += (dy / dist) * force;
        va.z += (dz / dist) * force;
      });
    });

    // Apply velocities with damping, enforce constraints
    interests.forEach((interest) => {
      const pos = positions.get(interest.id)!;
      const vel = velocities.get(interest.id)!;
      vel.x *= DAMPING; vel.y *= DAMPING; vel.z *= DAMPING;
      pos.x += vel.x; pos.y += vel.y; pos.z += vel.z;

      // Clamp to MAX_DIST from origin
      const distFromOrigin = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
      if (distFromOrigin > MAX_DIST) {
        const scale = MAX_DIST / distFromOrigin;
        pos.x *= scale; pos.y *= scale; pos.z *= scale;
      }
    });

    // Enforce minimum distance between all pairs
    for (let i = 0; i < interests.length; i++) {
      for (let j = i + 1; j < interests.length; j++) {
        const a = positions.get(interests[i].id)!;
        const b = positions.get(interests[j].id)!;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < MIN_DIST && dist > 0) {
          const push = (MIN_DIST - dist) / 2;
          const nx = dx / dist; const ny = dy / dist; const nz = dz / dist;
          a.x += nx * push; a.y += ny * push; a.z += nz * push;
          b.x -= nx * push; b.y -= ny * push; b.z -= nz * push;
        }
      }
    }
  }

  return positions;
}
```

**Step 2: Commit**

```bash
git add src/lib/forceLayout.ts
git commit -m "feat: add force-directed layout engine for interest clustering"
```

---

### Task 2: Integrate Force Layout into Store & Scene

**Files:**
- Modify: `src/lib/store.ts` (lines 74-98, fetchInterests action)
- Modify: `src/components/InterestCloud.tsx` (lines 30-34, position logic)

**Step 1: Update store to run force layout after fetching interests**

In `src/lib/store.ts`, add the import at the top:
```typescript
import { computeForceLayout } from "./forceLayout";
```

Replace the `fetchInterests` action (around lines 74-78) so that after fetching, it computes the force-directed layout and overrides interest positions:

```typescript
fetchInterests: async () => {
  const res = await fetch("/api/interests");
  const data = await res.json();
  const positions = computeForceLayout(data);
  const laid = data.map((interest: Interest) => {
    const pos = positions.get(interest.id);
    if (pos) {
      return { ...interest, posX: pos.x, posY: pos.y, posZ: pos.z };
    }
    return interest;
  });
  set({ interests: laid });
},
```

**Step 2: Commit**

```bash
git add src/lib/store.ts
git commit -m "feat: integrate force-directed layout into interest fetching"
```

---

### Task 3: Constellation Mode — Store & Toggle

**Files:**
- Modify: `src/lib/store.ts` (add constellationMode state + toggle)
- Modify: `src/components/UIOverlay.tsx` (add constellation toggle button)

**Step 1: Add constellation mode to store**

In `src/lib/store.ts`, add to the state interface:
```typescript
constellationMode: boolean;
```

Add to the actions interface:
```typescript
toggleConstellationMode: () => void;
```

Add initial state:
```typescript
constellationMode: false,
```

Add action:
```typescript
toggleConstellationMode: () => set((s) => ({ constellationMode: !s.constellationMode })),
```

**Step 2: Add toggle button in UIOverlay**

In `src/components/UIOverlay.tsx`, next to the existing bridge toggle button, add a matching constellation toggle:

```tsx
const constellationMode = useStore((s) => s.constellationMode);
const toggleConstellationMode = useStore((s) => s.toggleConstellationMode);
```

Add the button (positioned near the bridge toggle):
```tsx
<button
  onClick={toggleConstellationMode}
  className={`font-mono text-xs tracking-wider uppercase px-3 py-1.5 border transition-all ${
    constellationMode
      ? "border-white/60 text-white bg-white/10"
      : "border-white/20 text-white/50 hover:border-white/40 hover:text-white/80"
  }`}
>
  ✦ CONST
</button>
```

**Step 3: Commit**

```bash
git add src/lib/store.ts src/components/UIOverlay.tsx
git commit -m "feat: add constellation mode toggle to store and UI"
```

---

### Task 4: Constellation Lines Component

**Files:**
- Create: `src/components/ConstellationLines.tsx`
- Modify: `src/components/Scene.tsx` (add ConstellationLines to scene)

**Step 1: Create ConstellationLines component**

```tsx
"use client";

import { useMemo, useState } from "react";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { useFrame } from "@react-three/fiber";

const DIAMOND_SIZE = 0.15;

function DiamondMarker({ position, color }: { position: THREE.Vector3; color: string }) {
  return (
    <mesh position={position} rotation={[0, 0, Math.PI / 4]}>
      <planeGeometry args={[DIAMOND_SIZE, DIAMOND_SIZE]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function ConstellationLines() {
  const interests = useStore((s) => s.interests);
  const constellationMode = useStore((s) => s.constellationMode);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const lines = useMemo(() => {
    if (!constellationMode) return [];

    const seen = new Set<string>();
    const result: {
      key: string;
      from: THREE.Vector3;
      to: THREE.Vector3;
      fromId: string;
      toId: string;
    }[] = [];

    const interestMap = new Map(interests.map((i) => [i.id, i]));

    interests.forEach((interest) => {
      const allEdges = [
        ...(interest.edgesFrom || []),
        ...(interest.edgesTo || []),
      ];
      allEdges.forEach((edge) => {
        const pairKey = [edge.fromId, edge.toId].sort().join("-");
        if (seen.has(pairKey)) return;
        seen.add(pairKey);

        const from = interestMap.get(edge.fromId);
        const to = interestMap.get(edge.toId);
        if (!from || !to) return;

        result.push({
          key: pairKey,
          from: new THREE.Vector3(from.posX, from.posY, from.posZ),
          to: new THREE.Vector3(to.posX, to.posY, to.posZ),
          fromId: edge.fromId,
          toId: edge.toId,
        });
      });
    });

    return result;
  }, [interests, constellationMode]);

  if (!constellationMode || lines.length === 0) return null;

  return (
    <group>
      {lines.map((line) => {
        const isHighlighted =
          !hoveredId || hoveredId === line.fromId || hoveredId === line.toId;
        const opacity = isHighlighted ? 0.4 : 0.08;
        const points = [line.from, line.to];

        return (
          <group key={line.key}>
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([
                    line.from.x, line.from.y, line.from.z,
                    line.to.x, line.to.y, line.to.z,
                  ])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineDashedMaterial
                color="#ffffff"
                transparent
                opacity={opacity}
                dashSize={0.3}
                gapSize={0.15}
              />
            </line>
            <DiamondMarker position={line.from} color="#ffffff" />
            <DiamondMarker position={line.to} color="#ffffff" />
          </group>
        );
      })}
    </group>
  );
}
```

**Step 2: Wire hover detection**

To enable the hover-highlight behavior, we need to expose a `hoveredInterestId` in the store:

In `src/lib/store.ts`, add:
```typescript
hoveredInterestId: string | null;
setHoveredInterestId: (id: string | null) => void;
```

With initial state `hoveredInterestId: null` and action:
```typescript
setHoveredInterestId: (id) => set({ hoveredInterestId: id }),
```

Update `ConstellationLines` to use the store's `hoveredInterestId` instead of local state.

In `src/components/InterestCloud.tsx`, add pointer handlers to the clickable sphere:
```tsx
onPointerEnter={() => setHoveredInterestId(interest.id)}
onPointerLeave={() => setHoveredInterestId(null)}
```

**Step 3: Add ConstellationLines to Scene**

In `src/components/Scene.tsx`, import and render `ConstellationLines` inside `SceneContent`, after the interest clouds and before the EffectComposer:

```tsx
import { ConstellationLines } from "./ConstellationLines";
// ... inside SceneContent return:
<ConstellationLines />
```

**Step 4: Handle dashed line computation**

The `lineDashedMaterial` requires `computeLineDistances()` on the geometry. We need to add a ref and call it. Update the line rendering to use a ref:

```tsx
import { useEffect, useRef } from "react";

// Inside the line map, use a wrapper component:
function DashedLine({ from, to, opacity }: { from: THREE.Vector3; to: THREE.Vector3; opacity: number }) {
  const ref = useRef<THREE.Line>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.computeLineDistances();
    }
  }, [from, to]);

  return (
    <line ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={2}
          array={new Float32Array([from.x, from.y, from.z, to.x, to.y, to.z])}
          itemSize={3}
        />
      </bufferGeometry>
      <lineDashedMaterial color="#ffffff" transparent opacity={opacity} dashSize={0.3} gapSize={0.15} />
    </line>
  );
}
```

**Step 5: Commit**

```bash
git add src/components/ConstellationLines.tsx src/components/Scene.tsx src/lib/store.ts src/components/InterestCloud.tsx
git commit -m "feat: add constellation mode with dashed lines and diamond markers"
```

---

### Task 5: Side Panel — Star Chart Redesign

**Files:**
- Modify: `src/components/SidePanel.tsx` (full restyle)
- Create: `src/components/RadialDiagram.tsx` (knowledge dimension ring)

**Step 1: Create the RadialDiagram component**

```tsx
"use client";

import { KnowledgeDimension } from "@/lib/types";

interface RadialDiagramProps {
  dimensions: { key: string; label: string; data: KnowledgeDimension | null }[];
  accentColor: string;
  size?: number;
}

export function RadialDiagram({ dimensions, accentColor, size = 80 }: RadialDiagramProps) {
  const center = size / 2;
  const radius = size / 2 - 8;
  const segmentAngle = (2 * Math.PI) / dimensions.length;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background ring */}
      <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={6} />

      {/* Filled segments */}
      {dimensions.map((dim, i) => {
        const itemCount = dim.data?.items?.length ?? 0;
        if (itemCount === 0) return null;

        const startAngle = i * segmentAngle - Math.PI / 2;
        const endAngle = startAngle + segmentAngle - 0.05; // small gap between segments
        const x1 = center + radius * Math.cos(startAngle);
        const y1 = center + radius * Math.sin(startAngle);
        const x2 = center + radius * Math.cos(endAngle);
        const y2 = center + radius * Math.sin(endAngle);
        const largeArc = segmentAngle > Math.PI ? 1 : 0;

        return (
          <path
            key={dim.key}
            d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`}
            fill="none"
            stroke={accentColor}
            strokeWidth={6}
            strokeLinecap="round"
            opacity={0.7 + (itemCount / 10) * 0.3}
          />
        );
      })}

      {/* Center dot */}
      <circle cx={center} cy={center} r={2} fill={accentColor} opacity={0.5} />
    </svg>
  );
}
```

**Step 2: Restyle SidePanel**

Rewrite `src/components/SidePanel.tsx` with the star chart legend aesthetic. Key changes:

- Add graph-paper grid background via CSS (repeating linear gradients)
- Add coordinate readout top-right (convert posX/Y/Z to RA/DEC/D format)
- Accent color border on left edge (from selected interest's color)
- Radial diagram below interest name
- Monospaced section headers with filled circle markers
- Warm off-white text colors (#e8e4df body, #b8b4af secondary)
- Thin ruled lines between items
- Resource type badges as bordered monospaced labels

The full component restructure:

```tsx
"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { KnowledgeDimensionView } from "./KnowledgeDimension";
import { KnowledgeDimension } from "@/lib/types";
import { RadialDiagram } from "./RadialDiagram";

const DIMENSIONS: { key: string; label: string }[] = [
  { key: "foundations", label: "Foundations" },
  { key: "taxonomy", label: "Taxonomy" },
  { key: "thinkers", label: "Thinkers & Voices" },
  { key: "culturalImpact", label: "Cultural Impact" },
  { key: "adjacentSurprises", label: "Adjacent Surprises" },
  { key: "controversies", label: "Controversies & Open Questions" },
];

function getAccentColor(interest: any): string {
  if (interest?.color) return interest.color;
  // Fallback: deterministic HSL from id
  let hash = 0;
  const str = interest?.id || "default";
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 85%, 60%)`;
}

function toCoordinate(val: number): string {
  const abs = Math.abs(val);
  const sign = val >= 0 ? "+" : "-";
  return `${sign}${abs.toFixed(2)}`;
}

export function SidePanel() {
  const selectedInterest = useStore((s) => s.selectedInterest);
  const sidePanelOpen = useStore((s) => s.sidePanelOpen);
  const setSidePanelOpen = useStore((s) => s.setSidePanelOpen);
  const knowledgeTree = useStore((s) => s.knowledgeTree);
  const exploreInterest = useStore((s) => s.exploreInterest);
  const loading = useStore((s) => s.loading);

  useEffect(() => {
    if (selectedInterest && !knowledgeTree) {
      exploreInterest(selectedInterest.id);
    }
  }, [selectedInterest]);

  if (!sidePanelOpen || !selectedInterest) return null;

  const accent = getAccentColor(selectedInterest);
  const resources = selectedInterest.resources || [];
  const dimData = DIMENSIONS.map((d) => ({
    ...d,
    data: knowledgeTree?.[d.key] as KnowledgeDimension | null,
  }));

  const gridBg = `repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(255,255,255,0.03) 19px, rgba(255,255,255,0.03) 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(255,255,255,0.03) 19px, rgba(255,255,255,0.03) 20px)`;

  return (
    <div
      className="fixed right-0 top-0 h-full z-[60] overflow-y-auto"
      style={{
        width: 420,
        backgroundColor: "#0a0a0f",
        borderLeft: `1px solid ${accent}`,
        backgroundImage: gridBg,
      }}
    >
      {/* Header */}
      <div className="p-5">
        {/* Close + Coordinates row */}
        <div className="flex items-start justify-between mb-4">
          <button
            onClick={() => setSidePanelOpen(false)}
            className="text-white/40 hover:text-white transition-colors font-mono text-xs border border-white/20 px-2 py-0.5"
          >
            ESC
          </button>
          <div className="font-mono text-xs text-white/30 text-right leading-relaxed">
            <div>RA {toCoordinate(selectedInterest.posX)}</div>
            <div>DEC {toCoordinate(selectedInterest.posY)}</div>
            <div>D {toCoordinate(selectedInterest.posZ)}</div>
          </div>
        </div>

        {/* Interest name */}
        <h2 className="text-xl font-light text-white mb-3">
          {selectedInterest.name}
        </h2>

        {/* Radial diagram */}
        <div className="flex items-start gap-4 mb-4">
          <RadialDiagram dimensions={dimData} accentColor={accent} />
          {selectedInterest.description && (
            <p className="text-sm font-light leading-relaxed" style={{ color: "#e8e4df" }}>
              {selectedInterest.description}
            </p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 border-t border-white/10" />

      {/* Resources */}
      {resources.length > 0 && (
        <div className="p-5">
          <h3 className="font-mono text-xs tracking-widest uppercase text-white/40 mb-3">
            Resources
          </h3>
          <div className="space-y-3">
            {resources.map((r, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="flex-shrink-0 mt-0.5">
                  <span
                    className="font-mono text-[10px] tracking-wider uppercase px-1.5 py-0.5 border"
                    style={{ borderColor: accent, color: accent }}
                  >
                    {r.type}
                  </span>
                </span>
                <div>
                  <div className="text-sm" style={{ color: "#e8e4df" }}>
                    {r.title}
                  </div>
                  {r.author && (
                    <div className="font-mono text-xs" style={{ color: "#b8b4af" }}>
                      {r.author}
                    </div>
                  )}
                  {r.why && (
                    <div className="text-xs mt-1" style={{ color: "#b8b4af" }}>
                      {r.why}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="mx-5 border-t border-white/10" />

      {/* Knowledge Tree */}
      <div className="p-5">
        <h3 className="font-mono text-xs tracking-widest uppercase text-white/40 mb-3">
          Knowledge Tree
        </h3>
        {loading ? (
          <div className="font-mono text-xs text-white/30 animate-pulse">
            Charting dimensions...
          </div>
        ) : (
          <div className="space-y-1">
            {dimData.map((dim) => (
              <KnowledgeDimensionView
                key={dim.key}
                dimension={dim.data}
                label={dim.label}
                accentColor={accent}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 3: Update KnowledgeDimension styling**

Modify `src/components/KnowledgeDimension.tsx` to accept an `accentColor` prop and use star-chart styling:

- Section header: filled circle in accent color + monospaced uppercase label
- Expanded section: thin accent-colored left border
- Items separated by thin ruled lines
- Text colors: #e8e4df for titles, #b8b4af for descriptions

```tsx
"use client";

import { useState } from "react";
import { KnowledgeDimension } from "@/lib/types";

interface Props {
  dimension: KnowledgeDimension | null;
  label: string;
  accentColor: string;
}

export function KnowledgeDimensionView({ dimension, label, accentColor }: Props) {
  const [open, setOpen] = useState(false);

  if (!dimension) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 py-2 text-left group"
      >
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: accentColor, opacity: open ? 1 : 0.5 }}
        />
        <span className="font-mono text-xs tracking-widest uppercase text-white/50 group-hover:text-white/80 transition-colors">
          {label}
        </span>
        <span className="font-mono text-xs text-white/20 ml-auto">
          {dimension.items?.length || 0}
        </span>
      </button>

      {open && (
        <div className="ml-4 pl-3 mb-2" style={{ borderLeft: `1px solid ${accentColor}40` }}>
          {dimension.summary && (
            <p className="text-xs mb-3 leading-relaxed" style={{ color: "#b8b4af" }}>
              {dimension.summary}
            </p>
          )}
          <div className="space-y-0">
            {dimension.items?.map((item, i) => (
              <div key={i} className="py-2 border-t border-white/5">
                <div className="text-sm font-light" style={{ color: "#e8e4df" }}>
                  {item.name}
                </div>
                {item.description && (
                  <div className="text-xs mt-1 leading-relaxed" style={{ color: "#b8b4af" }}>
                    {item.description}
                  </div>
                )}
                {item.works && item.works.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {item.works.map((w, j) => (
                      <span
                        key={j}
                        className="font-mono text-[10px] px-1.5 py-0.5 border border-white/10"
                        style={{ color: "#b8b4af" }}
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/components/SidePanel.tsx src/components/KnowledgeDimension.tsx src/components/RadialDiagram.tsx
git commit -m "feat: redesign side panel with star chart legend aesthetic"
```

---

### Task 6: Top Bar — Navigation Instruments

**Files:**
- Modify: `src/components/UIOverlay.tsx` (full restyle)
- Modify: `src/components/SearchBar.tsx` (instrument styling)

**Step 1: Restyle UIOverlay**

Rewrite `src/components/UIOverlay.tsx` with instrument styling:

```tsx
"use client";

import { useStore } from "@/lib/store";
import { SidePanel } from "./SidePanel";
import { InputPanel } from "./InputPanel";
import { SearchBar } from "./SearchBar";

export function UIOverlay() {
  const bridgeMode = useStore((s) => s.bridgeMode);
  const toggleBridgeMode = useStore((s) => s.toggleBridgeMode);
  const constellationMode = useStore((s) => s.constellationMode);
  const toggleConstellationMode = useStore((s) => s.toggleConstellationMode);
  const loading = useStore((s) => s.loading);
  const loadingMessage = useStore((s) => s.loadingMessage);
  const interests = useStore((s) => s.interests);

  const edgeCount = interests.reduce(
    (sum, i) => sum + (i.edgesFrom?.length || 0),
    0
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Title block — top left */}
      <div className="absolute top-5 left-5 pointer-events-auto">
        <h1 className="text-lg font-light tracking-[0.3em] uppercase text-white">
          eunoia
        </h1>
        <div className="mt-1.5 flex items-center gap-0">
          <div className="w-20 border-t border-white/30" />
        </div>
        <div className="mt-1.5 font-mono text-[10px] tracking-wider text-white/40">
          {interests.length} BODIES / {edgeCount} LINKS
        </div>
      </div>

      {/* Search — top center */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 pointer-events-auto">
        <SearchBar />
      </div>

      {/* Mode switches — top right */}
      <div className="absolute top-5 right-5 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={toggleConstellationMode}
          className={`font-mono text-xs tracking-wider uppercase px-3 py-1.5 border transition-all ${
            constellationMode
              ? "border-white/60 text-white bg-white/10"
              : "border-white/20 text-white/50 hover:border-white/40 hover:text-white/80"
          }`}
        >
          ✦ CONST
        </button>
        <button
          onClick={toggleBridgeMode}
          className={`font-mono text-xs tracking-wider uppercase px-3 py-1.5 border transition-all ${
            bridgeMode
              ? "border-white/60 text-white bg-white/10"
              : "border-white/20 text-white/50 hover:border-white/40 hover:text-white/80"
          }`}
        >
          ⬡ BRIDGE
        </button>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="font-mono text-xs tracking-wider text-white/50 animate-pulse">
            {loadingMessage || "Processing..."}
          </div>
        </div>
      )}

      {/* Panels */}
      <div className="pointer-events-auto">
        <SidePanel />
        <InputPanel />
      </div>
    </div>
  );
}
```

**Step 2: Restyle SearchBar**

Rewrite `src/components/SearchBar.tsx` with instrument styling:

```tsx
"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";

export function SearchBar() {
  const interests = useStore((s) => s.interests);
  const selectInterest = useStore((s) => s.selectInterest);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const results = useMemo(
    () =>
      query.length > 0
        ? interests.filter((i) =>
            i.name.toLowerCase().includes(query.toLowerCase())
          ).slice(0, 5)
        : [],
    [query, interests]
  );

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-white/30">⌖</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="SEARCH CATALOGUE..."
          className={`bg-transparent font-mono text-xs tracking-wider text-white placeholder:text-white/30 w-56 px-3 py-1.5 border outline-none transition-all ${
            focused
              ? "border-white/40"
              : "border-white/15 hover:border-white/30"
          }`}
        />
      </div>
      {focused && results.length > 0 && (
        <div className="absolute top-full left-6 mt-1 w-56 border border-white/15 bg-[#0a0a0f]">
          {results.map((r) => (
            <button
              key={r.id}
              onMouseDown={() => {
                selectInterest(r);
                setQuery("");
              }}
              className="w-full text-left px-3 py-2 font-mono text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/UIOverlay.tsx src/components/SearchBar.tsx
git commit -m "feat: restyle top bar with navigation instrument aesthetic"
```

---

### Task 7: Input Panel — Chart Entry Form

**Files:**
- Modify: `src/components/InputPanel.tsx` (restyle to match star chart)

**Step 1: Restyle InputPanel**

Rewrite `src/components/InputPanel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";

const INPUT_TYPES = [
  { value: "raw", label: "INTEREST" },
  { value: "book", label: "BOOK" },
  { value: "youtube", label: "YOUTUBE" },
  { value: "music", label: "MUSIC" },
  { value: "article", label: "ARTICLE" },
  { value: "pdf", label: "PDF" },
];

export function InputPanel() {
  const inputPanelOpen = useStore((s) => s.inputPanelOpen);
  const toggleInputPanel = useStore((s) => s.toggleInputPanel);
  const addInput = useStore((s) => s.addInput);
  const loading = useStore((s) => s.loading);
  const selectedInterest = useStore((s) => s.selectedInterest);
  const [content, setContent] = useState("");
  const [type, setType] = useState("raw");

  const handleSubmit = async () => {
    if (!content.trim()) return;
    await addInput(content, type);
    setContent("");
  };

  // Derive accent color from selected interest or default
  const accent = selectedInterest?.color || "rgba(255,255,255,0.6)";

  const gridBg = `repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(255,255,255,0.03) 19px, rgba(255,255,255,0.03) 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(255,255,255,0.03) 19px, rgba(255,255,255,0.03) 20px)`;

  if (!inputPanelOpen) {
    return (
      <button
        onClick={toggleInputPanel}
        className="fixed bottom-5 right-5 z-50 font-mono text-xs tracking-wider uppercase px-3 py-1.5 border border-white/20 text-white/50 hover:border-white/40 hover:text-white/80 transition-all"
        style={{ backgroundColor: "#0a0a0f" }}
      >
        + LOG
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-5 right-5 z-50 w-96"
      style={{
        backgroundColor: "#0a0a0f",
        borderTop: `1px solid ${accent}`,
        border: "1px solid rgba(255,255,255,0.1)",
        backgroundImage: gridBg,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <span className="font-mono text-xs tracking-widest uppercase text-white/40">
          Log Observation
        </span>
        <button
          onClick={toggleInputPanel}
          className="font-mono text-xs text-white/30 hover:text-white/60 transition-colors border border-white/20 px-2 py-0.5"
        >
          ESC
        </button>
      </div>

      {/* Type selector */}
      <div className="flex flex-wrap gap-1.5 p-3 border-b border-white/5">
        {INPUT_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            className={`font-mono text-[10px] tracking-wider uppercase px-2 py-1 border transition-all ${
              type === t.value
                ? "text-white border-white/40"
                : "text-white/30 border-white/10 hover:border-white/25 hover:text-white/50"
            }`}
            style={type === t.value ? { borderColor: accent, color: accent } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="p-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="LOG OBSERVATION..."
          rows={3}
          className="w-full bg-transparent font-mono text-xs text-white/80 placeholder:text-white/20 border border-white/10 focus:border-white/30 outline-none p-2 resize-none transition-colors"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !content.trim()}
          className="w-full mt-2 font-mono text-xs tracking-wider uppercase py-2 border border-white/20 text-white/50 hover:border-white/40 hover:text-white/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          {loading ? "CATALOGUING..." : "CATALOGUE"}
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/InputPanel.tsx
git commit -m "feat: restyle input panel with chart entry form aesthetic"
```

---

### Task 8: Final Polish & Integration Testing

**Files:**
- Possibly tweak: any component that needs visual adjustments after integration

**Step 1: Run the dev server and visually verify**

```bash
npm run dev
```

Open http://localhost:3000 and verify:
- Force-directed layout positions interests in clustered groups
- Constellation mode toggle works and draws dashed lines with diamond markers
- Hovering a galaxy in constellation mode highlights its connections
- Side panel shows star-chart styling with graph paper grid, coordinate readout, radial diagram, accent-colored borders
- Top bar shows "eunoia" with ruled line and body/link counts, instrument-style buttons
- Search bar has crosshair icon and monospaced placeholder
- Input panel matches the star-chart aesthetic
- All text is readable (warm off-white, not grey)

**Step 2: Fix any visual issues found during testing**

Adjust opacity values, spacing, colors as needed.

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: visual polish after integration testing"
```
