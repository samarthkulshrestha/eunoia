"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface CloudParticlesProps {
  position: [number, number, number];
  color: string;
  count?: number;
  radius?: number;
  opacity?: number;
}

// Seeded random for deterministic cloud shapes
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

// Generate billboarded puff positions that form a cloud shape
function generatePuffs(
  count: number,
  radius: number,
  seed: number
): { offsets: Float32Array; scales: Float32Array; opacities: Float32Array } {
  const rand = seededRandom(seed);
  const offsets = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const opacities = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Core puffs: tightly packed near center
    // Outer puffs: scattered, smaller, more transparent
    const layer = i / count;

    // Ellipsoidal distribution — wider than tall
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    const r = radius * Math.pow(rand(), 0.35) * (0.3 + layer * 0.7);

    offsets[i * 3] = r * Math.sin(phi) * Math.cos(theta) * 1.3; // wider
    offsets[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.7; // flatter
    offsets[i * 3 + 2] = r * Math.cos(phi) * 1.1;

    // Core puffs are larger
    const distNorm = r / radius;
    scales[i] = radius * (0.5 + rand() * 0.6) * (1.0 - distNorm * 0.4);

    // Core is more opaque
    opacities[i] = (1.0 - distNorm * 0.6) * (0.15 + rand() * 0.1);
  }

  return { offsets, scales, opacities };
}

// Shared soft sphere texture — radial gradient with smooth falloff
let sharedTexture: THREE.Texture | null = null;
function getPuffTexture(): THREE.Texture {
  if (sharedTexture) return sharedTexture;

  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, "rgba(255, 255, 255, 1.0)");
  gradient.addColorStop(0.15, "rgba(255, 255, 255, 0.95)");
  gradient.addColorStop(0.35, "rgba(255, 255, 255, 0.6)");
  gradient.addColorStop(0.55, "rgba(255, 255, 255, 0.25)");
  gradient.addColorStop(0.75, "rgba(255, 255, 255, 0.08)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  sharedTexture = new THREE.CanvasTexture(canvas);
  sharedTexture.needsUpdate = true;
  return sharedTexture;
}

export function CloudParticles({
  position,
  color,
  count = 200,
  radius = 2,
  opacity = 0.8,
}: CloudParticlesProps) {
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  // Use position as seed for deterministic shape
  const seed = useMemo(
    () => Math.abs(Math.floor(position[0] * 1000 + position[1] * 100 + position[2] * 10)) || 42,
    [position]
  );

  // Generate many puffs — these are the "cotton balls" that stack into a cloud
  const puffCount = Math.max(count, 60);
  const { offsets, scales, opacities: puffOpacities } = useMemo(
    () => generatePuffs(puffCount, radius, seed),
    [puffCount, radius, seed]
  );

  const initialOffsets = useRef(new Float32Array(offsets));

  const threeColor = useMemo(() => new THREE.Color(color), [color]);
  const texture = useMemo(() => getPuffTexture(), []);

  // Instanced mesh for performance — one sprite per puff
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Set up instances
  useMemo(() => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;

    for (let i = 0; i < puffCount; i++) {
      dummy.position.set(offsets[i * 3], offsets[i * 3 + 1], offsets[i * 3 + 2]);
      dummy.scale.setScalar(scales[i]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meshRef.current, puffCount, offsets, scales, dummy]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    timeRef.current += delta;
    const t = timeRef.current;
    const mesh = meshRef.current;
    const init = initialOffsets.current;

    // Make each puff slowly drift for a living, breathing cloud
    for (let i = 0; i < puffCount; i++) {
      const idx = i * 3;
      const speed = 0.15 + (i % 5) * 0.03;
      const ox = init[idx] + Math.sin(t * speed + i * 1.3) * 0.06;
      const oy = init[idx + 1] + Math.cos(t * speed * 0.7 + i * 0.9) * 0.04;
      const oz = init[idx + 2] + Math.sin(t * speed * 0.5 + i * 2.1) * 0.05;

      dummy.position.set(ox, oy, oz);
      // Subtle scale pulsing
      const pulse = 1.0 + Math.sin(t * 0.5 + i * 0.8) * 0.05;
      dummy.scale.setScalar(scales[i] * pulse);

      // Billboard: always face camera
      dummy.quaternion.copy(state.camera.quaternion);

      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  // Build per-instance opacity into vertex colors
  const instanceColors = useMemo(() => {
    const arr = new Float32Array(puffCount * 3);
    for (let i = 0; i < puffCount; i++) {
      // Encode opacity into the vertex color alpha channel via brightness
      const o = puffOpacities[i] * opacity;
      arr[i * 3] = threeColor.r * o;
      arr[i * 3 + 1] = threeColor.g * o;
      arr[i * 3 + 2] = threeColor.b * o;
    }
    return arr;
  }, [puffCount, puffOpacities, opacity, threeColor]);

  return (
    <group ref={groupRef} position={position}>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, puffCount]}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={texture}
          transparent
          depthWrite={false}
          blending={THREE.NormalBlending}
          color={threeColor}
          opacity={opacity * 0.5}
        />
      </instancedMesh>
    </group>
  );
}
