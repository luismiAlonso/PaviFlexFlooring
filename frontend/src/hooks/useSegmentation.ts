import { useState } from "react";
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
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/backend/segment", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail ?? `Error ${res.status}`);
      }

      const data = await res.json();
      setResult({ ...data, photoUrl: newPhotoUrl });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al procesar la imagen");
    } finally {
      setIsLoading(false);
    }
  };

  return { segmentImage, result, photoUrl, isLoading, error };
}
