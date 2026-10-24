"use client";
import { useMemo, useState } from "react";
import { FACES, Face } from "@/lib/cube/model";
import { FACE_INFO } from "@/lib/cube/faces";
import { validateCube } from "@/lib/cube/validate";
import { LOW_CONFIDENCE } from "@/lib/vision/classify";
import { useCubeStore } from "@/store/useCubeStore";

/** Position of each face in the unfolded cube (column, row). */
const NET: Record<Face, [number, number]> = { U: [1, 0], L: [0, 1], F: [1, 1], R: [2, 1], B: [3, 1], D: [1, 2] };

export function ReviewStep() {
  const { facelets, confidence, photos, duplicateCenters, notice, setSticker, retake, setStep, edited } = useCubeStore();
  const [picking, setPicking] = useState<number | null>(null);

  const result = useMemo(() => (facelets ? validateCube(facelets) : null), [facelets]);
  if (!facelets || !result) return null;

  const lowConf = (i: number) => !!confidence && confidence[i] < LOW_CONFIDENCE && !edited.has(i);
  const bad = new Set(result.badStickers);
  const hasPhotos = Object.keys(photos).length === 6;

  // Sides whose photo should be retaken: several uncertain stickers, or part of a duplicate centre.
  const retakeFaces = FACES.filter((f, fi) => {
    const uncertain = Array.from({ length: 9 }, (_, k) => fi * 9 + k).filter(lowConf).length;
    return uncertain >= 2 || duplicateCenters.some((pair) => pair.includes(f));
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Check the colours</h2>
        <p className="text-sm text-muted">
          This is your cube unfolded. Tap a sticker to change its colour. Stickers with a dashed outline were hard to read.
        </p>
      </div>

      {notice && <div className="rounded-lg bg-warn p-3 text-sm">{notice}</div>}

      {hasPhotos && retakeFaces.length > 0 && (
        <div className="rounded-lg bg-warn p-3 text-sm">
          <p className="mb-2 font-medium">
            {duplicateCenters.length
              ? "Two photos show centres of the same colour — one side may have been photographed twice."
              : "Some colours were hard to read. A new photo of these sides would help:"}
          </p>
          <div className="flex flex-wrap gap-2">
            {retakeFaces.map((f) => (
              <button key={f} className="btn-secondary !py-1 text-sm" onClick={() => retake(f)}>
                Retake {FACE_INFO[f].color}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto grid w-full max-w-md grid-cols-4 gap-1.5">
        {FACES.map((f, fi) => {
          const [col, row] = NET[f];
          return (
            <div key={f} className="grid grid-cols-3 gap-0.5 rounded-md bg-neutral-900 p-0.5" style={{ gridColumn: col + 1, gridRow: row + 1 }}>
              {Array.from({ length: 9 }, (_, k) => {
                const i = fi * 9 + k;
                const isCenter = k === 4;
                return (
                  <button
                    key={i}
                    disabled={isCenter}
                    onClick={() => setPicking(i)}
                    aria-label={`Sticker ${k + 1} of the ${FACE_INFO[f].color} side: ${FACE_INFO[facelets[i] as Face].color}`}
                    className="aspect-square rounded-[3px] transition-transform active:scale-90"
                    style={{
                      background: FACE_INFO[facelets[i] as Face].hex,
                      outline: bad.has(i) ? "3px solid #ef4444" : lowConf(i) ? "2px dashed #fff" : picking === i ? "2px solid var(--accent)" : undefined,
                      outlineOffset: -2,
                    }}
                  />
                );
              })}
            </div>
          );
        })}
        {hasPhotos && (
          <div className="col-span-2 col-start-3 row-start-3 flex flex-wrap content-start gap-1 p-1 text-xs text-muted">
            Retake:
            {FACES.map((f) => (
              <button key={f} onClick={() => retake(f)} className="underline underline-offset-2">
                {FACE_INFO[f].color}
              </button>
            ))}
          </div>
        )}
      </div>

      {picking !== null && (
        <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] p-3">
          <p className="text-sm">Choose the colour of this sticker:</p>
          <div className="flex justify-between gap-2">
            {FACES.map((f) => (
              <button
                key={f}
                aria-label={FACE_INFO[f].color}
                className="h-10 flex-1 rounded-md border border-black/20"
                style={{ background: FACE_INFO[f].hex }}
                onClick={() => {
                  setSticker(picking, f);
                  setPicking(null);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {result.valid ? (
        <div className="rounded-lg bg-ok p-3 text-sm">This is a valid cube.</div>
      ) : (
        <div className="rounded-lg bg-err p-3 text-sm">
          <p className="mb-1 font-medium">This cube can&apos;t be solved yet:</p>
          <ul className="list-inside list-disc">
            {result.errors.map((e, k) => (
              <li key={k}>{e}</li>
            ))}
          </ul>
          <p className="mt-1">Fix the stickers marked in red or dashed, or retake a photo.</p>
        </div>
      )}

      <div className="flex gap-2">
        <button className="btn-secondary flex-1" onClick={() => setStep("start")}>
          Start over
        </button>
        <button className="btn-primary flex-1" disabled={!result.valid} onClick={() => setStep("verify")}>
          View in 3D
        </button>
      </div>
    </div>
  );
}
