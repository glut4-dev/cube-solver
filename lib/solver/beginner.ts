/**
 * Beginner (layer-by-layer) solver.
 *
 * Works on the cube as scanned (white on top, green in front):
 *   1. white cross on top            (short search per edge)
 *   2. white corners                 (R' D' R D repeated, from any side)
 *   3. turn the cube over (z2)       -> yellow on top
 *   4. middle layer edges
 *   5. yellow cross
 *   6. yellow edges
 *   7. position yellow corners
 *   8. twist yellow corners
 *
 * Stages 2-7 search over a few standard beginner algorithms (performed from
 * any side) plus single turns, and check the result, so the output only ever
 * uses well-known algorithms.
 */
import { DEST, Facelets, applyMove, applyMoves, isSolved, relabelY, simplify, splitAlg, FACE_MOVES } from "../cube/model";
import { CORNER_FACELETS, EDGE_FACELETS } from "../cube/validate";

export interface SolveStage {
  id: string;
  title: string;
  description: string;
  moves: string[];
}

const centerOf = (i: number) => Math.floor(i / 9) * 9 + 4;

function allCorrect(state: Facelets, idx: number[]): boolean {
  for (const i of idx) if (state[i] !== state[centerOf(i)]) return false;
  return true;
}

// ---------- permutation helpers (fast macro application) ----------

type Perm = number[]; // dest array

function permOf(moves: string[]): Perm {
  let p = Array.from({ length: 54 }, (_, i) => i);
  for (const m of moves) {
    const d = DEST[m];
    p = p.map((x) => d[x]);
  }
  return p;
}

function applyPerm(state: string[], p: Perm): string[] {
  const out = new Array<string>(54);
  for (let i = 0; i < 54; i++) out[p[i]] = state[i];
  return out;
}

interface Macro {
  moves: string[];
  perm: Perm;
  /** Macros with the same group are never used back to back. */
  group: string;
}

function macro(alg: string | string[], group: string): Macro {
  const moves = typeof alg === "string" ? splitAlg(alg) : alg;
  return { moves, perm: permOf(moves), group };
}

function turns(face: string): Macro[] {
  return [face, face + "'", face + "2"].map((m) => macro(m, face));
}

/** Same algorithm performed from each of the 4 sides. */
function fromAllSides(alg: string, group: string): Macro[] {
  return [0, 1, 2, 3].map((k) => macro(relabelY(splitAlg(alg), k), `${group}${k}`));
}

/**
 * Iterative deepening over macros. Returns the sequence with the fewest macros,
 * and among those the fewest single moves.
 */
function macroSearch(
  start: Facelets,
  macros: Macro[],
  goal: (s: Facelets) => boolean,
  maxDepth: number,
): string[] | null {
  if (goal(start)) return [];
  const startArr = start.split("");
  for (let depth = 1; depth <= maxDepth; depth++) {
    let best: Macro[] | null = null;
    let bestLen = Infinity;
    const path: Macro[] = [];
    const dfs = (s: string[], d: number, len: number) => {
      if (len >= bestLen) return;
      if (d === 0) {
        if (goal(s.join(""))) {
          best = path.slice();
          bestLen = len;
        }
        return;
      }
      const last = path[path.length - 1];
      for (const m of macros) {
        if (last && last.group === m.group) continue;
        path.push(m);
        dfs(applyPerm(s, m.perm), d - 1, len + m.moves.length);
        path.pop();
      }
    };
    dfs(startArr, depth, 0);
    if (best) return (best as Macro[]).flatMap((m) => m.moves);
  }
  return null;
}

// ---------- stage 1: cross, IDA* on tracked edges ----------

const OPPOSITE: Record<string, string> = { U: "D", D: "U", R: "L", L: "R", F: "B", B: "F" };
const FACE_ORDER = "URFDLB";

/** Distance (in face turns) from every position of a sticker pair to (ha, hb). */
function edgeDistanceTable(ha: number, hb: number): Map<number, number> {
  const dist = new Map<number, number>([[ha * 54 + hb, 0]]);
  let frontier = [[ha, hb]];
  let d = 0;
  while (frontier.length) {
    d++;
    const next: number[][] = [];
    for (const [a, b] of frontier)
      for (const m of FACE_MOVES) {
        const na = DEST[m][a];
        const nb = DEST[m][b];
        const k = na * 54 + nb;
        if (!dist.has(k)) {
          dist.set(k, d);
          next.push([na, nb]);
        }
      }
    frontier = next;
  }
  return dist;
}

const CROSS_EDGES = [1, 0, 3, 2]; // UF, UR, UB, UL in EDGE_FACELETS
const EDGE_TABLES = new Map<number, Map<number, number>>();
function tableFor(edge: number) {
  let t = EDGE_TABLES.get(edge);
  if (!t) {
    t = edgeDistanceTable(EDGE_FACELETS[edge][0], EDGE_FACELETS[edge][1]);
    EDGE_TABLES.set(edge, t);
  }
  return t;
}

/** Current sticker positions [a, b] of the edge that belongs at `edge`. */
function locateEdge(state: Facelets, edge: number): [number, number] {
  const [ha, hb] = EDGE_FACELETS[edge];
  const ca = state[centerOf(ha)];
  const cb = state[centerOf(hb)];
  for (const [x, y] of EDGE_FACELETS) {
    if (state[x] === ca && state[y] === cb) return [x, y];
    if (state[y] === ca && state[x] === cb) return [y, x];
  }
  throw new Error("Edge not found");
}

function solveEdges(state: Facelets, edges: number[], maxDepth = 10): string[] | null {
  const tables = edges.map(tableFor);
  const pos0 = edges.map((e) => locateEdge(state, e));
  const h = (pos: [number, number][]) => Math.max(...pos.map(([a, b], i) => tables[i].get(a * 54 + b)!));
  const path: string[] = [];
  const dfs = (pos: [number, number][], g: number, bound: number, lastFace: string): boolean => {
    const hv = h(pos);
    if (hv === 0) return true;
    if (g + hv > bound) return false;
    for (const m of FACE_MOVES) {
      const f = m[0];
      if (f === lastFace) continue;
      if (OPPOSITE[f] === lastFace && FACE_ORDER.indexOf(f) > FACE_ORDER.indexOf(lastFace)) continue;
      const d = DEST[m];
      path.push(m);
      if (dfs(pos.map(([a, b]) => [d[a], d[b]]), g + 1, bound, f)) return true;
      path.pop();
    }
    return false;
  };
  for (let bound = h(pos0); bound <= maxDepth; bound++) {
    path.length = 0;
    if (dfs(pos0, 0, bound, "")) return path.slice();
  }
  return null;
}

// ---------- piece index groups ----------

const idxEdges = (list: number[]) => list.flatMap((e) => EDGE_FACELETS[e]);
const idxCorners = (list: number[]) => list.flatMap((c) => CORNER_FACELETS[c]);

const TOP_EDGES = [0, 1, 2, 3];
const BOTTOM_EDGES = [4, 5, 6, 7];
const MIDDLE_EDGES = [8, 9, 10, 11];
const TOP_CORNERS = [0, 1, 2, 3];
const BOTTOM_CORNERS = [4, 5, 6, 7];

/** Solve pieces one at a time, always picking the one that is quickest next. */
function pieceByPiece(
  state: Facelets,
  pieces: number[][],
  keep: number[],
  solvePiece: (s: Facelets, pieceIdx: number[], keepIdx: number[]) => string[] | null,
): string[] {
  const moves: string[] = [];
  let s = state;
  let done = keep.slice();
  let todo = pieces.slice();
  while (todo.length) {
    let best: { i: number; sol: string[] } | null = null;
    todo.forEach((p, i) => {
      if (allCorrect(s, p)) {
        if (!best || best.sol.length > 0) best = { i, sol: [] };
        return;
      }
      const sol = solvePiece(s, p, done);
      if (sol && (!best || sol.length < best.sol.length)) best = { i, sol };
    });
    if (!best) throw new Error("Beginner solver: no solution found for a piece");
    const { i, sol } = best as { i: number; sol: string[] };
    moves.push(...sol);
    s = applyMoves(s, sol);
    done = done.concat(todo[i]);
    todo = todo.filter((_, j) => j !== i);
  }
  return moves;
}

// ---------- macro sets ----------

const D_TURNS = turns("D");
const U_TURNS = turns("U");

const CORNER_MACROS: Macro[] = [
  ...D_TURNS,
  ...[0, 1, 2, 3].flatMap((k) =>
    [1, 2, 3, 4, 5].map((n) => macro(relabelY(splitAlg("R' D' R D ".repeat(n)), k), `A${k}`)),
  ),
];

const MIDDLE_MACROS: Macro[] = [
  ...U_TURNS,
  ...fromAllSides("U R U' R' U' F' U F", "right"),
  ...fromAllSides("U' L' U L U F U' F'", "left"),
];

const YELLOW_CROSS_MACROS = [...U_TURNS, ...fromAllSides("F R U R' U' F'", "cross")];
const YELLOW_EDGE_MACROS = [...U_TURNS, ...fromAllSides("R U R' U R U2 R' U", "edges")];
const CORNER_POSITION_MACROS = fromAllSides("U R U' L' U R' U' L", "pos");

function cornerInPlace(state: Facelets, c: number): boolean {
  const fl = CORNER_FACELETS[c];
  const have = fl.map((i) => state[i]).sort().join("");
  const want = fl.map((i) => state[centerOf(i)]).sort().join("");
  return have === want;
}

// ---------- main ----------

export function solveBeginner(start: Facelets): SolveStage[] {
  const stages: SolveStage[] = [];
  let s = start;
  const push = (id: string, title: string, description: string, moves: string[], simp = true) => {
    const m = simp ? simplify(moves) : moves;
    s = applyMoves(s, m);
    stages.push({ id, title, description, moves: m });
  };

  // 1. White cross
  const cross = pieceByPiece(
    s,
    CROSS_EDGES.map((e) => EDGE_FACELETS[e]),
    [],
    (st, piece) => {
      const edge = EDGE_FACELETS.findIndex((f) => f === piece);
      const keepEdges = CROSS_EDGES.filter((e) => e !== edge && allCorrect(st, EDGE_FACELETS[e]));
      return solveEdges(st, [...keepEdges, edge]);
    },
  );
  push(
    "cross",
    "White cross",
    "Build a white cross on top. Each white edge must also match the centre colour of its side.",
    cross,
  );

  // 2. White corners
  const crossIdx = idxEdges(TOP_EDGES);
  const corners = pieceByPiece(s, TOP_CORNERS.map((c) => CORNER_FACELETS[c]), crossIdx, (st, piece, keep) =>
    macroSearch(st, CORNER_MACROS, (x) => allCorrect(x, piece) && allCorrect(x, keep), 3),
  );
  push(
    "corners",
    "White corners",
    "Bring each white corner below its spot, then repeat R' D' R D (from that side) until it pops into place. This finishes the first layer.",
    corners,
  );

  // 3. Turn over
  push(
    "flip",
    "Turn the cube over",
    "Turn the whole cube upside down, keeping green in front. Yellow is now on top and the solved white layer is at the bottom.",
    ["z2"],
    false,
  );

  // 4. Middle layer
  const firstLayer = [...idxEdges(BOTTOM_EDGES), ...idxCorners(BOTTOM_CORNERS)];
  const middle = pieceByPiece(s, MIDDLE_EDGES.map((e) => EDGE_FACELETS[e]), firstLayer, (st, piece, keep) =>
    macroSearch(st, MIDDLE_MACROS, (x) => allCorrect(x, piece) && allCorrect(x, keep), 3),
  );
  push(
    "middle",
    "Middle layer",
    "Find a top edge without yellow, line it up with its centre, and insert it to the right (U R U' R' U' F' U F) or to the left (U' L' U L U F U' F').",
    middle,
  );

  // 5. Yellow cross
  const twoLayers = [...firstLayer, ...idxEdges(MIDDLE_EDGES)];
  const topEdgeStickers = [1, 3, 5, 7];
  const ycross = macroSearch(
    s,
    YELLOW_CROSS_MACROS,
    (x) => allCorrect(x, twoLayers) && topEdgeStickers.every((i) => x[i] === x[4]),
    5,
  );
  if (!ycross) throw new Error("Beginner solver: yellow cross failed");
  push(
    "ycross",
    "Yellow cross",
    "Make a yellow cross on top using F R U R' U' F'. You may need it up to 3 times (dot → L-shape → line → cross).",
    ycross,
  );

  // 6. Yellow edges
  const yedges = macroSearch(s, YELLOW_EDGE_MACROS, (x) => allCorrect(x, twoLayers) && allCorrect(x, idxEdges(TOP_EDGES)), 4);
  if (!yedges) throw new Error("Beginner solver: yellow edges failed");
  push(
    "yedges",
    "Yellow edges",
    "Turn the yellow edges so they match the side centres, swapping them with R U R' U R U2 R' U.",
    yedges,
  );

  // 7. Position yellow corners
  const cornerKeep = [...twoLayers, ...idxEdges(TOP_EDGES)];
  const ypos = macroSearch(
    s,
    CORNER_POSITION_MACROS,
    (x) => allCorrect(x, cornerKeep) && TOP_CORNERS.every((c) => cornerInPlace(x, c)),
    3,
  );
  if (!ypos) throw new Error("Beginner solver: corner positions failed");
  push(
    "ypos",
    "Position yellow corners",
    "Move each yellow corner to its correct spot (colours may still be twisted) using U R U' L' U R' U' L.",
    ypos,
  );

  // 8. Twist yellow corners: hold the cube still, repeat R' D' R D on the
  // front-right-top corner, then turn U to bring the next corner there.
  const twist: string[] = [];
  const sexy = splitAlg("R' D' R D");
  let t = s;
  const unoriented = (x: Facelets) => [8, 6, 0, 2].filter((i) => x[i] !== x[4]).length;
  for (let k = 0; k < 4 && unoriented(t) > 0; k++) {
    let guard = 0;
    while (t[8] !== t[4]) {
      twist.push(...sexy);
      t = applyMoves(t, sexy);
      if (++guard > 6) throw new Error("Beginner solver: corner twist failed");
    }
    if (unoriented(t) > 0) {
      twist.push("U");
      t = applyMove(t, "U");
    }
  }
  // turn the top layer back so it lines up with the sides
  for (let k = 0; k < 4 && !isSolved(t); k++) {
    twist.push("U");
    t = applyMove(t, "U");
  }
  push(
    "ytwist",
    "Twist yellow corners",
    "Hold the cube still. Repeat R' D' R D until the front-right-top corner shows yellow on top, then turn only the top layer (U) to bring the next corner there. The bottom looks scrambled in between — that's normal, it fixes itself at the end.",
    twist,
  );

  if (!isSolved(s)) throw new Error("Beginner solver: cube not solved at the end");
  return stages;
}
