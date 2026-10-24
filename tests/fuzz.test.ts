import { describe, expect, it } from "vitest";
import { SOLVED, applyMoves, isSolved, randomScramble } from "@/lib/cube/model";
import { solveBeginner } from "@/lib/solver/beginner";

// Long-running check, enabled with FUZZ=<count>.
const N = Number(process.env.FUZZ || 0);
describe.skipIf(!N)("beginner solver fuzz", () => {
  it(`solves ${N} random cubes`, () => {
    const failures: string[] = [];
    for (let i = 0; i < N; i++) {
      const state = applyMoves(SOLVED, randomScramble(30));
      try {
        const moves = solveBeginner(state).flatMap((s) => s.moves);
        if (!isSolved(applyMoves(state, moves))) failures.push(`not solved: ${state}`);
      } catch (e) {
        failures.push(`${(e as Error).message}: ${state}`);
      }
    }
    if (failures.length) console.log(failures.slice(0, 10).join("\n"));
    expect(failures.length).toBe(0);
  }, 3_600_000);
});
