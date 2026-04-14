"use client";

import { useRef, useState } from "react";
import { clsx } from "clsx";

interface Props {
  onImage: (file: File) => void;
  isLoading: boolean;
}

export default function ImageUpload({ onImage, isLoading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    onImage(file);
  };

  return (
    <div
      className={clsx(
        "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
        dragging ? "border-brand-500 bg-brand-500/10" : "border-gray-700 hover:border-gray-500",
        isLoading && "opacity-50 pointer-events-none"
      )}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {isLoading ? (
        <p className="text-sm text-gray-400 animate-pulse">Analizando imagen...</p>
      ) : (
        <>
          <p className="text-2xl mb-2">📷</p>
          <p className="text-sm text-gray-300">Arrastra o haz click</p>
          <p className="text-xs text-gray-500 mt-1">JPEG, PNG, WebP — max 20 MB</p>
        </>
      )}
    </div>
  );
}
