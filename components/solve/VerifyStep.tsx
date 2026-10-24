"use client";
import dynamic from "next/dynamic";
import { useCubeStore } from "@/store/useCubeStore";

const Cube3D = dynamic(() => import("@/components/cube3d/Cube3D"), {
  ssr: false,
  loading: () => <div className="flex aspect-square w-full items-center justify-center text-sm text-muted">Loading 3D view…</div>,
});

export function VerifyStep() {
  const { facelets, setStep } = useCubeStore();
  if (!facelets) return null;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Does this match your cube?</h2>
        <p className="text-sm text-muted">
          Drag to turn the 3D cube around and compare it with your real cube. Hold yours with white on top and green facing you.
        </p>
      </div>
      <div className="rounded-xl bg-[var(--chip)]">
        <Cube3D facelets={facelets} />
      </div>
      <div className="flex gap-2">
        <button className="btn-secondary flex-1" onClick={() => setStep("review")}>
          Back to edit
        </button>
        <button className="btn-primary flex-1" onClick={() => setStep("solve")}>
          Looks right — solve it
        </button>
      </div>
    </div>
  );
}
