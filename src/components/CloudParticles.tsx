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
  // Extremely soft, preventing the blown-out look
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.1, "rgba(255, 255, 255, 0.6)");
  gradient.addColorStop(0.4, "rgba(255, 255, 255, 0.1)");
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
  attribute float aCoreDist;
  attribute vec3 aColorJitter;
  
  varying float vOpacity;
  varying float vCoreDist;
  varying vec3 vColorJitter;

  void main() {
    vOpacity = aOpacity;
    vCoreDist = aCoreDist;
    vColorJitter = aColorJitter;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (40.0 / -mvPosition.z); // Scale down points
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform sampler2D uMap;
  
  varying float vOpacity;
  varying float vCoreDist;
  varying vec3 vColorJitter;

  // Function to convert HSL to RGB
  vec3 hsl2rgb(vec3 c) {
      vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
      return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
  }

  // Function to convert RGB to HSL
  vec3 rgb2hsl(vec3 c) {
      float cMin = min(min(c.r, c.g), c.b);
      float cMax = max(max(c.r, c.g), c.b);
      float l = (cMax + cMin) / 2.0;
      float s = 0.0;
      if (cMax != cMin) {
          s = l < 0.5 ? (cMax - cMin) / (cMax + cMin) : (cMax - cMin) / (2.0 - cMax - cMin);
      }
      float h = 0.0;
      if (cMax != cMin) {
          if (cMax == c.r) h = (c.g - c.b) / (cMax - cMin);
          else if (cMax == c.g) h = 2.0 + (c.b - c.r) / (cMax - cMin);
          else h = 4.0 + (c.r - c.g) / (cMax - cMin);
          h /= 6.0;
          if (h < 0.0) h += 1.0;
      }
      return vec3(h, s, l);
  }

  void main() {
    // Make circular texture
    float distToCenter = distance(gl_PointCoord, vec2(0.5));
    if (distToCenter > 0.5) discard;

    vec4 texColor = texture2D(uMap, gl_PointCoord);
    
    // Base colors
    vec3 coreColor = vec3(1.0, 0.95, 0.9); // Warm white core
    vec3 baseColor = uColor;
    
    // Mix core and base by distance
    vec3 mixedColor = mix(coreColor, baseColor, pow(vCoreDist, 0.4));
    
    // Apply jitter in HSL space
    vec3 hsl = rgb2hsl(mixedColor);
    hsl.x += vColorJitter.x; // Hue shift
    hsl.y = clamp(hsl.y + vColorJitter.y, 0.0, 1.0); // Saturation shift
    hsl.z = clamp(hsl.z + vColorJitter.z, 0.0, 1.0); // Lightness shift
    // Ensure hue is normalized
    hsl.x = fract(hsl.x);

    vec3 finalColor = hsl2rgb(hsl);
    gl_FragColor = vec4(finalColor, texColor.a * vOpacity);
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

  const { positions, sizes, opacities, coreDists, colorJitters, tiltX, tiltZ, rotationSpeed } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const opacities = new Float32Array(count);
    const coreDists = new Float32Array(count);
    const colorJitters = new Float32Array(count * 3);

    const branches = Math.random() > 0.5 ? 2 : 3;
    const spin = 3.0 + Math.random() * 2.0;

    for (let i = 0; i < count; i++) {
      // Gaussian-ish radius. High density near center.
      const rTemp = Math.random() + Math.random() + Math.random() - 1.5; 
      // r is heavily biased towards 0
      const r = Math.abs(rTemp) * radius * 0.9;
      const dist = Math.min(r / radius, 1.0);
      
      let theta = 0;
      
      const isDiskParticle = Math.random() > 0.4; // 40% general disk filling, 60% prominent arms
      if (isDiskParticle) {
          theta = Math.random() * Math.PI * 2;
      } else {
          const branchAngle = (Math.floor(Math.random() * branches) / branches) * Math.PI * 2;
          theta = branchAngle + dist * spin;
          // Soft scatter around arms. More scatter at edges.
          theta += (Math.random() - 0.5) * (0.5 + dist * 1.5);
      }

      // Very thin disk, thicker core
      const coreThickness = Math.exp(-dist * dist * 30.0) * 0.3; // tighter, thinner core bulge
      const diskThickness = 0.01 + dist * 0.02; // very thin plane
      const y = (Math.random() - 0.5) * radius * (diskThickness + coreThickness);

      positions[i * 3] = r * Math.cos(theta);
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = r * Math.sin(theta);

      const isCore = Math.exp(-dist * dist * 20.0);
      sizes[i] = (0.5 + Math.random() * 0.5) * (1.0 - dist * 0.3) + isCore * 1.2;
      opacities[i] = opacity * (0.15 + Math.random() * 0.5 + isCore * 0.5); // lower overall opacity to prevent blow-out

      coreDists[i] = dist; // Passes distance to shader for mixing

      // Jitter defaults - Subtle variations to maintain the galaxy's base color identity
      let hJitter = (Math.random() - 0.5) * 0.15; // Small hue variation
      let sJitter = (Math.random() - 0.5) * 0.2;
      let lJitter = (Math.random() - 0.5) * 0.2;

      // Make 10% of stars radically different colored (like red giants or blue giants)
      if (Math.random() > 0.90) {
          hJitter = Math.random(); // Any color
          sJitter = 0.5;
          lJitter = 0.4;
          sizes[i] *= 1.8; // make these characteristic stars slightly larger
          opacities[i] = 1.0;
      }

      colorJitters[i * 3] = hJitter;
      colorJitters[i * 3 + 1] = sJitter;
      colorJitters[i * 3 + 2] = lJitter;
    }

    initialPositions.current = new Float32Array(positions);
    
    // Tilt the galaxies significantly like Andromeda
    const tiltX = (Math.random() - 0.5) * Math.PI * 0.6;
    const tiltZ = (Math.random() - 0.5) * Math.PI * 0.6;
    
    const rotationSpeed = (Math.random() > 0.5 ? 1 : -1) * (0.01 + Math.random() * 0.02);

    return { positions, sizes, opacities, coreDists, colorJitters, tiltX, tiltZ, rotationSpeed };
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
      arr[idx] = init[idx] + Math.sin(t * speed + i * 0.7) * 0.02;
      arr[idx + 1] = init[idx + 1] + Math.cos(t * speed * 0.8 + i * 0.5) * 0.02;
      arr[idx + 2] = init[idx + 2] + Math.sin(t * speed * 0.6 + i * 0.9) * 0.02;
    }
    posAttr.needsUpdate = true;

    // Slowly rotate the entire galaxy
    meshRef.current.rotation.y = t * rotationSpeed;
    meshRef.current.rotation.x = tiltX;
    meshRef.current.rotation.z = tiltZ;
  });

  const threeColor = useMemo(() => new THREE.Color(color), [color]);
  const texture = useMemo(() => getParticleTexture(), []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("aOpacity", new THREE.BufferAttribute(opacities, 1));
    geo.setAttribute("aCoreDist", new THREE.BufferAttribute(coreDists, 1));
    geo.setAttribute("aColorJitter", new THREE.BufferAttribute(colorJitters, 3));
    return geo;
  }, [positions, sizes, opacities, coreDists, colorJitters]);

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
