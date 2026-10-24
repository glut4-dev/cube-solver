"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CENTER, Face, Facelets, applyMove, invertMove, parseMove } from "@/lib/cube/model";
import { FACE_INFO } from "@/lib/cube/faces";
import type { SolveStage } from "@/lib/solver";
import type { CubeAnimation } from "@/components/cube3d/Cube3D";

const Cube3D = dynamic(() => import("@/components/cube3d/Cube3D"), {
  ssr: false,
  loading: () => <div className="flex aspect-square w-full items-center justify-center text-sm text-muted">Loading 3D view…</div>,
});

const SIDE: Record<string, string> = { U: "top", D: "bottom", R: "right", L: "left", F: "front", B: "back" };

/** Plain-language instruction for one move. */
export function describeMove(move: string, state: Facelets): string {
  const m = parseMove(move);
  if (m.base === "z" && m.turns === 2) return "Turn the whole cube upside down, keeping the front facing you.";
  if (m.base === "x" || m.base === "y" || m.base === "z") return "Turn the whole cube.";
  const color = FACE_INFO[state[CENTER[m.base as Face]] as Face].color;
  const side = `the ${SIDE[m.base]} side (${color} centre)`;
  if (m.turns === 2) return `Turn ${side} half a turn (180°).`;
  return `Turn ${side} a quarter turn ${m.turns === 1 ? "clockwise" : "counter-clockwise"}, as seen when looking straight at that side.`;
}

interface Props {
  start: Facelets;
  stages: SolveStage[];
}

export function SolvePlayer({ start, stages }: Props) {
  const steps = useMemo(() => stages.flatMap((s, si) => s.moves.map((move) => ({ move, stage: si }))), [stages]);
  const states = useMemo(() => {
    const out = [start];
    for (const s of steps) out.push(applyMove(out[out.length - 1], s.move));
    return out;
  }, [start, steps]);
  const stageStart = useMemo(() => {
    const out: number[] = [];
    let n = 0;
    for (const s of stages) {
      out.push(n);
      n += s.moves.length;
    }
    return out;
  }, [stages]);

  const [index, setIndex] = useState(0);
  const [anim, setAnim] = useState<(CubeAnimation & { dir: 1 | -1 }) | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(0.45);
  const animId = useRef(0);

  const total = steps.length;
  const done = index >= total;
  const currentStage = done ? stages.length - 1 : steps[index]?.stage ?? 0;

  const next = useCallback(() => {
    if (anim || index >= total) return;
    setAnim({ move: steps[index].move, id: ++animId.current, dir: 1 });
  }, [anim, index, total, steps]);

  const prev = useCallback(() => {
    if (anim || index <= 0) return;
    setPlaying(false);
    setAnim({ move: invertMove(steps[index - 1].move), id: ++animId.current, dir: -1 });
  }, [anim, index, steps]);

  const animRef = useRef(anim);
  animRef.current = anim;
  const onAnimationEnd = useCallback(() => {
    const a = animRef.current;
    if (!a) return;
    animRef.current = null;
    setIndex((i) => i + a.dir);
    setAnim(null);
  }, []);

  // autoplay
  useEffect(() => {
    if (!playing || anim) return;
    if (index >= total) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(next, 120);
    return () => clearTimeout(t);
  }, [playing, anim, index, total, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const jumpTo = (i: number) => {
    setPlaying(false);
    setAnim(null);
    setIndex(i);
  };

  const stage = stages[currentStage];
  const stageMoves = steps.slice(stageStart[currentStage], stageStart[currentStage] + stage.moves.length);
  const nextMove = done ? null : steps[index].move;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Cube3D facelets={states[index]} animation={anim} onAnimationEnd={onAnimationEnd} speed={speed} />
        <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/55 px-2 py-1 text-xs text-white">
          Move {Math.min(index + (anim?.dir === 1 ? 1 : 0), total)} / {total}
        </div>
      </div>

      {/* current move */}
      <div className="rounded-xl border border-[var(--border)] p-4">
        {done ? (
          <div className="text-center">
            <p className="text-2xl font-bold">Solved! 🎉</p>
            <p className="text-sm text-muted">Your cube should now be solved too.</p>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="min-w-16 rounded-lg bg-[var(--accent)] px-3 py-2 text-center font-mono text-3xl font-bold text-white">{nextMove}</div>
            <p className="text-sm">{describeMove(nextMove!, states[index])}</p>
          </div>
        )}
      </div>

      {/* controls */}
      <div className="grid grid-cols-4 gap-2">
        <button className="btn-secondary" onClick={() => jumpTo(0)} disabled={index === 0 || !!anim} aria-label="Restart">
          ⏮
        </button>
        <button className="btn-secondary" onClick={prev} disabled={index === 0 || !!anim} aria-label="Previous move">
          ◀ Back
        </button>
        <button className="btn-primary" onClick={next} disabled={done || !!anim} aria-label="Next move">
          Next ▶
        </button>
        <button className="btn-secondary" onClick={() => setPlaying((p) => !p)} disabled={done} aria-label={playing ? "Pause" : "Play"}>
          {playing ? "⏸" : "▶▶"}
        </button>
      </div>
      <label className="flex items-center gap-3 text-sm text-muted">
        Speed
        <input
          type="range"
          min={0.15}
          max={1.2}
          step={0.05}
          value={1.35 - speed}
          onChange={(e) => setSpeed(1.35 - parseFloat(e.target.value))}
          className="flex-1 accent-[var(--accent)]"
        />
      </label>

      {/* stage */}
      <div className="rounded-xl border border-[var(--border)] p-4">
        <p className="text-xs uppercase tracking-wide text-muted">
          Stage {currentStage + 1} of {stages.length}
        </p>
        <h3 className="text-lg font-semibold">{stage.title}</h3>
        <p className="mb-3 text-sm text-muted">{stage.description}</p>
        {stage.moves.length === 0 ? (
          <p className="text-sm">Already done — nothing to do here.</p>
        ) : (
          <div className="flex flex-wrap gap-1 font-mono text-sm">
            {stageMoves.map((s, k) => {
              const i = stageStart[currentStage] + k;
              return (
                <button
                  key={i}
                  onClick={() => jumpTo(i)}
                  className={`rounded px-1.5 py-0.5 ${i === index ? "bg-[var(--accent)] text-white" : i < index ? "text-muted line-through" : "bg-[var(--chip)]"}`}
                >
                  {s.move}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {stages.length > 1 && (
        <ol className="flex flex-col gap-1 text-sm">
          {stages.map((s, si) => {
            const from = stageStart[si];
            const to = from + s.moves.length;
            const status = index >= to ? "done" : si === currentStage ? "now" : "todo";
            return (
              <li key={s.id}>
                <button onClick={() => jumpTo(from)} className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-[var(--chip)]">
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${status === "done" ? "bg-green-600 text-white" : status === "now" ? "bg-[var(--accent)] text-white" : "bg-[var(--chip)]"}`}>
                    {status === "done" ? "✓" : si + 1}
                  </span>
                  <span className={status === "now" ? "font-semibold" : ""}>{s.title}</span>
                  <span className="ml-auto text-xs text-muted">{s.moves.length} moves</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
