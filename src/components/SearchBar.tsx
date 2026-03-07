"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const { interests, selectInterest } = useStore();

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return interests.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 5);
  }, [query, interests]);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-80">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 200)}
        placeholder="Search interests..."
        className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
      />
      {focused && results.length > 0 && (
        <div className="mt-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
          {results.map((interest) => (
            <button
              key={interest.id}
              onClick={() => {
                selectInterest(interest);
                setQuery("");
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors"
            >
              {interest.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
