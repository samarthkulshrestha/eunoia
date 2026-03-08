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
