"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useEffect } from "react";
import { InterestCloud } from "./InterestCloud";
import { ConstellationLines } from "./ConstellationLines";
import { useStore } from "@/lib/store";

function SceneContent() {
  const {
    interests,
    fetchInterests,
    bridgeMode,
    bridgeSelections,
    bridgeInterests,
  } = useStore();

  useEffect(() => {
    fetchInterests();
  }, [fetchInterests]);

  useEffect(() => {
    if (bridgeMode && bridgeSelections[0] && bridgeSelections[1]) {
      bridgeInterests(bridgeSelections[0], bridgeSelections[1]);
    }
  }, [bridgeMode, bridgeSelections, bridgeInterests]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <Stars
        radius={100}
        depth={50}
        count={6000}
        factor={5}
        saturation={0}
        fade
        speed={1.0}
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
      <ConstellationLines />
      <EffectComposer>
        <Bloom luminanceThreshold={0.5} mipmapBlur intensity={1.5} />
      </EffectComposer>
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
