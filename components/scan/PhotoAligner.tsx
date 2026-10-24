"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { GridOverlay, GUIDE_FRACTION } from "./GridOverlay";
import type { Face } from "@/lib/cube/model";

export const CROP_SIZE = 300;

interface Props {
  source: HTMLCanvasElement | HTMLImageElement;
  face: Face;
  up: Face;
  onConfirm: (crop: ImageData, dataUrl: string) => void;
  onCancel: () => void;
}

/**
 * Lets the user line the cube up with the 3×3 grid by dragging and zooming,
 * then crops the area inside the grid to a 300×300 image.
 */
export function PhotoAligner({ source, face, up, onConfirm, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(320);
  const srcW = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const srcH = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  const fitScale = Math.max(size / srcW, size / srcH);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // image centre offset from box centre, css px
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize(el.clientWidth));
    ro.observe(el);
    setSize(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const scale = fitScale * zoom;

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = size * dpr;
    c.height = size * dpr;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, size, size);
    const w = srcW * scale;
    const h = srcH * scale;
    ctx.drawImage(source, size / 2 - w / 2 + offset.x, size / 2 - h / 2 + offset.y, w, h);
  }, [source, size, scale, offset, srcW, srcH]);

  const confirm = useCallback(() => {
    const guide = size * GUIDE_FRACTION;
    const left = size / 2 - guide / 2;
    const top = size / 2 - guide / 2;
    const imgLeft = size / 2 - (srcW * scale) / 2 + offset.x;
    const imgTop = size / 2 - (srcH * scale) / 2 + offset.y;
    const sx = (left - imgLeft) / scale;
    const sy = (top - imgTop) / scale;
    const sSize = guide / scale;
    const out = document.createElement("canvas");
    out.width = CROP_SIZE;
    out.height = CROP_SIZE;
    const ctx = out.getContext("2d", { willReadFrequently: true })!;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, CROP_SIZE, CROP_SIZE);
    ctx.drawImage(source, sx, sy, sSize, sSize, 0, 0, CROP_SIZE, CROP_SIZE);
    onConfirm(ctx.getImageData(0, 0, CROP_SIZE, CROP_SIZE), out.toDataURL("image/jpeg", 0.85));
  }, [size, scale, offset, srcW, srcH, source, onConfirm]);

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={boxRef}
        className="relative w-full aspect-square overflow-hidden rounded-xl bg-black touch-none select-none cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setOffset({ x: drag.current.ox + e.clientX - drag.current.x, y: drag.current.oy + e.clientY - drag.current.y });
        }}
        onPointerUp={() => (drag.current = null)}
        onWheel={(e) => setZoom((z) => Math.min(5, Math.max(0.5, z * (e.deltaY < 0 ? 1.06 : 1 / 1.06))))}
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        <GridOverlay face={face} up={up} />
      </div>
      <label className="flex items-center gap-3 text-sm text-muted">
        Zoom
        <input
          type="range"
          min={0.5}
          max={5}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
          className="flex-1 accent-[var(--accent)]"
        />
      </label>
      <p className="text-sm text-muted">Drag and zoom so each sticker sits inside one square of the grid.</p>
      <div className="flex gap-2">
        <button className="btn-secondary flex-1" onClick={onCancel}>
          Back
        </button>
        <button className="btn-primary flex-1" onClick={confirm}>
          Check photo
        </button>
      </div>
    </div>
  );
}
