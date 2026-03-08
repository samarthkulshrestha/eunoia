"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Line } from "@react-three/drei";
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
    <group ref={groupRef} position={basePosition}>
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
      {/* Leader line from galaxy edge to label */}
      <Line
        points={[
          [0, -radius * 0.6, 0],
          [0, -radius * 0.6 - 0.4, 0],
          [radius * 0.5, -radius * 0.6 - 0.8, 0],
        ]}
        color="white"
        lineWidth={0.5}
        transparent
        opacity={isSelected ? 0.5 : 0.25}
      />
      {/* Diamond tick at line end */}
      <mesh
        position={[0, -radius * 0.6, 0]}
        rotation={[0, 0, Math.PI / 4]}
      >
        <planeGeometry args={[0.08, 0.08]} />
        <meshBasicMaterial color="white" transparent opacity={isSelected ? 0.6 : 0.3} side={THREE.DoubleSide} />
      </mesh>
      {/* Label — SDF text rendered in WebGL */}
      <Text
        position={[radius * 0.5 + 0.1, -radius * 0.6 - 0.8, 0]}
        fontSize={0.28}
        color="white"
        anchorX="left"
        anchorY="middle"
        font="/fonts/SpaceMono-Regular.ttf"
        letterSpacing={0.12}
        fillOpacity={isSelected ? 0.9 : 0.55}
      >
        {interest.name.toUpperCase()}
      </Text>
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
