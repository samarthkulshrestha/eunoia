"use client";

import { useRef } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { CloudParticles } from "./CloudParticles";
import { useStore } from "@/lib/store";
import type { Interest } from "@/lib/types";

interface InterestCloudProps {
  interest: Interest;
}

export function InterestCloud({ interest }: InterestCloudProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { selectInterest, bridgeMode, setBridgeSelection, bridgeSelections } =
    useStore();

  const isSelected =
    bridgeSelections[0] === interest.id ||
    bridgeSelections[1] === interest.id;

  const position: [number, number, number] = [
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

  const color = interest.color || "#6688ff";
  const particleCount = interest.source === "ai-generated" ? 100 : 200;
  const cloudOpacity = interest.source === "ai-generated" ? 0.4 : 0.8;

  return (
    <group ref={groupRef} position={position}>
      <CloudParticles
        position={[0, 0, 0]}
        color={color}
        count={particleCount}
        radius={1.5}
        opacity={cloudOpacity}
      />
      {/* Clickable invisible sphere for interaction */}
      <mesh onClick={handleClick}>
        <sphereGeometry args={[1.8, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {/* Label */}
      <Html
        center
        distanceFactor={15}
        style={{
          color: "white",
          fontSize: "12px",
          fontWeight: 300,
          letterSpacing: "0.05em",
          textTransform: "lowercase",
          opacity: isSelected ? 1 : 0.7,
          pointerEvents: "none",
          whiteSpace: "nowrap",
          textShadow: "0 0 10px rgba(0,0,0,0.8)",
        }}
      >
        {interest.name}
      </Html>
      {/* Selection glow */}
      {isSelected && (
        <mesh>
          <sphereGeometry args={[2, 32, 32]} />
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
