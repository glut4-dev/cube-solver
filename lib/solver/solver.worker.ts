/// <reference lib="webworker" />
import Cube from "cubejs";
import { solveBeginner } from "./beginner";
import { isSolved, splitAlg } from "../cube/model";
import type { WorkerRequest, WorkerResponse } from "./types";

let kociembaReady = false;
function initKociemba() {
  if (!kociembaReady) {
    Cube.initSolver();
    kociembaReady = true;
  }
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  const reply = (r: WorkerResponse) => (self as unknown as Worker).postMessage(r);
  try {
    if (req.type === "warmup") {
      initKociemba();
      reply({ id: req.id, ok: true, ready: true });
      return;
    }
    if (req.method === "beginner") {
      reply({ id: req.id, ok: true, stages: solveBeginner(req.facelets) });
    } else {
      let moves: string[] = [];
      if (!isSolved(req.facelets)) {
        initKociemba();
        moves = splitAlg(Cube.fromString(req.facelets).solve());
      }
      reply({
        id: req.id,
        ok: true,
        stages: [
          {
            id: "kociemba",
            title: "Shortest solution",
            description: `Follow these ${moves.length} moves, keeping white on top and green facing you the whole time.`,
            moves,
          },
        ],
      });
    }
  } catch (err) {
    reply({ id: req.id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
