"use client";

import dynamic from "next/dynamic";

const Scene = dynamic(() => import("@/components/Scene").then((mod) => mod.Scene), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="h-screen w-screen">
      <Scene />
    </main>
  );
}
