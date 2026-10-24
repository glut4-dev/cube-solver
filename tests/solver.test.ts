import { describe, expect, it } from "vitest";
import Cube from "cubejs";
import { SOLVED, applyMoves, isSolved, randomScramble, splitAlg } from "@/lib/cube/model";
import { solveBeginner } from "@/lib/solver/beginner";

describe("beginner solver", () => {
  it("solves the solved cube", () => {
    const stages = solveBeginner(SOLVED);
    expect(isSolved(applyMoves(SOLVED, stages.flatMap((s) => s.moves)))).toBe(true);
  });

  it("solves 500 random scrambles", () => {
    let total = 0;
    let max = 0;
    const t0 = Date.now();
    let worst = 0;
    for (let i = 0; i < 500; i++) {
      const state = applyMoves(SOLVED, randomScramble());
      const t = Date.now();
      const moves = solveBeginner(state).flatMap((s) => s.moves);
      worst = Math.max(worst, Date.now() - t);
      expect(isSolved(applyMoves(state, moves))).toBe(true);
      total += moves.length;
      max = Math.max(max, moves.length);
    }
    console.log(`beginner: avg ${(total / 500).toFixed(1)} moves, max ${max}, avg ${(Date.now() - t0) / 500}ms, worst ${worst}ms`);
  });
});

describe("kociemba (cubejs)", () => {
  it("solves random scrambles from our facelet strings", () => {
    Cube.initSolver();
    for (let i = 0; i < 30; i++) {
      const state = applyMoves(SOLVED, randomScramble());
      const sol = Cube.fromString(state).solve();
      expect(isSolved(applyMoves(state, splitAlg(sol)))).toBe(true);
    }
  });
});
