import { FACE_INFO } from "@/lib/cube/faces";
import type { Face } from "@/lib/cube/model";

export const GUIDE_FRACTION = 0.8;

/** 3×3 guide drawn over the camera or photo, with markers for the expected centre and top colours. */
export function GridOverlay({ face, up }: { face: Face; up: Face }) {
  const pct = `${GUIDE_FRACTION * 100}%`;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div
        className="relative rounded-md"
        style={{ width: pct, height: pct, boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)", outline: "2px solid rgba(255,255,255,0.9)" }}
      >
        {[1, 2].map((k) => (
          <div key={`v${k}`} className="absolute top-0 bottom-0 w-px bg-white/80" style={{ left: `${(k * 100) / 3}%` }} />
        ))}
        {[1, 2].map((k) => (
          <div key={`h${k}`} className="absolute left-0 right-0 h-px bg-white/80" style={{ top: `${(k * 100) / 3}%` }} />
        ))}
        {/* expected centre colour */}
        <div
          className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 shadow"
          style={{ background: FACE_INFO[face].hex }}
        />
        {/* colour that should be at the top */}
        <div className="absolute -top-7 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-0.5 text-xs text-white">
          <span className="inline-block h-3 w-3 rounded-full border border-white/70" style={{ background: FACE_INFO[up].hex }} />
          {FACE_INFO[up].color} on top
        </div>
      </div>
    </div>
  );
}
