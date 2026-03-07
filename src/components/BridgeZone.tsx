"use client";

import { useMemo } from "react";
import { CloudParticles } from "./CloudParticles";
import { Html } from "@react-three/drei";
import { useStore } from "@/lib/store";
import type { Interest } from "@/lib/types";

interface BridgeZoneProps {
  interestA: Interest;
  interestB: Interest;
}

export function BridgeZone({ interestA, interestB }: BridgeZoneProps) {
  const { bridgeResult, selectInterest, bridgeMode } = useStore();

  const midpoint: [number, number, number] = useMemo(
    () => [
      (interestA.posX + interestB.posX) / 2,
      (interestA.posY + interestB.posY) / 2,
      (interestA.posZ + interestB.posZ) / 2,
    ],
    [interestA, interestB]
  );

  if (!bridgeResult || !bridgeResult.bridges.length) return null;

  return (
    <group>
      {/* Blended intersection cloud */}
      <CloudParticles
        position={midpoint}
        color="#ffffff"
        count={150}
        radius={2.5}
        opacity={0.3}
      />
      {/* Bridge topic nodes */}
      {bridgeResult.bridges.map((bridge, i) => {
        const angle = (i / bridgeResult.bridges.length) * Math.PI * 2;
        const r = 1.5;
        const pos: [number, number, number] = [
          midpoint[0] + Math.cos(angle) * r,
          midpoint[1] + Math.sin(angle) * r * 0.6,
          midpoint[2] + Math.sin(angle) * r * 0.4,
        ];

        return (
          <group key={bridge.id} position={pos}>
            <CloudParticles
              position={[0, 0, 0]}
              color={interestA.color || "#ffffff"}
              count={40}
              radius={0.5}
              opacity={0.5}
            />
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                selectInterest(bridge);
              }}
            >
              <sphereGeometry args={[0.6, 16, 16]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
            <Html
              center
              distanceFactor={12}
              style={{
                color: "white",
                fontSize: "10px",
                fontWeight: 300,
                opacity: 0.6,
                pointerEvents: "none",
                whiteSpace: "nowrap",
                textShadow: "0 0 10px rgba(0,0,0,0.8)",
              }}
            >
              {bridge.name}
            </Html>
          </group>
        );
      })}
    </group>
  );
}
