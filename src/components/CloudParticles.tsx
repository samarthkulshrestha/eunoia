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
  gradient.addColorStop(0.3, "rgba(255, 255, 255, 0.7)");
  gradient.addColorStop(0.6, "rgba(255, 255, 255, 0.2)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  sharedTexture = new THREE.CanvasTexture(canvas);
  sharedTexture.needsUpdate = true;
  return sharedTexture;
}

// Custom shader: per-particle size + opacity based on distance from center
const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aOpacity;
  varying float vOpacity;

  void main() {
    vOpacity = aOpacity;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (200.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform sampler2D uMap;
  varying float vOpacity;

  void main() {
    vec4 texColor = texture2D(uMap, gl_PointCoord);
    gl_FragColor = vec4(uColor, texColor.a * vOpacity);
  }
`;

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

  const { positions, sizes, opacities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const opacities = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Distribute with more density at center
      const r = radius * Math.pow(Math.random(), 0.45);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const dist = r / radius; // 0 at center, 1 at edge

      // Core particles: larger, brighter. Edge particles: smaller, fainter.
      sizes[i] = (0.8 + Math.random() * 0.6) * (1.0 - dist * 0.6);
      opacities[i] = opacity * (1.0 - dist * 0.7) * (0.5 + Math.random() * 0.5);
    }

    initialPositions.current = new Float32Array(positions);
    return { positions, sizes, opacities };
  }, [count, radius, opacity]);

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
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("aOpacity", new THREE.BufferAttribute(opacities, 1));
    return geo;
  }, [positions, sizes, opacities]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uColor: { value: threeColor },
        uMap: { value: texture },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update color reactively
  useMemo(() => {
    material.uniforms.uColor.value.set(color);
  }, [color, material]);

  return (
    <points
      ref={meshRef}
      position={position}
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  );
}
