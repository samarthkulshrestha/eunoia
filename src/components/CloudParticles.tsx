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

// Soft circular sprite texture
let sharedTexture: THREE.Texture | null = null;
function getParticleTexture(): THREE.Texture {
  if (sharedTexture) return sharedTexture;

  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.4, "rgba(255, 255, 255, 0.6)");
  gradient.addColorStop(0.7, "rgba(255, 255, 255, 0.15)");
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
  count = 600,
  radius = 2,
  opacity = 0.8,
}: CloudParticlesProps) {
  const meshRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);
  const initialPositions = useRef<Float32Array | null>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const r = radius * Math.pow(Math.random(), 0.5);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }

    initialPositions.current = new Float32Array(arr);
    return arr;
  }, [count, radius]);

  useFrame((_, delta) => {
    if (!meshRef.current || !initialPositions.current) return;
    timeRef.current += delta;
    const t = timeRef.current;

    const posAttr = meshRef.current.geometry.attributes.position;
    const arr = posAttr.array as Float32Array;
    const init = initialPositions.current;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const speed = 0.2 + (i % 7) * 0.03;
      arr[idx] = init[idx] + Math.sin(t * speed + i * 0.7) * 0.05;
      arr[idx + 1] = init[idx + 1] + Math.cos(t * speed * 0.8 + i * 0.5) * 0.05;
      arr[idx + 2] = init[idx + 2] + Math.sin(t * speed * 0.6 + i * 0.9) * 0.04;
    }
    posAttr.needsUpdate = true;
  });

  const threeColor = useMemo(() => new THREE.Color(color), [color]);
  const texture = useMemo(() => getParticleTexture(), []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  return (
    <points ref={meshRef} position={position} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        color={threeColor}
        size={0.15}
        map={texture}
        transparent
        opacity={opacity}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        depthTest={false}
      />
    </points>
  );
}
