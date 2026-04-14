"use client";

/**
 * FloorVisualizer — renders the user's room photo with the floor texture
 * projected onto the detected floor region using Three.js / WebGL.
 *
 * Architecture:
 *   - The room photo is displayed as a full background <img>
 *   - An <canvas> overlay sits on top using CSS `mix-blend-mode: multiply`
 *   - Three.js renders the texture warped through the homography matrix
 *     so it aligns perfectly with the physical floor in perspective
 */

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

    // Cleanup previous scene
    cleanupRef.current?.();

    const cleanup = buildFloorScene({
      container: containerRef.current,
      segmentation: segmentationResult,
      textureUrl: texture.url,
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
