import { describe, expect, it } from "vitest";
import { FACES, Face, SOLVED, applyMoves, randomScramble } from "@/lib/cube/model";
import { classifyStickers, hungarian } from "@/lib/vision/classify";
import { analyzeFace } from "@/lib/vision/quality";
import { RGB } from "@/lib/vision/color";

const PALETTE: Record<Face, RGB> = {
  U: [230, 230, 225],
  R: [185, 20, 35],
  F: [20, 155, 75],
  D: [235, 215, 40],
  L: [250, 110, 25],
  B: [20, 75, 175],
};

function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

function synthSamples(state: string, rand: () => number): Record<Face, RGB[]> {
  const out = {} as Record<Face, RGB[]>;
  FACES.forEach((f, fi) => {
    // each photo gets its own lighting: brightness and a warm/cool tint
    const gain = 0.75 + rand() * 0.35;
    const warm = (rand() - 0.5) * 20;
    out[f] = Array.from({ length: 9 }, (_, k) => {
      const base = PALETTE[state[fi * 9 + k] as Face];
      return [0, 1, 2].map((c) => {
        const tint = c === 0 ? warm : c === 2 ? -warm : 0;
        return Math.max(0, Math.min(255, base[c] * gain + tint + (rand() - 0.5) * 16));
      }) as RGB;
    });
  });
  return out;
}

function synthImage(colors: RGB[], blur = 0) {
  const w = 300;
  const data = new Uint8ClampedArray(w * w * 4);
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const c = Math.floor(x / 100);
      const r = Math.floor(y / 100);
      const border = x % 100 < 6 || x % 100 > 94 || y % 100 < 6 || y % 100 > 94;
      const col = border ? [15, 15, 15] : colors[r * 3 + c];
      const i = (y * w + x) * 4;
      data[i] = col[0];
      data[i + 1] = col[1];
      data[i + 2] = col[2];
      data[i + 3] = 255;
    }
  if (!blur) return { data, width: w, height: w };
  // box blur
  let src = data;
  for (let pass = 0; pass < blur; pass++) {
    const dst = new Uint8ClampedArray(src.length);
    for (let y = 0; y < w; y++)
      for (let x = 0; x < w; x++)
        for (let ch = 0; ch < 4; ch++) {
          let s = 0, n = 0;
          for (let dy = -3; dy <= 3; dy++)
            for (let dx = -3; dx <= 3; dx++) {
              const xx = x + dx, yy = y + dy;
              if (xx < 0 || yy < 0 || xx >= w || yy >= w) continue;
              s += src[(yy * w + xx) * 4 + ch];
              n++;
            }
          dst[(y * w + x) * 4 + ch] = s / n;
        }
    src = dst;
  }
  return { data: src, width: w, height: w };
}

describe("hungarian", () => {
  it("finds the optimal assignment", () => {
    expect(hungarian([[4, 1, 3], [2, 0, 5], [3, 2, 2]])).toEqual([1, 0, 2]);
  });
});

describe("sticker classification", () => {
  it("classifies noisy, unevenly lit scrambles correctly", () => {
    const rand = rng(42);
    let wrong = 0;
    for (let t = 0; t < 200; t++) {
      const state = applyMoves(SOLVED, randomScramble(25, rand));
      const res = classifyStickers(synthSamples(state, rand));
      if (res.facelets !== state) wrong++;
      expect(res.duplicateCenters).toEqual([]);
    }
    expect(wrong).toBeLessThanOrEqual(2);
  });
});

describe("photo quality", () => {
  const colors = Array.from({ length: 9 }, (_, i) => PALETTE[FACES[i % 6]]);
  it("accepts a clean, sharp face", () => {
    const a = analyzeFace(synthImage(colors));
    expect(a.issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(a.samples[4]).toEqual(colors[4]);
  });
  it("flags a blurry face", () => {
    const sharp = analyzeFace(synthImage(colors)).sharpness;
    const blurry = analyzeFace(synthImage(colors, 3));
    expect(blurry.sharpness).toBeLessThan(sharp);
    expect(blurry.issues.some((i) => /blurry/.test(i.message))).toBe(true);
  });
  it("flags a dark face", () => {
    const dark = colors.map((c) => c.map((v) => v * 0.15) as RGB);
    expect(analyzeFace(synthImage(dark)).issues.some((i) => /dark/.test(i.message))).toBe(true);
  });
});
