import { FACES, Face, Facelets } from "../cube/model";
import { Lab, RGB, labDistance, rgbToLab } from "./color";

/** Minimum-cost assignment (Hungarian algorithm) on a square cost matrix. Returns column for each row. */
export function hungarian(cost: number[][]): number[] {
  const n = cost.length;
  const INF = 1e18;
  const u = new Array(n + 1).fill(0);
  const v = new Array(n + 1).fill(0);
  const p = new Array(n + 1).fill(0);
  const way = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(n + 1).fill(INF);
    const used = new Array(n + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = INF;
      let j1 = 0;
      for (let j = 1; j <= n; j++) {
        if (used[j]) continue;
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }
  const result = new Array(n).fill(-1);
  for (let j = 1; j <= n; j++) if (p[j]) result[p[j] - 1] = j - 1;
  return result;
}

export interface Classification {
  facelets: Facelets;
  /** 0..1 per sticker. */
  confidence: number[];
  /** Faces whose centres look the same colour (probably the same side scanned twice). */
  duplicateCenters: Face[][];
}

export const LOW_CONFIDENCE = 0.25;

/**
 * Assign each of the 54 stickers to one of the 6 centre colours so that every
 * colour is used exactly 9 times and the total colour difference is as small
 * as possible.
 *
 * @param samples sticker colours per face (URFDLB order, 9 each, row by row)
 */
export function classifyStickers(samples: Record<Face, RGB[]>): Classification {
  const labs: Lab[] = FACES.flatMap((f) => samples[f].map(rgbToLab));
  const centerIdx = FACES.map((_, fi) => fi * 9 + 4);
  let anchors: Lab[] = centerIdx.map((i) => labs[i]);

  const duplicateCenters: Face[][] = [];
  for (let a = 0; a < 6; a++)
    for (let b = a + 1; b < 6; b++)
      if (labDistance(anchors[a], anchors[b]) < 10) duplicateCenters.push([FACES[a], FACES[b]]);

  let assign: number[] = new Array(54).fill(0);
  for (let iter = 0; iter < 3; iter++) {
    const cost = labs.map((lab, i) => {
      const row: number[] = [];
      for (let f = 0; f < 6; f++) {
        const isCenter = centerIdx.includes(i);
        const c = isCenter ? (Math.floor(i / 9) === f ? 0 : 1e6) : labDistance(lab, anchors[f]);
        for (let k = 0; k < 9; k++) row.push(c);
      }
      return row;
    });
    const cols = hungarian(cost);
    assign = cols.map((c) => Math.floor(c / 9));
    // refine anchors: mean of assigned stickers (centre counted twice)
    anchors = FACES.map((_, f) => {
      const members = labs.filter((_, i) => assign[i] === f);
      members.push(labs[centerIdx[f]]);
      return [0, 1, 2].map((k) => members.reduce((s, m) => s + m[k], 0) / members.length) as Lab;
    });
  }

  const confidence = labs.map((lab, i) => {
    if (centerIdx.includes(i)) return 1;
    const d = anchors.map((a) => labDistance(lab, a));
    const d1 = d[assign[i]];
    const d2 = Math.min(...d.filter((_, f) => f !== assign[i]));
    const margin = (d2 - d1) / (d2 + d1 + 1e-6);
    return Math.max(0, Math.min(1, margin * 1.6));
  });

  return { facelets: assign.map((f) => FACES[f]).join(""), confidence, duplicateCenters };
}
