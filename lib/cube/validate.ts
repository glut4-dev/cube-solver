import { FACES, Face, Facelets, CENTER } from "./model";

/** Sticker indices of each corner, U/D sticker first, then clockwise (Kociemba order). */
export const CORNER_FACELETS = [
  [8, 9, 20], // URF
  [6, 18, 38], // UFL
  [0, 36, 47], // ULB
  [2, 45, 11], // UBR
  [29, 26, 15], // DFR
  [27, 44, 24], // DLF
  [33, 53, 42], // DBL
  [35, 17, 51], // DRB
];
export const CORNER_COLORS = ["URF", "UFL", "ULB", "UBR", "DFR", "DLF", "DBL", "DRB"];

export const EDGE_FACELETS = [
  [5, 10], // UR
  [7, 19], // UF
  [3, 37], // UL
  [1, 46], // UB
  [32, 16], // DR
  [28, 25], // DF
  [30, 43], // DL
  [34, 52], // DB
  [23, 12], // FR
  [21, 41], // FL
  [50, 39], // BL
  [48, 14], // BR
];
export const EDGE_COLORS = ["UR", "UF", "UL", "UB", "DR", "DF", "DL", "DB", "FR", "FL", "BL", "BR"];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  /** Sticker indices that belong to pieces that could not be identified. */
  badStickers: number[];
}

const FACE_NAMES: Record<Face, string> = {
  U: "top (white)",
  R: "right (red)",
  F: "front (green)",
  D: "bottom (yellow)",
  L: "left (orange)",
  B: "back (blue)",
};

function permParity(p: number[]): number {
  let parity = 0;
  const seen = new Array(p.length).fill(false);
  for (let i = 0; i < p.length; i++) {
    if (seen[i]) continue;
    let len = 0;
    for (let j = i; !seen[j]; j = p[j]) {
      seen[j] = true;
      len++;
    }
    parity ^= (len - 1) & 1;
  }
  return parity;
}

/**
 * Checks that a facelet string describes a cube that can actually be solved:
 * right sticker counts, every piece present once, and correct twist, flip and parity.
 */
export function validateCube(state: Facelets): ValidationResult {
  const errors: string[] = [];
  const bad = new Set<number>();

  if (state.length !== 54) return { valid: false, errors: ["Cube must have 54 stickers."], badStickers: [] };

  for (const f of FACES) {
    if (state[CENTER[f]] !== f) errors.push(`Centre of the ${FACE_NAMES[f]} side is wrong.`);
    const n = state.split("").filter((c) => c === f).length;
    if (n !== 9) errors.push(`${n} stickers of the ${FACE_NAMES[f]} colour (needs 9).`);
  }
  if (errors.length) return { valid: false, errors, badStickers: [] };

  // Corners
  const cp: number[] = [];
  let twist = 0;
  CORNER_FACELETS.forEach((fl) => {
    const cols = fl.map((i) => state[i]);
    let ori = cols.findIndex((c) => c === "U" || c === "D");
    if (ori < 0) ori = 0;
    const c1 = cols[(ori + 1) % 3];
    const c2 = cols[(ori + 2) % 3];
    const piece = CORNER_COLORS.findIndex((cc) => cc[0] === cols[ori] && cc[1] === c1 && cc[2] === c2);
    if (piece < 0) fl.forEach((i) => bad.add(i));
    cp.push(piece);
    twist += ori;
  });

  // Edges
  const ep: number[] = [];
  let flip = 0;
  EDGE_FACELETS.forEach((fl) => {
    const a = state[fl[0]];
    const b = state[fl[1]];
    let piece = EDGE_COLORS.findIndex((ec) => ec[0] === a && ec[1] === b);
    if (piece >= 0) ep.push(piece);
    else {
      piece = EDGE_COLORS.findIndex((ec) => ec[0] === b && ec[1] === a);
      if (piece >= 0) {
        ep.push(piece);
        flip++;
      } else {
        fl.forEach((i) => bad.add(i));
        ep.push(-1);
      }
    }
  });

  if (bad.size) {
    errors.push("Some pieces have colour combinations that don't exist on a real cube.");
    return { valid: false, errors, badStickers: [...bad] };
  }

  const dupCorners = cp.filter((p, i) => cp.indexOf(p) !== i);
  const dupEdges = ep.filter((p, i) => ep.indexOf(p) !== i);
  if (dupCorners.length || dupEdges.length) {
    cp.forEach((p, i) => dupCorners.includes(p) && CORNER_FACELETS[i].forEach((s) => bad.add(s)));
    ep.forEach((p, i) => dupEdges.includes(p) && EDGE_FACELETS[i].forEach((s) => bad.add(s)));
    errors.push("Some pieces appear twice, so others are missing.");
    return { valid: false, errors, badStickers: [...bad] };
  }

  if (twist % 3 !== 0) errors.push("One corner is twisted (this can't happen by turning).");
  if (flip % 2 !== 0) errors.push("One edge is flipped (this can't happen by turning).");
  if (permParity(cp) !== permParity(ep)) errors.push("Two pieces are swapped (this can't happen by turning).");

  return { valid: errors.length === 0, errors, badStickers: [] };
}

/** Rotate the 8 outer stickers of a face clockwise `k` times (fixes a photo taken at the wrong angle). */
export function rotateFaceStickers(state: Facelets, face: Face, k: number): Facelets {
  const base = FACES.indexOf(face) * 9;
  const arr = state.split("");
  for (let n = 0; n < ((k % 4) + 4) % 4; n++) {
    const f = arr.slice(base, base + 9);
    // clockwise: new[r][c] = old[2-c][r]
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) arr[base + r * 3 + c] = f[(2 - c) * 3 + r];
  }
  return arr.join("");
}

export interface RotationFix {
  state: Facelets;
  rotations: Partial<Record<Face, number>>;
}

/**
 * If the cube is invalid, try every combination of face rotations (4^6) to see
 * whether one or more photos were simply taken at the wrong angle. Returns the
 * fix that rotates the fewest faces, or null.
 */
export function findRotationFix(state: Facelets): RotationFix | null {
  let best: RotationFix | null = null;
  let bestCount = Infinity;
  for (let code = 0; code < 4096; code++) {
    const rot: Partial<Record<Face, number>> = {};
    let count = 0;
    let s = state;
    for (let f = 0; f < 6; f++) {
      const k = (code >> (2 * f)) & 3;
      if (k) {
        rot[FACES[f]] = k;
        count++;
        s = rotateFaceStickers(s, FACES[f], k);
      }
    }
    if (count >= bestCount) continue;
    if (validateCube(s).valid) {
      best = { state: s, rotations: rot };
      bestCount = count;
    }
  }
  return best;
}
