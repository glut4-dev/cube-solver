"use client";
import { useState } from "react";
import { CameraView } from "./CameraView";
import { PhotoAligner } from "./PhotoAligner";
import { SCAN_STEPS, FACE_INFO } from "@/lib/cube/faces";
import { analyzeFace, FaceAnalysis, QualityIssue } from "@/lib/vision/quality";
import { nearestReference } from "@/lib/vision/color";
import { useCubeStore } from "@/store/useCubeStore";

type Phase = { kind: "camera" } | { kind: "align"; source: HTMLCanvasElement | HTMLImageElement } | { kind: "check"; image: string; analysis: FaceAnalysis };

export function ScanStep() {
  const { scanIndex, photos, retakeOnly, savePhoto, goToScan, setStep, facelets } = useCubeStore();
  const [phase, setPhase] = useState<Phase>({ kind: "camera" });
  const step = SCAN_STEPS[scanIndex];
  const info = FACE_INFO[step.face];

  const check = (crop: ImageData, image: string) => {
    const analysis = analyzeFace(crop);
    const centre = nearestReference(analysis.samples[4]);
    if (centre !== info.color) {
      analysis.issues.push({
        severity: "warning",
        message: `Expected the ${info.color} centre here, but it looks ${centre}. Make sure the ${info.color} side faces the camera.`,
      });
    }
    setPhase({ kind: "check", image, analysis });
  };

  const accept = () => {
    if (phase.kind !== "check") return;
    savePhoto(step.face, { image: phase.image, analysis: phase.analysis });
    setPhase({ kind: "camera" });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* progress */}
      <div className="grid grid-cols-6 gap-2">
        {SCAN_STEPS.map((s, i) => {
          const p = photos[s.face];
          const active = i === scanIndex;
          return (
            <button
              key={s.face}
              onClick={() => {
                if (retakeOnly) return;
                if (p || i <= Object.keys(photos).length) {
                  goToScan(i);
                  setPhase({ kind: "camera" });
                }
              }}
              className={`relative aspect-square overflow-hidden rounded-lg border-[3px] border-black bg-white transition-transform ${active ? "-translate-y-1 shadow-[3px_3px_0_var(--pink)] ring-2 ring-[var(--pink)]" : "shadow-[2px_2px_0_#111]"}`}
              aria-label={`${FACE_INFO[s.face].color} side`}
            >
              {p ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="absolute inset-0 m-auto h-3 w-3 rounded-full" style={{ background: FACE_INFO[s.face].hex }} />
              )}
            </button>
          );
        })}
      </div>

      <div>
        <h2 className="pop-heading mb-3">
          Photo {scanIndex + 1} of 6: the {info.color} side!
        </h2>
        <p className="bubble text-sm">{step.tip}</p>
      </div>

      <div className={phase.kind === "camera" ? "" : "hidden"}>
        <CameraView face={step.face} up={step.up} onCapture={(source) => setPhase({ kind: "align", source })} />
      </div>

      {phase.kind === "align" && (
        <PhotoAligner source={phase.source} face={step.face} up={step.up} onConfirm={check} onCancel={() => setPhase({ kind: "camera" })} />
      )}

      {phase.kind === "check" && (
        <QualityReport image={phase.image} analysis={phase.analysis} onRetake={() => setPhase({ kind: "camera" })} onAccept={accept} />
      )}

      {retakeOnly && facelets && (
        <button className="btn-ghost" onClick={() => setStep("review")}>
          Cancel retake
        </button>
      )}
    </div>
  );
}

function QualityReport({ image, analysis, onRetake, onAccept }: { image: string; analysis: FaceAnalysis; onRetake: () => void; onAccept: () => void }) {
  const errors = analysis.issues.filter((i) => i.severity === "error");
  const ok = analysis.issues.length === 0;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="Cropped photo" className="w-1/2 rounded-xl border-[3px] border-black shadow-[4px_4px_0_var(--shadow)]" />
        <div className="grid w-1/2 grid-cols-3 gap-1 rounded-xl border-[3px] border-black bg-neutral-900 p-1.5 shadow-[4px_4px_0_var(--shadow)]">
          {analysis.samples.map((c, i) => (
            <div
              key={i}
              className="rounded-sm"
              style={{ background: `rgb(${c.join(",")})`, outline: analysis.uniformity[i] < 0.5 ? "2px dashed #fff" : undefined }}
            />
          ))}
        </div>
      </div>
      <div className={`rounded-lg p-3 text-sm ${ok ? "bg-ok" : errors.length ? "bg-err" : "bg-warn"}`}>
        {ok ? (
          <p>
            <span className="font-pop mr-1 text-lg">Nice!</span> Sharp, well lit and lined up with the grid.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {analysis.issues.map((i: QualityIssue, k) => (
              <li key={k}>
                {i.severity === "error" ? "✗" : "!"} {i.message}
              </li>
            ))}
          </ul>
        )}
      </div>
      {errors.length > 0 && <p className="text-sm font-bold">Please take this photo again for a reliable result.</p>}
      <div className="flex gap-2">
        <button className={errors.length ? "btn-primary flex-1" : "btn-secondary flex-1"} onClick={onRetake}>
          Retake
        </button>
        <button className={errors.length ? "btn-secondary flex-1" : "btn-primary flex-1"} onClick={onAccept}>
          {errors.length ? "Use anyway" : "Use photo"}
        </button>
      </div>
    </div>
  );
}
