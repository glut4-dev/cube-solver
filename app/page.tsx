"use client";
import { useEffect } from "react";
import { useCubeStore, Step } from "@/store/useCubeStore";
import { ScanStep } from "@/components/scan/ScanStep";
import { ReviewStep } from "@/components/review/ReviewStep";
import { VerifyStep } from "@/components/solve/VerifyStep";
import { SolveStep } from "@/components/solve/SolveStep";
import { warmupSolver } from "@/lib/solver";
import { FACE_INFO } from "@/lib/cube/faces";
import { FACES } from "@/lib/cube/model";

const STEPS: { id: Step; label: string }[] = [
  { id: "scan", label: "Scan" },
  { id: "review", label: "Check" },
  { id: "verify", label: "3D" },
  { id: "solve", label: "Solve" },
];

export default function Home() {
  const step = useCubeStore((s) => s.step);
  const reset = useCubeStore((s) => s.reset);

  // Build the solver tables in the background once the user is past scanning.
  useEffect(() => {
    if (step === "review") warmupSolver();
  }, [step]);

  const current = STEPS.findIndex((s) => s.id === step);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-5 px-4 py-5">
      <header className="flex items-center justify-between">
        <button onClick={reset} className="flex items-center gap-2 text-lg font-bold">
          <span className="grid grid-cols-3 gap-[2px] rounded-[4px] bg-neutral-900 p-[2px]" aria-hidden>
            {FACES.concat(["F", "U", "R"]).map((f, i) => (
              <span key={i} className="h-[6px] w-[6px] rounded-[1px]" style={{ background: FACE_INFO[f].hex }} />
            ))}
          </span>
          Cube Solver
        </button>
        {step !== "start" && (
          <ol className="flex gap-1 text-xs">
            {STEPS.map((s, i) => (
              <li
                key={s.id}
                className={`rounded-full px-2 py-0.5 ${i === current ? "bg-[var(--accent)] text-white" : i < current ? "bg-[var(--chip)]" : "text-muted"}`}
              >
                {s.label}
              </li>
            ))}
          </ol>
        )}
      </header>

      {step === "start" && <StartScreen />}
      {step === "scan" && <ScanStep />}
      {step === "review" && <ReviewStep />}
      {step === "verify" && <VerifyStep />}
      {step === "solve" && <SolveStep />}
    </main>
  );
}

function StartScreen() {
  const { startScan, loadDemo } = useCubeStore();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="mb-2 text-2xl font-bold">Solve your Rubik&apos;s cube</h1>
        <p className="text-muted">Take a photo of each of the 6 sides. The app reads the colours, shows your cube in 3D, and then guides you move by move.</p>
      </div>
      <ul className="flex flex-col gap-2 text-sm">
        <li>📷 Use good, even light — daylight is best, avoid glare.</li>
        <li>🎯 Fit the cube exactly inside the grid on screen.</li>
        <li>🧭 Follow the hints on which colour goes on top; the app checks every photo.</li>
      </ul>
      <button className="btn-primary py-3 text-base" onClick={startScan}>
        Start scanning
      </button>
      <button className="btn-ghost" onClick={loadDemo}>
        Or try it with a random cube
      </button>
      <p className="text-xs text-muted">Everything runs in your browser; photos are never uploaded.</p>
    </div>
  );
}
