import { useState } from "react";
import type { SegmentationResult } from "@/types";
import { log, clearLog } from "@/lib/logger";

// Mensajes de error limpios para el usuario
function userFriendlyError(source: string): string {
  if (source.includes("no_token"))   return "Configuración incompleta (sin API key)";
  if (source.includes("no_floor"))   return "No se detectó suelo en la imagen. Prueba con otra foto";
  if (source.includes("max_retries")) return "El modelo IA está arrancando, espera 30s e inténtalo de nuevo";
  if (source.includes("hf_410"))     return "Error de conexión con el modelo IA (410)";
  if (source.includes("hf_401"))     return "Token de IA inválido, revisa la configuración";
  if (source.includes("hf_"))        return "Error en el servicio IA, inténtalo de nuevo";
  if (source.includes("fetch_error")) return "Sin conexión al servicio IA";
  return "Error procesando la imagen";
}

export function useSegmentation() {
  const [result, setResult] = useState<SegmentationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const segmentImage = async (file: File) => {
    // Resetear log en cada nueva foto
    clearLog();
    log.info("Nueva foto recibida", { name: file.name, size: file.size, type: file.type });

    setIsLoading(true);
    setError(null);

    if (photoUrl) URL.revokeObjectURL(photoUrl);
    const newPhotoUrl = URL.createObjectURL(file);
    setPhotoUrl(newPhotoUrl);

    try {
      log.info("Enviando al servidor...");
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/backend/segment", {
        method: "POST",
        body: formData,
      });

      log.info(`Respuesta del servidor: ${res.status}`);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        log.error("Error del servidor", err);
        throw new Error(err?.detail ?? `Error ${res.status}`);
      }

      const data = await res.json();
      log.info("Respuesta recibida", { source: data.source, corners: data.floor_corners, imageSize: data.image_size });

      if (data.source && data.source !== "segformer") {
        log.warn("Usando mock en lugar de IA real", { source: data.source });
        setError(userFriendlyError(data.source));
      } else {
        log.info("IA SegFormer OK");
      }

      setResult({ ...data, photoUrl: newPhotoUrl });

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      log.error("Error en segmentImage", msg);
      setError("No se pudo procesar la imagen. Ver /debug para detalles.");
    } finally {
      setIsLoading(false);
      log.info("Proceso completado");
    }
  };

  return { segmentImage, result, photoUrl, isLoading, error };
}
