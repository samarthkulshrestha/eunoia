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
