"use client";
import { useEffect, useState } from "react";
import { useCubeStore } from "@/store/useCubeStore";
import { solveCube, SolveMethod } from "@/lib/solver";
import { SolvePlayer } from "./SolvePlayer";

const METHODS: { id: SolveMethod; title: string; text: string }[] = [
  { id: "beginner", title: "Beginner method", text: "Layer by layer in 8 stages, about 100–200 moves. Teaches you how to solve a cube." },
  { id: "shortest", title: "Shortest solution", text: "About 20 moves, computed by a computer algorithm. Fast, but hard to learn from." },
];

export function SolveStep() {
  const { facelets, method, setMethod, stages, setStages, setStep } = useCubeStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!facelets || stages) return;
    let cancelled = false;
    setBusy(true);
    setError(null);
    solveCube(facelets, method)
      .then((s) => {
        if (cancelled) return;
        setBusy(false);
        setStages(s);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setBusy(false);
        setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [facelets, method, stages, setStages]);

  if (!facelets) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Solving method">
        {METHODS.map((m) => (
          <button
            key={m.id}
            role="radio"
            aria-checked={method === m.id}
            onClick={() => setMethod(m.id)}
            className={`rounded-xl border-[3px] border-black p-3 text-left transition-transform ${method === m.id ? "-rotate-1 bg-[var(--pink)] text-white shadow-[5px_5px_0_#111]" : "bg-white text-black shadow-[3px_3px_0_#111] hover:-translate-y-0.5"}`}
          >
            <p className="font-pop text-xl leading-tight" style={method === m.id ? { textShadow: "2px 2px 0 #111" } : undefined}>{m.title}</p>
            <p className="text-xs font-medium">{m.text}</p>
          </button>
        ))}
      </div>

      {busy && (
        <div className="panel font-pop p-6 text-center text-xl">
          {method === "shortest" ? "Computing the shortest solution… (the first time takes a few seconds)" : "Working out the steps…"}
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-err p-3 text-sm">
          Couldn&apos;t solve this cube: {error}
          <button className="ml-2 underline" onClick={() => setStep("review")}>
            Check the colours again
          </button>
        </div>
      )}
      {stages && !busy && <SolvePlayer key={`${method}-${facelets}`} start={facelets} stages={stages} />}

      <button className="btn-ghost" onClick={() => setStep("verify")}>
        ← Back to 3D check
      </button>
    </div>
  );
}
