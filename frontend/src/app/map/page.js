"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import HeaderBar from "@/components/layout/HeaderBar";

const MapWithNoSSR = dynamic(() => import("@/components/MainMap"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-slate-900 text-white">
      Memuat Peta...
    </div>
  ),
});

export default function Home() {
  const [activePanel, setActivePanel] = useState(null);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* HEADER */}
      <HeaderBar />

      {/* MAP (ambil sisa tinggi layar) */}
      <div className="flex-1 relative">
        <MapWithNoSSR
          activePanel={activePanel}
          setActivePanel={setActivePanel}
        />
      </div>
    </div>
  );
}
