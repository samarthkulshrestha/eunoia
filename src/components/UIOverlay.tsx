"use client";

import { useStore } from "@/lib/store";
import { InputPanel } from "./InputPanel";
import { SearchBar } from "./SearchBar";
import { SidePanel } from "./SidePanel";

export function UIOverlay() {
  const { bridgeMode, toggleBridgeMode, loading, loadingMessage } = useStore();

  return (
    <>
      {/* Title */}
      <div className="fixed top-6 left-6 z-50">
        <h1 className="text-white/40 text-sm font-light tracking-[0.3em] uppercase">
          eunoia
        </h1>
      </div>

      {/* Search bar */}
      <SearchBar />

      {/* Bridge mode toggle */}
      <div className="fixed top-6 right-6 z-50">
        <button
          onClick={toggleBridgeMode}
          className={`px-4 py-2 rounded-full text-xs tracking-widest uppercase transition-all ${
            bridgeMode
              ? "bg-white/20 text-white border border-white/40"
              : "bg-white/5 text-white/40 border border-white/10 hover:text-white/60"
          }`}
        >
          {bridgeMode ? "Exit Bridge" : "Bridge"}
        </button>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 text-white/60 text-sm font-light">
          {loadingMessage}
        </div>
      )}

      {/* Side panel */}
      <SidePanel />

      {/* Input panel */}
      <InputPanel />
    </>
  );
}
