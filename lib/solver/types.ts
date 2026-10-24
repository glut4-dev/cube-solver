import type { SolveStage } from "./beginner";

export type SolveMethod = "shortest" | "beginner";

export type WorkerRequest =
  | { id: number; type: "warmup" }
  | { id: number; type: "solve"; method: SolveMethod; facelets: string };

export type WorkerResponse =
  | { id: number; ok: true; stages: SolveStage[] }
  | { id: number; ok: true; ready: true }
  | { id: number; ok: false; error: string };
