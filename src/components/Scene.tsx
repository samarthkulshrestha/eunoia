"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { useEffect } from "react";
import { InterestCloud } from "./InterestCloud";
import { useStore } from "@/lib/store";

function SceneContent() {
  const { interests, fetchInterests } = useStore();

  useEffect(() => {
    fetchInterests();
  }, [fetchInterests]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <Stars
        radius={100}
        depth={50}
        count={2000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={50}
        enablePan
      />
      {interests.map((interest) => (
        <InterestCloud key={interest.id} interest={interest} />
      ))}
    </>
  );
}

export function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 20], fov: 60 }}
      style={{ background: "#0a0a0f" }}
      gl={{ antialias: true, alpha: false }}
    >
      <SceneContent />
    </Canvas>
  );
}
