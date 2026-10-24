/**
 * Cube model based on the standard 54-sticker "facelet" layout used by
 * Kociemba / cubejs. Faces are stored in the order U R F D L B, 9 stickers
 * each, row by row as seen when looking straight at the face:
 *
 *   U: top row touches B, left column touches L
 *   R, F, B, L: top row touches U
 *   D: top row touches F
 *
 * All moves are generated from 3D geometry, so they are consistent with the
 * 3D renderer, which uses the same coordinates (x = right, y = up, z = front).
 */

export const FACES = ["U", "R", "F", "D", "L", "B"] as const;
export type Face = (typeof FACES)[number];
export type Vec3 = [number, number, number];

/** A cube state: 54 face letters, one per sticker (colour = face whose centre has that colour). */
export type Facelets = string;

export const SOLVED: Facelets = FACES.map((f) => f.repeat(9)).join("");

export const FACE_NORMAL: Record<Face, Vec3> = {
  U: [0, 1, 0],
  R: [1, 0, 0],
  F: [0, 0, 1],
  D: [0, -1, 0],
  L: [-1, 0, 0],
  B: [0, 0, -1],
};

/** Index of the centre sticker of each face. */
export const CENTER: Record<Face, number> = { U: 4, R: 13, F: 22, D: 31, L: 40, B: 49 };

export function faceOf(index: number): Face {
  return FACES[Math.floor(index / 9)];
}

/** Position of the cubie that owns sticker (face, row, col). */
function stickerPos(face: Face, r: number, c: number): Vec3 {
  switch (face) {
    case "U":
      return [c - 1, 1, r - 1];
    case "R":
      return [1, 1 - r, 1 - c];
    case "F":
      return [c - 1, 1 - r, 1];
    case "D":
      return [c - 1, -1, 1 - r];
    case "L":
      return [-1, 1 - r, c - 1];
    case "B":
      return [1 - c, 1 - r, -1];
  }
}

export interface StickerGeom {
  index: number;
  face: Face;
  pos: Vec3;
  normal: Vec3;
}

export const STICKERS: StickerGeom[] = [];
FACES.forEach((face, fi) => {
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      STICKERS.push({ index: fi * 9 + r * 3 + c, face, pos: stickerPos(face, r, c), normal: FACE_NORMAL[face] });
});

const key = (p: Vec3, n: Vec3) => `${p.join(",")}|${n.join(",")}`;
const STICKER_BY_KEY = new Map<string, number>(STICKERS.map((s) => [key(s.pos, s.normal), s.index]));

/** Sticker index from a cubie position and outward normal. */
export function stickerAt(pos: Vec3, normal: Vec3): number {
  const i = STICKER_BY_KEY.get(key(pos, normal));
  if (i === undefined) throw new Error(`No sticker at ${key(pos, normal)}`);
  return i;
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
/** Rotate v by -90° around unit axis a (clockwise when looking at the face from outside). */
function rotCW(v: Vec3, a: Vec3): Vec3 {
  const c = cross(a, v);
  const d = dot(a, v);
  return [-c[0] + a[0] * d, -c[1] + a[1] * d, -c[2] + a[2] * d].map((x) => x + 0) as Vec3;
}

/** Basic quarter turns: 6 faces plus whole-cube rotations x, y, z (x follows R, y follows U, z follows F). */
export const BASE_MOVES = ["U", "R", "F", "D", "L", "B", "x", "y", "z"] as const;
export type BaseMove = (typeof BASE_MOVES)[number];

export const MOVE_AXIS: Record<BaseMove, Vec3> = {
  ...FACE_NORMAL,
  x: FACE_NORMAL.R,
  y: FACE_NORMAL.U,
  z: FACE_NORMAL.F,
};

/** True when the cubie at `pos` turns with `move`. */
export function inLayer(move: BaseMove, pos: Vec3): boolean {
  if (move === "x" || move === "y" || move === "z") return true;
  return dot(pos, MOVE_AXIS[move]) === 1;
}

/** dest[i] = where the sticker at position i ends up after one clockwise quarter turn. */
const QUARTER_DEST: Record<BaseMove, number[]> = {} as Record<BaseMove, number[]>;
for (const m of BASE_MOVES) {
  const axis = MOVE_AXIS[m];
  QUARTER_DEST[m] = STICKERS.map((s) =>
    inLayer(m, s.pos) ? stickerAt(rotCW(s.pos, axis), rotCW(s.normal, axis)) : s.index,
  );
}

function compose(a: number[], b: number[]): number[] {
  // apply a then b
  return a.map((x) => b[x]);
}

/** Parsed move: base move and number of clockwise quarter turns (1, 2 or 3). */
export interface Move {
  base: BaseMove;
  turns: 1 | 2 | 3;
}

/** Move destination tables keyed by notation, e.g. "R", "R'", "R2". */
export const DEST: Record<string, number[]> = {};
for (const m of BASE_MOVES) {
  const q = QUARTER_DEST[m];
  const h = compose(q, q);
  DEST[m] = q;
  DEST[m + "2"] = h;
  DEST[m + "'"] = compose(h, q);
}

export const FACE_MOVES = FACES.flatMap((f) => [f, f + "'", f + "2"]);

export function parseMove(token: string): Move {
  const base = token[0] as BaseMove;
  if (!BASE_MOVES.includes(base)) throw new Error(`Unknown move ${token}`);
  const suffix = token.slice(1);
  const turns = suffix === "" ? 1 : suffix === "2" ? 2 : suffix === "'" ? 3 : null;
  if (turns === null) throw new Error(`Unknown move ${token}`);
  return { base, turns };
}

export function formatMove(m: Move): string {
  return m.base + (m.turns === 1 ? "" : m.turns === 2 ? "2" : "'");
}

export function splitAlg(alg: string): string[] {
  return alg.trim().split(/\s+/).filter(Boolean);
}

export function invertMove(token: string): string {
  const m = parseMove(token);
  return formatMove({ base: m.base, turns: (4 - m.turns) as 1 | 2 | 3 });
}

export function invertAlg(moves: string[]): string[] {
  return moves.slice().reverse().map(invertMove);
}

export function applyMove(state: Facelets, token: string): Facelets {
  const dest = DEST[token];
  if (!dest) throw new Error(`Unknown move ${token}`);
  const out = new Array<string>(54);
  for (let i = 0; i < 54; i++) out[dest[i]] = state[i];
  return out.join("");
}

export function applyMoves(state: Facelets, moves: string[] | string): Facelets {
  const list = typeof moves === "string" ? splitAlg(moves) : moves;
  return list.reduce(applyMove, state);
}

/** Every face shows one colour (works for any whole-cube orientation). */
export function isSolved(state: Facelets): boolean {
  for (let f = 0; f < 6; f++) {
    const c = state[f * 9];
    for (let i = 1; i < 9; i++) if (state[f * 9 + i] !== c) return false;
  }
  return true;
}

/** Merge neighbouring turns of the same base move (R R -> R2, R R' -> nothing). */
export function simplify(moves: string[]): string[] {
  const out: Move[] = [];
  for (const t of moves) {
    const m = parseMove(t);
    const last = out[out.length - 1];
    if (last && last.base === m.base) {
      const turns = (last.turns + m.turns) % 4;
      if (turns === 0) out.pop();
      else last.turns = turns as 1 | 2 | 3;
    } else out.push({ ...m });
  }
  return out.map(formatMove);
}

/**
 * Relabel an algorithm as if the whole cube were turned k times around y,
 * i.e. the same algorithm performed from another side. With k = 1 the
 * algorithm written for the front face is applied to the right face.
 */
export function relabelY(moves: string[], k: number): string[] {
  const cycle = ["F", "R", "B", "L"];
  return moves.map((t) => {
    const i = cycle.indexOf(t[0]);
    if (i < 0) return t;
    return cycle[(i + k) % 4] + t.slice(1);
  });
}

export function randomScramble(length = 25, rng: () => number = Math.random): string[] {
  const out: string[] = [];
  let lastFace = "";
  while (out.length < length) {
    const f = FACES[Math.floor(rng() * 6)];
    if (f === lastFace) continue;
    lastFace = f;
    out.push(f + ["", "'", "2"][Math.floor(rng() * 3)]);
  }
  return out;
}
