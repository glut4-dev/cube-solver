"use client";
import { create } from "zustand";
import { FACES, Face, Facelets, SOLVED, applyMoves, randomScramble } from "@/lib/cube/model";
import { classifyStickers } from "@/lib/vision/classify";
import type { FaceAnalysis } from "@/lib/vision/quality";
import type { SolveStage, SolveMethod } from "@/lib/solver";
import { SCAN_STEPS, FACE_INFO } from "@/lib/cube/faces";
import { findRotationFix, validateCube } from "@/lib/cube/validate";

export type Step = "start" | "scan" | "review" | "verify" | "solve";

export interface Photo {
  image: string; // data URL of the aligned square crop
  analysis: FaceAnalysis;
}

interface CubeState {
  step: Step;
  scanIndex: number;
  /** When set, the scanner returns to review after this one photo. */
  retakeOnly: boolean;
  photos: Partial<Record<Face, Photo>>;
  facelets: Facelets | null;
  confidence: number[] | null;
  duplicateCenters: Face[][];
  edited: Set<number>;
  /** Message shown on the review screen, e.g. after an automatic fix. */
  notice: string | null;
  method: SolveMethod;
  stages: SolveStage[] | null;

  startScan: () => void;
  savePhoto: (face: Face, photo: Photo) => void;
  goToScan: (index: number) => void;
  retake: (face: Face) => void;
  setFacelets: (f: Facelets) => void;
  setSticker: (i: number, face: Face) => void;
  setStep: (s: Step) => void;
  setMethod: (m: SolveMethod) => void;
  setStages: (s: SolveStage[] | null) => void;
  loadDemo: () => void;
  reset: () => void;
}

function classifyAll(photos: Partial<Record<Face, Photo>>) {
  const samples = Object.fromEntries(FACES.map((f) => [f, photos[f]!.analysis.samples])) as Record<Face, FaceAnalysis["samples"]>;
  const c = classifyStickers(samples);
  let notice: string | null = null;
  let facelets = c.facelets;
  let confidence = c.confidence;
  if (!validateCube(facelets).valid) {
    // A photo taken at the wrong angle gives an impossible cube: try rotating each side.
    const fix = findRotationFix(facelets);
    if (fix) {
      facelets = fix.state;
      const rotated = Object.keys(fix.rotations) as Face[];
      confidence = confidence.slice();
      for (const f of rotated) {
        const base = FACES.indexOf(f) * 9;
        const k = fix.rotations[f]!;
        const old = c.confidence.slice(base, base + 9);
        // keep confidence aligned with the rotated stickers
        let cur = old;
        for (let n = 0; n < k; n++) cur = [0, 1, 2].flatMap((r) => [0, 1, 2].map((cc) => cur[(2 - cc) * 3 + r]));
        confidence.splice(base, 9, ...cur);
      }
      notice = `The photo of the ${rotated.map((f) => FACE_INFO[f].color).join(" and ")} side${rotated.length > 1 ? "s were" : " was"} turned sideways, so ${rotated.length > 1 ? "they were" : "it was"} rotated automatically. Please check the result.`;
    }
  }
  return { ...c, facelets, confidence, notice };
}

export const useCubeStore = create<CubeState>((set, get) => ({
  step: "start",
  scanIndex: 0,
  retakeOnly: false,
  photos: {},
  facelets: null,
  confidence: null,
  duplicateCenters: [],
  edited: new Set(),
  notice: null,
  method: "beginner",
  stages: null,

  startScan: () => set({ step: "scan", scanIndex: 0, retakeOnly: false, photos: {}, facelets: null, confidence: null, stages: null }),

  savePhoto: (face, photo) => {
    const photos = { ...get().photos, [face]: photo };
    const { retakeOnly, scanIndex } = get();
    const allDone = FACES.every((f) => photos[f]);
    if (allDone && (retakeOnly || scanIndex >= SCAN_STEPS.length - 1)) {
      const c = classifyAll(photos);
      set({
        photos,
        facelets: c.facelets,
        confidence: c.confidence,
        duplicateCenters: c.duplicateCenters,
        notice: c.notice,
        edited: new Set(),
        step: "review",
        retakeOnly: false,
        stages: null,
      });
    } else {
      set({ photos, scanIndex: Math.min(scanIndex + 1, SCAN_STEPS.length - 1) });
    }
  },

  goToScan: (index) => set({ scanIndex: index }),

  retake: (face) => set({ step: "scan", retakeOnly: true, scanIndex: SCAN_STEPS.findIndex((s) => s.face === face) }),

  setFacelets: (f) => set({ facelets: f, stages: null }),

  setSticker: (i, face) => {
    const { facelets, edited, confidence } = get();
    if (!facelets) return;
    const arr = facelets.split("");
    arr[i] = face;
    const conf = confidence ? confidence.slice() : null;
    if (conf) conf[i] = 1;
    set({ facelets: arr.join(""), edited: new Set(edited).add(i), confidence: conf, stages: null, notice: null });
  },

  setStep: (step) => set({ step }),
  setMethod: (method) => set({ method, stages: null }),
  setStages: (stages) => set({ stages }),

  loadDemo: () =>
    set({
      step: "review",
      photos: {},
      facelets: applyMoves(SOLVED, randomScramble(25)),
      confidence: new Array(54).fill(1),
      duplicateCenters: [],
      edited: new Set(),
      notice: "This is a random demo cube. Scan your own cube to solve it.",
      stages: null,
    }),

  reset: () =>
    set({ step: "start", scanIndex: 0, retakeOnly: false, photos: {}, facelets: null, confidence: null, duplicateCenters: [], edited: new Set(), notice: null, stages: null }),
}));
