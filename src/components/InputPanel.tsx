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
