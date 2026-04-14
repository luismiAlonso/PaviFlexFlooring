import { useState } from "react";
import { segmentFloorClient } from "@/lib/segformer-client";
import type { SegmentationResult } from "@/types";

export function useSegmentation() {
  const [result, setResult] = useState<SegmentationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const segmentImage = async (file: File) => {
    setIsLoading(true);
    setError(null);

    if (photoUrl) URL.revokeObjectURL(photoUrl);
    const newPhotoUrl = URL.createObjectURL(file);
    setPhotoUrl(newPhotoUrl);

    try {
      const data = await segmentFloorClient(file);
      setResult({ ...data, photoUrl: newPhotoUrl });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al procesar la imagen";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return { segmentImage, result, photoUrl, isLoading, error };
}
