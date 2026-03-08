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
