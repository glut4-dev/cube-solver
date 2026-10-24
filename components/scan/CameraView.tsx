"use client";
import { useEffect, useRef, useState } from "react";
import { GridOverlay } from "./GridOverlay";
import type { Face } from "@/lib/cube/model";

interface Props {
  face: Face;
  up: Face;
  onCapture: (source: HTMLCanvasElement | HTMLImageElement) => void;
}

/** Live rear-camera preview with the grid, plus a photo-upload fallback. */
export function CameraView({ face, up, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Live camera isn't available in this browser. You can upload photos instead.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play();
        setReady(true);
      } catch {
        setError("No camera access. Allow the camera in your browser settings, or upload photos instead.");
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    onCapture(c);
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const img = new Image();
    img.onload = () => onCapture(img);
    img.onerror = () => setError("That file couldn't be opened as an image.");
    img.src = URL.createObjectURL(file);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative w-full aspect-square overflow-hidden rounded-xl bg-black">
        <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/80">
            {error ?? "Starting camera…"}
          </div>
        )}
        <GridOverlay face={face} up={up} />
      </div>
      <div className="flex gap-2">
        <button className="btn-secondary flex-1" onClick={() => fileRef.current?.click()}>
          Upload photo
        </button>
        <button className="btn-primary flex-1" onClick={capture} disabled={!ready}>
          Take photo
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
