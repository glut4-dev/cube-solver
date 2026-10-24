import type { SolveStage } from "./beginner";
import type { SolveMethod, WorkerRequest, WorkerResponse } from "./types";

export type { SolveStage } from "./beginner";
export type { SolveMethod } from "./types";

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, (r: WorkerResponse) => void>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./solver.worker.ts", import.meta.url));
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const cb = pending.get(e.data.id);
      pending.delete(e.data.id);
      cb?.(e.data);
    };
    worker.onerror = (e) => {
      // fail every waiting request and start a fresh worker next time
      for (const [id, cb] of pending) cb({ id, ok: false, error: e.message || "The solver stopped unexpectedly." });
      pending.clear();
      worker?.terminate();
      worker = null;
    };
  }
  return worker;
}

type RequestBody = WorkerRequest extends infer R ? (R extends { id: number } ? Omit<R, "id"> : never) : never;

function call(req: RequestBody): Promise<WorkerResponse> {
  return new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    getWorker().postMessage({ ...req, id } as WorkerRequest);
  });
}

/** Builds the shortest-solver tables in the background (takes a few seconds). */
export function warmupSolver(): void {
  void call({ type: "warmup" });
}

export async function solveCube(facelets: string, method: SolveMethod): Promise<SolveStage[]> {
  const r = await call({ type: "solve", method, facelets });
  if (!r.ok) throw new Error(r.error);
  if (!("stages" in r)) throw new Error("Unexpected solver reply");
  return r.stages;
}
