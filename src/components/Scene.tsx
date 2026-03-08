"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useEffect } from "react";
import { InterestCloud } from "./InterestCloud";
import { BridgeZone } from "./BridgeZone";
import { ConstellationLines } from "./ConstellationLines";
import { useStore } from "@/lib/store";

function SceneContent() {
  const {
    interests,
    fetchInterests,
    bridgeMode,
    bridgeSelections,
    bridgeInterests,
    bridgeResult,
  } = useStore();

  useEffect(() => {
    fetchInterests();
  }, [fetchInterests]);

  useEffect(() => {
    if (bridgeMode && bridgeSelections[0] && bridgeSelections[1]) {
      bridgeInterests(bridgeSelections[0], bridgeSelections[1]);
    }
  }, [bridgeMode, bridgeSelections, bridgeInterests]);

  const rootInterests = interests.filter(
    (i) => i.depth === 0 || i.source === "manual"
  );

  const interestA =
    bridgeSelections[0]
      ? interests.find((i) => i.id === bridgeSelections[0]) || null
      : null;
  const interestB =
    bridgeSelections[1]
      ? interests.find((i) => i.id === bridgeSelections[1]) || null
      : null;

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
      {rootInterests.map((interest) => (
        <InterestCloud key={interest.id} interest={interest} />
      ))}
      <ConstellationLines />
      {bridgeMode && interestA && interestB && bridgeResult && (
        <BridgeZone interestA={interestA} interestB={interestB} />
      )}
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
