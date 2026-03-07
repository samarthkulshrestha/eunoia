"use client";

import { useState } from "react";
import type { KnowledgeDimension as KDType } from "@/lib/types";

interface Props {
  title: string;
  dimension: KDType;
}

export function KnowledgeDimensionView({ title, dimension }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full py-3 flex justify-between items-center text-left group"
      >
        <span className="text-xs tracking-widest uppercase text-white/50 group-hover:text-white/80 transition-colors">
          {title}
        </span>
        <span className="text-white/20 text-xs">{expanded ? "−" : "+"}</span>
      </button>
      {expanded && (
        <div className="pb-4">
          <p className="text-sm text-white/40 mb-3 leading-relaxed">
            {dimension.summary}
          </p>
          <div className="space-y-3">
            {dimension.items.map((item, i) => (
              <div key={i} className="pl-3 border-l border-white/10">
                <p className="text-sm text-white/80 font-medium">
                  {item.name}
                </p>
                <p className="text-xs text-white/40 mt-1 leading-relaxed">
                  {item.description}
                </p>
                {item.works && item.works.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.works.map((work, j) => (
                      <span
                        key={j}
                        className="text-xs bg-white/5 px-2 py-0.5 rounded-full text-white/30"
                      >
                        {work}
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
