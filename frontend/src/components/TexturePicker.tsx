"use client";

import { clsx } from "clsx";
import type { Texture } from "@/lib/textures";

interface Props {
  textures: Texture[];
  selected: Texture;
  onSelect: (t: Texture) => void;
}

function TextureSwatch({ texture }: { texture: Texture }) {
  const { color, color2, pattern } = texture;

  if (pattern === "planks") return (
    <svg width="100%" height="100%" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="60" fill={color} />
      <line x1="0" y1="20" x2="60" y2="20" stroke={color2} strokeWidth="1.5" />
      <line x1="0" y1="40" x2="60" y2="40" stroke={color2} strokeWidth="1.5" />
      <line x1="30" y1="0"  x2="30"  y2="20" stroke={color2} strokeWidth="0.8" opacity="0.6" />
      <line x1="15" y1="20" x2="15"  y2="40" stroke={color2} strokeWidth="0.8" opacity="0.6" />
      <line x1="45" y1="40" x2="45"  y2="60" stroke={color2} strokeWidth="0.8" opacity="0.6" />
    </svg>
  );

  if (pattern === "grid") return (
    <svg width="100%" height="100%" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="60" fill={color} />
      <line x1="0" y1="20" x2="60" y2="20" stroke={color2} strokeWidth="2" />
      <line x1="0" y1="40" x2="60" y2="40" stroke={color2} strokeWidth="2" />
      <line x1="20" y1="0"  x2="20" y2="60" stroke={color2} strokeWidth="2" />
      <line x1="40" y1="0"  x2="40" y2="60" stroke={color2} strokeWidth="2" />
    </svg>
  );

  if (pattern === "herringbone") return (
    <svg width="100%" height="100%" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="60" fill={color} />
      <line x1="0"  y1="30" x2="30" y2="0"  stroke={color2} strokeWidth="1.5" />
      <line x1="30" y1="60" x2="60" y2="30" stroke={color2} strokeWidth="1.5" />
      <line x1="0"  y1="0"  x2="30" y2="30" stroke={color2} strokeWidth="1.5" opacity="0.5" />
      <line x1="30" y1="30" x2="60" y2="60" stroke={color2} strokeWidth="1.5" opacity="0.5" />
    </svg>
  );

  return (
    <svg width="100%" height="100%" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="60" fill={color} />
      <circle cx="20" cy="20" r="4" fill={color2} opacity="0.2" />
      <circle cx="45" cy="40" r="3" fill={color2} opacity="0.15" />
      <circle cx="30" cy="55" r="5" fill={color2} opacity="0.1" />
    </svg>
  );
}

export default function TexturePicker({ textures, selected, onSelect }: Props) {
  return (
    <>
      {/* Móvil: scroll horizontal */}
      <div className="md:hidden flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-3 px-3">
        {textures.map((t) => (
          <button
            key={t.id}
            title={t.name}
            onClick={() => onSelect(t)}
            className={clsx(
              "shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all flex flex-col",
              selected.id === t.id
                ? "border-brand-500 scale-105 shadow-lg shadow-brand-500/20"
                : "border-transparent hover:border-gray-600"
            )}
          >
            <div className="flex-1"><TextureSwatch texture={t} /></div>
          </button>
        ))}
      </div>

      {/* Desktop: grid 3 columnas */}
      <div className="hidden md:grid grid-cols-3 gap-2">
        {textures.map((t) => (
          <button
            key={t.id}
            title={t.name}
            onClick={() => onSelect(t)}
            className={clsx(
              "rounded-xl overflow-hidden border-2 transition-all aspect-square flex flex-col",
              selected.id === t.id
                ? "border-brand-500 scale-105 shadow-lg shadow-brand-500/20"
                : "border-transparent hover:border-gray-600"
            )}
          >
            <div className="flex-1 w-full"><TextureSwatch texture={t} /></div>
            <div
              className="text-center py-0.5 text-[9px] font-medium truncate px-1"
              style={{ backgroundColor: t.color + "33", color: selected.id === t.id ? "#fff" : "#ccc" }}
            >
              {t.name}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
