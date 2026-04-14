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
        video: {
          facingMode: { ideal: "environment" }, // cámara trasera en móvil
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      setStream(mediaStream);
      setCameraOpen(true);
      // Asignar stream al video cuando el elemento esté listo
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err) {
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      console.error("Camera error:", msg);
      setCameraError(`Error: ${msg}`);
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
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full aspect-video object-cover"
        />
        <div className="flex gap-2 p-2">
          <button
            onClick={capturePhoto}
            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
          >
            Capturar foto
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
      {/* Drag & drop / click */}
      <div
        className={clsx(
          "border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors",
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
            <p className="text-2xl mb-1">🖼️</p>
            <p className="text-sm text-gray-300">Arrastra o haz click</p>
            <p className="text-xs text-gray-500 mt-1">JPEG, PNG, WebP</p>
          </>
        )}
      </div>

      {/* Botón cámara */}
      <button
        onClick={openCamera}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 border border-gray-700 hover:border-gray-500 rounded-xl py-2.5 text-sm text-gray-300 hover:text-white transition-colors disabled:opacity-50"
      >
        <span>📷</span> Usar cámara
      </button>

      {cameraError && (
        <p className="text-xs text-red-400 text-center">{cameraError}</p>
      )}
    </div>
  );
}
