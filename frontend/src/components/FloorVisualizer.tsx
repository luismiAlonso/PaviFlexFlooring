"use client";

import { useEffect, useRef } from "react";
import type { SegmentationResult } from "@/types";
import type { Texture } from "@/lib/textures";
import { buildFloorScene } from "@/lib/three-scene";

interface Props {
  segmentationResult: SegmentationResult;
  texture: Texture;
}

export default function FloorVisualizer({ segmentationResult, texture }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    cleanupRef.current?.();
    const cleanup = buildFloorScene({
      container: containerRef.current,
      segmentation: segmentationResult,
      texture,
    });
    cleanupRef.current = cleanup;
    return cleanup;
  }, [segmentationResult, texture]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full max-w-4xl max-h-[80vh] rounded-xl overflow-hidden"
    />
  );
}
