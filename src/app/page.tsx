"use client";

import dynamic from "next/dynamic";
import { UIOverlay } from "@/components/UIOverlay";

const Scene = dynamic(() => import("@/components/Scene").then((mod) => mod.Scene), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="h-screen w-screen">
      <Scene />
      <UIOverlay />
    </main>
  );
}
