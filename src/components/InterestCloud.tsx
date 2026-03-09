"use client";

import { Html } from "@react-three/drei";
import * as THREE from "three";
import { CloudParticles } from "./CloudParticles";
import { useStore } from "@/lib/store";
import type { Interest } from "@/lib/types";

function StarLabel({ interest, radius, isSelected }: { interest: Interest; radius: number; isSelected: boolean }) {
  const filterId = `glow-${interest.id.slice(0, 8)}`;

  return (
    <Html
      position={[0, -radius * 0.4, 0]}
      distanceFactor={8}
      zIndexRange={[40, 0]}
      style={{ pointerEvents: "none" }}
    >
      <div style={{ pointerEvents: "none" }}>
        <svg
          width="120" height="50"
          viewBox="0 0 120 50"
          style={{
            overflow: "visible",
            position: "absolute",
            top: 0,
            left: -4,
            pointerEvents: "none",
          }}
        >
          <defs>
            <filter id={filterId}>
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Diamond tick at origin */}
          <rect
            x="-3" y="-3" width="6" height="6"
            transform="rotate(45, 0, 0)"
            fill="white"
            filter={`url(#${filterId})`}
          />
          {/* Angled leader line */}
          <polyline
            points="0,0 0,22 40,40"
            fill="none"
            stroke="white"
            strokeWidth="2"
            filter={`url(#${filterId})`}
          />
        </svg>
        <span style={{
          position: "absolute",
          top: 35,
          left: 42,
          color: "white",
          textShadow: "0 0 6px rgba(255,255,255,0.6), 0 0 12px rgba(255,255,255,0.3)",
          fontFamily: "var(--font-mono), monospace",
          fontSize: "16px",
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}>
          {interest.name}
        </span>
      </div>
    </Html>
  );
}

interface InterestCloudProps {
  interest: Interest;
}

export function InterestCloud({ interest }: InterestCloudProps) {
  const {
    selectInterest,
    bridgeMode,
    setBridgeSelection,
    bridgeSelections,
    setHoveredInterestId,
  } = useStore();

  const isSelected =
    bridgeSelections[0] === interest.id ||
    bridgeSelections[1] === interest.id;

  const basePosition: [number, number, number] = [
    interest.posX,
    interest.posY,
    interest.posZ,
  ];

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (bridgeMode) {
      setBridgeSelection(interest.id);
    } else {
      selectInterest(interest);
    }
  };

  // Generate a distinct deterministic color based on the interest ID
  const getDeterministicColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    // Return a vibrant HSL color for the galaxy base
    return `hsl(${hue}, 85%, 60%)`;
  };

  // We'll override the default color to ensure vibrant differentiation between galaxies
  const color = interest.color && interest.color !== "#6688ff" ? interest.color : getDeterministicColor(interest.id);

  // Scale galaxy size by number of links — more connected = larger & denser
  const linkCount = (interest.edgesFrom?.length || 0) + (interest.edgesTo?.length || 0);
  const scaleFactor = 0.6 + Math.sqrt(linkCount) * 0.4; // 0.6x base, grows with sqrt of links
  const baseCount = interest.source === "ai-generated" ? 4000 : 8000;
  const particleCount = Math.round(baseCount * scaleFactor);
  const radius = 2.0 * scaleFactor;
  const cloudOpacity = interest.source === "ai-generated" ? 0.6 : 0.9;

  return (
    <group position={basePosition}>
      <CloudParticles
        position={[0, 0, 0]}
        color={color}
        count={particleCount}
        radius={radius}
        opacity={cloudOpacity}
      />
      {/* Clickable invisible sphere for interaction */}
      <mesh
        onClick={handleClick}
        onPointerEnter={() => setHoveredInterestId(interest.id)}
        onPointerLeave={() => setHoveredInterestId(null)}
      >
        <sphereGeometry args={[radius * 1.1, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {/* Label with SVG leader line — adaptive size */}
      <StarLabel interest={interest} radius={radius} isSelected={isSelected} />
      {/* Selection glow */}
      {isSelected && (
        <mesh>
          <sphereGeometry args={[radius * 1.25, 32, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.1}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  );
}
