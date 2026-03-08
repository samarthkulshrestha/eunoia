"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
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
  const {
    selectInterest,
    bridgeMode,
    setBridgeSelection,
    bridgeSelections,
    bridgeResult,
    interests,
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

  useFrame(() => {
    if (!groupRef.current) return;

    if (
      bridgeMode &&
      isSelected &&
      bridgeSelections[0] &&
      bridgeSelections[1] &&
      bridgeResult
    ) {
      const partnerId =
        bridgeSelections[0] === interest.id
          ? bridgeSelections[1]
          : bridgeSelections[0];
      const partner = interests.find((i) => i.id === partnerId);
      if (!partner) return;

      const midX = (interest.posX + partner.posX) / 2;
      const midY = (interest.posY + partner.posY) / 2;
      const midZ = (interest.posZ + partner.posZ) / 2;
      const targetX = interest.posX + (midX - interest.posX) * 0.3;
      const targetY = interest.posY + (midY - interest.posY) * 0.3;
      const targetZ = interest.posZ + (midZ - interest.posZ) * 0.3;

      groupRef.current.position.lerp(
        new THREE.Vector3(targetX, targetY, targetZ),
        0.02
      );
    } else {
      groupRef.current.position.lerp(
        new THREE.Vector3(...basePosition),
        0.05
      );
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (bridgeMode) {
      setBridgeSelection(interest.id);
    } else {
      selectInterest(interest);
    }
  };

  const color = interest.color || "#6688ff";
  const particleCount = interest.source === "ai-generated" ? 400 : 800;
  const cloudOpacity = interest.source === "ai-generated" ? 0.5 : 0.8;

  return (
    <group ref={groupRef} position={basePosition}>
      <CloudParticles
        position={[0, 0, 0]}
        color={color}
        count={particleCount}
        radius={1.5}
        opacity={cloudOpacity}
      />
      {/* Clickable invisible sphere for interaction */}
      <mesh
        onClick={handleClick}
        onPointerEnter={() => setHoveredInterestId(interest.id)}
        onPointerLeave={() => setHoveredInterestId(null)}
      >
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
