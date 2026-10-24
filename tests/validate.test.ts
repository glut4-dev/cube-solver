import { describe, expect, it } from "vitest";
import { SOLVED, applyMoves, randomScramble } from "@/lib/cube/model";
import { validateCube, rotateFaceStickers, findRotationFix } from "@/lib/cube/validate";

const swap = (s: string, a: number, b: number) => {
  const arr = s.split("");
  [arr[a], arr[b]] = [arr[b], arr[a]];
  return arr.join("");
};

describe("validator", () => {
  it("accepts solved and scrambled cubes", () => {
    expect(validateCube(SOLVED).valid).toBe(true);
    for (let i = 0; i < 20; i++) expect(validateCube(applyMoves(SOLVED, randomScramble())).valid).toBe(true);
  });

  it("rejects a flipped edge", () => {
    const r = validateCube(swap(SOLVED, 7, 19));
    expect(r.valid).toBe(false);
    expect(r.errors.join()).toMatch(/flipped/);
  });

  it("rejects a twisted corner", () => {
    const arr = SOLVED.split("");
    [arr[8], arr[9], arr[20]] = [arr[20], arr[8], arr[9]];
    const r = validateCube(arr.join(""));
    expect(r.valid).toBe(false);
    expect(r.errors.join()).toMatch(/twisted/);
  });

  it("rejects two swapped edges (parity)", () => {
    // swap UF and UR edges
    let s = swap(SOLVED, 7, 5);
    s = swap(s, 19, 10);
    const r = validateCube(s);
    expect(r.valid).toBe(false);
    expect(r.errors.join()).toMatch(/swapped/);
  });

  it("rejects wrong colour counts", () => {
    const s = "U" + SOLVED.slice(1, 9) + "U" + SOLVED.slice(10);
    expect(validateCube(s).valid).toBe(false);
  });

  it("finds a photo taken at the wrong angle", () => {
    const scrambled = applyMoves(SOLVED, randomScramble());
    const broken = rotateFaceStickers(scrambled, "U", 1);
    expect(validateCube(broken).valid).toBe(false);
    const fix = findRotationFix(broken);
    expect(fix).not.toBeNull();
    expect(fix!.state).toBe(scrambled);
  });
});
