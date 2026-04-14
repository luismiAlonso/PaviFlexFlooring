"use client";

import { useRef, useState, useCallback } from "react";
import { clsx } from "clsx";

interface Props {
  onImage: (file: File) => void;
  isLoading: boolean;
}

export default function ImageUpload({ onImage, isLoading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [dragging, setDragging] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    onImage(file);
  };

  const openCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(mediaStream);
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      }, 100);
    } catch (err) {
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      setCameraError(msg);
    }
  }, []);

  const closeCamera = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setCameraOpen(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "captura.jpg", { type: "image/jpeg" });
      closeCamera();
      onImage(file);
    }, "image/jpeg", 0.92);
  }, [closeCamera, onImage]);

  if (cameraOpen) {
    return (
      <div className="rounded-xl overflow-hidden border border-gray-700 bg-black">
        <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-video object-cover" />
        <div className="flex gap-2 p-2">
          <button
            onClick={capturePhoto}
            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
          >
            Capturar
          </button>
          <button
            onClick={closeCamera}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* En móvil: dos botones en fila. En desktop: también */}
      <div className="flex gap-2">
        {/* Botón subir archivo */}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={isLoading}
          className={clsx(
            "flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-colors border-2 border-dashed",
            dragging
              ? "border-brand-500 bg-brand-500/10 text-white"
              : "border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white",
            isLoading && "opacity-50 pointer-events-none"
          )}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
        >
          <span>🖼️</span>
          <span>Galería</span>
        </button>

        {/* Botón cámara */}
        <button
          onClick={openCamera}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white transition-colors disabled:opacity-50"
        >
          <span>📷</span>
          <span>Cámara</span>
        </button>
      </div>

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

      {cameraError && (
        <p className="text-xs text-red-400 text-center">{cameraError}</p>
      )}
    </div>
  );
}
