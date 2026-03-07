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

export function CloudParticles({
  position,
  color,
  count = 200,
  radius = 2,
  opacity = 0.8,
}: CloudParticlesProps) {
  const meshRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);

  const { positions, sizes, opacities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const opacities = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Gaussian-like distribution: dense core, sparse periphery
      const r = radius * Math.pow(Math.random(), 0.5);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Larger particles at core, smaller at edges
      const distFromCenter = r / radius;
      sizes[i] = (1 - distFromCenter * 0.7) * 0.15;
      opacities[i] = (1 - distFromCenter) * opacity;
    }

    return { positions, sizes, opacities };
  }, [count, radius, opacity]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    timeRef.current += delta;

    // Subtle ambient drift
    const posAttr = meshRef.current.geometry.attributes.position;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      arr[idx] += Math.sin(timeRef.current + i * 0.1) * 0.001;
      arr[idx + 1] += Math.cos(timeRef.current + i * 0.15) * 0.001;
      arr[idx + 2] += Math.sin(timeRef.current * 0.5 + i * 0.2) * 0.001;
    }
    posAttr.needsUpdate = true;
  });

  const threeColor = useMemo(() => new THREE.Color(color), [color]);

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
        size={0.1}
        transparent
        opacity={opacity}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
