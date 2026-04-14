"use client";

import { clsx } from "clsx";
import type { Texture } from "@/lib/textures";

interface Props {
  textures: Texture[];
  selected: Texture;
  onSelect: (t: Texture) => void;
}

export default function TexturePicker({ textures, selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {textures.map((t) => (
        <button
          key={t.id}
          title={t.name}
          onClick={() => onSelect(t)}
          className={clsx(
            "rounded-lg overflow-hidden border-2 transition-all aspect-square",
            selected.id === t.id
              ? "border-brand-500 scale-105 shadow-lg shadow-brand-500/20"
              : "border-transparent hover:border-gray-500"
          )}
        >
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `url(${t.thumbnailUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        </button>
      ))}
    </div>
  );
}
