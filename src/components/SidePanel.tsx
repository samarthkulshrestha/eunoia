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
