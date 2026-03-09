"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useStore } from "@/lib/store";

const DIAMOND_SIZE = 0.15;

function DiamondMarker({ position, opacity }: { position: THREE.Vector3; opacity: number }) {
  const ref = useRef<THREE.Mesh>(null);

  // Billboard: always face camera
  useFrame(({ camera }) => {
    if (ref.current) {
      ref.current.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <mesh ref={ref} position={position} rotation={[0, 0, Math.PI / 4]}>
      <planeGeometry args={[DIAMOND_SIZE, DIAMOND_SIZE]} />
      <meshBasicMaterial color="white" transparent opacity={opacity} side={THREE.DoubleSide} />
    </mesh>
  );
}

function DashedSegment({ from, to, opacity }: { from: THREE.Vector3; to: THREE.Vector3; opacity: number }) {
  // Build a series of small cylinders to simulate a dashed line with volume
  const segments = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(to, from);
    const totalLen = dir.length();
    const dashLen = 0.3;
    const gapLen = 0.15;
    const cycleLen = dashLen + gapLen;
    const unitDir = dir.clone().normalize();

    const result: { pos: THREE.Vector3; length: number; quaternion: THREE.Quaternion }[] = [];

    // Compute orientation quaternion: cylinder default axis is Y, we need it along dir
    const quat = new THREE.Quaternion();
    quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), unitDir);

    let dist = 0;
    while (dist < totalLen) {
      const segLen = Math.min(dashLen, totalLen - dist);
      const center = from.clone().add(unitDir.clone().multiplyScalar(dist + segLen / 2));
      result.push({ pos: center, length: segLen, quaternion: quat });
      dist += cycleLen;
    }

    return result;
  }, [from, to]);

  return (
    <>
      {segments.map((seg, i) => (
        <mesh key={i} position={seg.pos} quaternion={seg.quaternion}>
          <cylinderGeometry args={[0.015, 0.015, seg.length, 4]} />
          <meshBasicMaterial color="white" transparent opacity={opacity} />
        </mesh>
      ))}
    </>
  );
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
        const opacity = isHighlighted ? 0.5 : 0.08;

        return (
          <group key={line.key}>
            <DashedSegment from={line.from} to={line.to} opacity={opacity} />
            <DiamondMarker position={line.from} opacity={opacity} />
            <DiamondMarker position={line.to} opacity={opacity} />
          </group>
        );
      })}
    </group>
  );
}
