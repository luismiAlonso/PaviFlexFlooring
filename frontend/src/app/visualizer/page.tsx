"use client";

import { useState } from "react";
import ImageUpload from "@/components/ImageUpload";
import FloorVisualizer from "@/components/FloorVisualizer";
import TexturePicker from "@/components/TexturePicker";
import { useSegmentation } from "@/hooks/useSegmentation";
import { TEXTURES } from "@/lib/textures";

export default function VisualizerPage() {
  const [selectedTexture, setSelectedTexture] = useState(TEXTURES[0]);
  const { segmentImage, result, isLoading, error } = useSegmentation();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <span className="font-bold text-lg">
          Pavi<span className="text-brand-500">Flex</span>
        </span>
        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">V1 Beta</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 border-r border-gray-800 flex flex-col gap-6 p-4 overflow-y-auto">
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              1. Sube una foto
            </h2>
            <ImageUpload onImage={segmentImage} isLoading={isLoading} />
            {error && (
              <p className="mt-2 text-sm text-red-400">{error}</p>
            )}
          </section>

          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              2. Elige el pavimento
            </h2>
            <TexturePicker
              textures={TEXTURES}
              selected={selectedTexture}
              onSelect={setSelectedTexture}
            />
          </section>
        </aside>

        {/* Main canvas */}
        <main className="flex-1 flex items-center justify-center bg-gray-900">
          {result ? (
            <FloorVisualizer
              segmentationResult={result}
              texture={selectedTexture}
            />
          ) : (
            <div className="text-center text-gray-600">
              <p className="text-4xl mb-3">🏠</p>
              <p>Sube una foto para comenzar</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
