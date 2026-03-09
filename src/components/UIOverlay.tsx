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
        <h1
          className="font-mono text-lg tracking-[0.3em] uppercase text-white"
          style={{ textShadow: "0 0 8px rgba(255,255,255,0.6), 0 0 20px rgba(255,255,255,0.3), 0 0 40px rgba(255,255,255,0.15)" }}
        >
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
