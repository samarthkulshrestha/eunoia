"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { KnowledgeDimensionView } from "./KnowledgeDimension";
import type { KnowledgeDimension } from "@/lib/types";

const DIMENSIONS: { key: string; label: string }[] = [
  { key: "foundations", label: "Foundations" },
  { key: "taxonomy", label: "Taxonomy" },
  { key: "thinkers", label: "Thinkers & Voices" },
  { key: "culturalImpact", label: "Cultural Impact" },
  { key: "adjacentSurprises", label: "Adjacent Surprises" },
  { key: "controversies", label: "Controversies & Open Questions" },
];

export function SidePanel() {
  const {
    selectedInterest,
    sidePanelOpen,
    setSidePanelOpen,
    knowledgeTree,
    exploreInterest,
    loading,
  } = useStore();

  useEffect(() => {
    if (selectedInterest && !knowledgeTree) {
      exploreInterest(selectedInterest.id);
    }
  }, [selectedInterest, knowledgeTree, exploreInterest]);

  if (!sidePanelOpen || !selectedInterest) return null;

  return (
    <div className="fixed top-0 right-0 h-screen w-[420px] z-[60] bg-black/90 backdrop-blur-xl border-l border-white/10 overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-lg text-white font-light tracking-wide">
              {selectedInterest.name}
            </h2>
            {selectedInterest.description && (
              <p className="text-sm text-white/40 mt-1 leading-relaxed">
                {selectedInterest.description}
              </p>
            )}
          </div>
          <button
            onClick={() => setSidePanelOpen(false)}
            className="text-white/30 hover:text-white/60 transition-colors text-lg"
          >
            &times;
          </button>
        </div>

        {/* Resources */}
        {selectedInterest.resources.length > 0 && (
          <div className="mb-6">
            <p className="text-xs tracking-widest uppercase text-white/30 mb-3">
              Resources
            </p>
            <div className="space-y-2">
              {selectedInterest.resources.map((r) => (
                <div
                  key={r.id}
                  className="bg-white/5 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-white/20 bg-white/5 px-1.5 py-0.5 rounded">
                      {r.type}
                    </span>
                    <span className="text-sm text-white/70">{r.title}</span>
                  </div>
                  {r.author && (
                    <p className="text-xs text-white/30 mt-1">{r.author}</p>
                  )}
                  {r.why && (
                    <p className="text-xs text-white/40 mt-1 italic">
                      {r.why}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Knowledge Tree */}
        {loading && !knowledgeTree && (
          <p className="text-sm text-white/30 font-light">
            Exploring with taste...
          </p>
        )}
        {knowledgeTree && (
          <div>
            <p className="text-xs tracking-widest uppercase text-white/30 mb-3">
              Knowledge Tree
            </p>
            {DIMENSIONS.map(({ key, label }) => {
              const dim = knowledgeTree[key] as KnowledgeDimension | undefined;
              if (!dim) return null;
              return (
                <KnowledgeDimensionView
                  key={key}
                  title={label}
                  dimension={dim}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
