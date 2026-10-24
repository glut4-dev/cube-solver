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
import { Burst } from "@/components/pop/Burst";

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
      <header className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={reset} className="flex items-center gap-2" aria-label="Cube Solver, back to start">
          <span className="grid -rotate-6 grid-cols-3 gap-[2px] rounded-[5px] border-2 border-black bg-black p-[2px] shadow-[3px_3px_0_var(--pink)]" aria-hidden>
            {FACES.concat(["F", "U", "R"]).map((f, i) => (
              <span key={i} className="h-[8px] w-[8px] rounded-[1px]" style={{ background: FACE_INFO[f].hex }} />
            ))}
          </span>
          <span className="pop-heading !text-[2rem]">Cube Solver</span>
        </button>
        {step !== "start" && (
          <ol className="flex gap-1.5 text-xs font-bold">
            {STEPS.map((s, i) => (
              <li
                key={s.id}
                aria-current={i === current ? "step" : undefined}
                className={`chip px-2 py-0.5 ${i === current ? "!bg-[var(--pink)] !text-white" : i < current ? "!bg-[var(--lime)]" : "opacity-60"}`}
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
  const tips = [
    { icon: "📷", text: "Good, even light. Daylight is best — no glare!", bg: "var(--cyan)", rot: "-rotate-1" },
    { icon: "🎯", text: "Fit the cube exactly inside the grid on screen.", bg: "var(--lime)", rot: "rotate-1" },
    { icon: "🧭", text: "Follow the hints for which colour goes on top.", bg: "var(--orange)", rot: "-rotate-1" },
  ];
  return (
    <div className="flex flex-col gap-6">
      <div className="panel relative overflow-visible p-5 pr-28">
        <h1 className="pop-heading mb-2 !text-[2.6rem]">Solve your Rubik&apos;s cube!</h1>
        <p className="font-medium">Snap the 6 sides. The app reads the colours, shows your cube in 3D, then guides you move by move.</p>
        <Burst size={124} className="!absolute -right-4 -top-8" rotate={12}>
          Solve
          <br />
          it!
        </Burst>
      </div>
      <ul className="grid gap-3">
        {tips.map((t) => (
          <li key={t.icon} className={`flex items-center gap-3 rounded-xl border-[3px] border-black p-3 font-semibold text-black shadow-[4px_4px_0_#111] ${t.rot}`} style={{ background: t.bg }}>
            <span className="text-2xl" aria-hidden>{t.icon}</span>
            {t.text}
          </li>
        ))}
      </ul>
      <button className="btn-primary py-4 !text-2xl" onClick={startScan}>
        Start scanning!
      </button>
      <button className="btn-ghost" onClick={loadDemo}>
        Or try it with a random cube
      </button>
      <p className="text-center text-xs text-muted">Everything runs in your browser; photos are never uploaded.</p>
    </div>
  );
}
