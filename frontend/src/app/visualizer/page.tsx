"use client";

import { useState } from "react";
import Link from "next/link";
import ImageUpload from "@/components/ImageUpload";
import FloorVisualizer from "@/components/FloorVisualizer";
import TexturePicker from "@/components/TexturePicker";
import { useSegmentation } from "@/hooks/useSegmentation";
import { TEXTURES } from "@/lib/textures";

export default function VisualizerPage() {
  const [selectedTexture, setSelectedTexture] = useState(TEXTURES[0]);
  const { segmentImage, result, isLoading, error } = useSegmentation();

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-950 overflow-hidden">

      {/* Header compacto */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800 shrink-0">
        <Link href="/" className="font-bold text-base">
          Pavi<span className="text-brand-500">Flex</span>
        </Link>
        <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded">V1 Beta</span>
      </header>

      {/* Layout: en móvil columna, en desktop fila */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

        {/* Canvas principal — ocupa todo el espacio disponible */}
        <main className="flex-1 flex items-center justify-center bg-gray-900 overflow-hidden min-h-0">
          {result ? (
            <FloorVisualizer
              segmentationResult={result}
              texture={selectedTexture}
            />
          ) : (
            <div className="text-center text-gray-600 select-none">
              {isLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-400">Analizando imagen...</p>
                </div>
              ) : (
                <>
                  <p className="text-5xl mb-3">🏠</p>
                  <p className="text-sm">Sube una foto o usa la cámara</p>
                </>
              )}
            </div>
          )}
        </main>

        {/* Panel de controles */}
        {/* Móvil: barra inferior fija / Desktop: sidebar derecho */}
        <aside className="
          md:w-64 md:border-l md:border-gray-800 md:flex-col md:overflow-y-auto
          flex flex-col
          border-t border-gray-800
          bg-gray-950
          shrink-0
        ">
          {/* Upload + cámara */}
          <div className="px-3 pt-3 pb-2 md:px-4 md:pt-4">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2 hidden md:block">
              1. Foto
            </p>
            <ImageUpload onImage={segmentImage} isLoading={isLoading} />
            {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
          </div>

          <div className="w-full h-px bg-gray-800" />

          {/* Selector de texturas */}
          <div className="px-3 py-2 md:px-4 md:py-3">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2 hidden md:block">
              2. Pavimento
            </p>
            <TexturePicker
              textures={TEXTURES}
              selected={selectedTexture}
              onSelect={setSelectedTexture}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
