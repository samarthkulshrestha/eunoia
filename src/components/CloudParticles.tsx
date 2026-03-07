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

// Create a soft radial gradient texture for cloud sprites
function createCloudTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.3, "rgba(255, 255, 255, 0.6)");
  gradient.addColorStop(0.6, "rgba(255, 255, 255, 0.15)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

let sharedTexture: THREE.Texture | null = null;
function getCloudTexture() {
  if (!sharedTexture) {
    sharedTexture = createCloudTexture();
  }
  return sharedTexture;
}

export function CloudParticles({
  position,
  color,
  count = 200,
  radius = 2,
  opacity = 0.8,
}: CloudParticlesProps) {
  const meshRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);
  const initialPositions = useRef<Float32Array | null>(null);

  const { positions, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Gaussian-ish distribution: dense core, sparse periphery
      const u = Math.random();
      const r = radius * Math.pow(u, 0.4);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Vary sizes — large soft blobs at core, smaller at edges
      const distFromCenter = r / radius;
      const baseSize = 0.6 + Math.random() * 0.8;
      sizes[i] = baseSize * (1 - distFromCenter * 0.5);
    }

    initialPositions.current = new Float32Array(positions);
    return { positions, sizes };
  }, [count, radius]);

  useFrame((_, delta) => {
    if (!meshRef.current || !initialPositions.current) return;
    timeRef.current += delta;
    const t = timeRef.current;

    // Gentle organic drift around initial positions
    const posAttr = meshRef.current.geometry.attributes.position;
    const arr = posAttr.array as Float32Array;
    const init = initialPositions.current;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const speed = 0.3 + (i % 7) * 0.05;
      arr[idx] = init[idx] + Math.sin(t * speed + i * 0.7) * 0.08;
      arr[idx + 1] = init[idx + 1] + Math.cos(t * speed * 0.8 + i * 0.5) * 0.08;
      arr[idx + 2] = init[idx + 2] + Math.sin(t * speed * 0.6 + i * 0.9) * 0.06;
    }
    posAttr.needsUpdate = true;
  });

  const threeColor = useMemo(() => new THREE.Color(color), [color]);
  const texture = useMemo(() => getCloudTexture(), []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [positions, sizes]);

  return (
    <points ref={meshRef} position={position} geometry={geometry}>
      <pointsMaterial
        color={threeColor}
        size={0.8}
        map={texture}
        transparent
        opacity={opacity * 0.35}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
