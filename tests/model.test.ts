import { describe, expect, it } from "vitest";
import Cube from "cubejs";
import { SOLVED, applyMove, applyMoves, isSolved, invertAlg, randomScramble, simplify, FACE_MOVES } from "@/lib/cube/model";

describe("cube model", () => {
  it("every quarter turn repeated 4 times returns to start", () => {
    for (const m of ["U", "R", "F", "D", "L", "B", "x", "y", "z"]) {
      expect(applyMoves(SOLVED, [m, m, m, m])).toBe(SOLVED);
      expect(applyMove(SOLVED, m)).not.toBe(SOLVED);
    }
  });

  it("matches cubejs for random scrambles", () => {
    for (let i = 0; i < 50; i++) {
      const scr = randomScramble(25);
      const c = new Cube();
      c.move(scr.join(" "));
      expect(applyMoves(SOLVED, scr)).toBe(c.asString());
    }
  });

  it("matches cubejs for every single move", () => {
    for (const m of FACE_MOVES) {
      const c = new Cube();
      c.move(m);
      expect(applyMove(SOLVED, m)).toBe(c.asString());
    }
  });

  it("inverse undoes a scramble", () => {
    const scr = randomScramble(30);
    expect(applyMoves(applyMoves(SOLVED, scr), invertAlg(scr))).toBe(SOLVED);
  });

  it("whole-cube rotations keep the cube solved", () => {
    expect(isSolved(applyMoves(SOLVED, "x y z2"))).toBe(true);
  });

  it("simplify merges turns", () => {
    expect(simplify(["R", "R", "U", "U'", "F", "F2"])).toEqual(["R2", "F'"]);
  });
});
