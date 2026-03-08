"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useStore } from "@/lib/store";

const DIAMOND_SIZE = 0.15;

function DiamondMarker({ position, color }: { position: THREE.Vector3; color: string }) {
  return (
    <mesh position={position} rotation={[0, 0, Math.PI / 4]}>
      <planeGeometry args={[DIAMOND_SIZE, DIAMOND_SIZE]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
}

function DashedLine({ from, to, opacity }: { from: THREE.Vector3; to: THREE.Vector3; opacity: number }) {
  const lineObj = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
    const material = new THREE.LineDashedMaterial({
      color: "#ffffff",
      transparent: true,
      opacity,
      dashSize: 0.3,
      gapSize: 0.15,
    });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    return line;
  }, [from, to, opacity]);

  return <primitive object={lineObj} />;
}

export function ConstellationLines() {
  const interests = useStore((s) => s.interests);
  const constellationMode = useStore((s) => s.constellationMode);
  const hoveredInterestId = useStore((s) => s.hoveredInterestId);

  const lines = useMemo(() => {
    if (!constellationMode) return [];

    const seen = new Set<string>();
    const result: {
      key: string;
      from: THREE.Vector3;
      to: THREE.Vector3;
      fromId: string;
      toId: string;
    }[] = [];

    const interestMap = new Map(interests.map((i) => [i.id, i]));

    interests.forEach((interest) => {
      const allEdges = [
        ...(interest.edgesFrom || []),
        ...(interest.edgesTo || []),
      ];
      allEdges.forEach((edge) => {
        const pairKey = [edge.fromId, edge.toId].sort().join("-");
        if (seen.has(pairKey)) return;
        seen.add(pairKey);

        const from = interestMap.get(edge.fromId);
        const to = interestMap.get(edge.toId);
        if (!from || !to) return;

        result.push({
          key: pairKey,
          from: new THREE.Vector3(from.posX, from.posY, from.posZ),
          to: new THREE.Vector3(to.posX, to.posY, to.posZ),
          fromId: edge.fromId,
          toId: edge.toId,
        });
      });
    });

    return result;
  }, [interests, constellationMode]);

  if (!constellationMode || lines.length === 0) return null;

  return (
    <group>
      {lines.map((line) => {
        const isHighlighted =
          !hoveredInterestId || hoveredInterestId === line.fromId || hoveredInterestId === line.toId;
        const opacity = isHighlighted ? 0.4 : 0.08;

        return (
          <group key={line.key}>
            <DashedLine from={line.from} to={line.to} opacity={opacity} />
            <DiamondMarker position={line.from} color="#ffffff" />
            <DiamondMarker position={line.to} color="#ffffff" />
          </group>
        );
      })}
    </group>
  );
}
