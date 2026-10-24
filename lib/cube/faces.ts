import type { Face } from "./model";

export const FACE_INFO: Record<Face, { color: string; hex: string; side: string }> = {
  U: { color: "white", hex: "#f5f5f4", side: "top" },
  R: { color: "red", hex: "#dc2626", side: "right" },
  F: { color: "green", hex: "#16a34a", side: "front" },
  D: { color: "yellow", hex: "#facc15", side: "bottom" },
  L: { color: "orange", hex: "#f97316", side: "left" },
  B: { color: "blue", hex: "#2563eb", side: "back" },
};

/** Order in which the user photographs the sides, with how to hold the cube. */
export const SCAN_STEPS: { face: Face; up: Face; tip: string }[] = [
  { face: "U", up: "B", tip: "Start with white on top and green facing you. Tilt the top towards you so white faces the camera — blue is now at the top of the picture." },
  { face: "F", up: "U", tip: "Back to white on top. Green faces the camera." },
  { face: "R", up: "U", tip: "Keep white on top. Turn the cube so red faces the camera." },
  { face: "B", up: "U", tip: "Keep white on top. Turn again so blue faces the camera." },
  { face: "L", up: "U", tip: "Keep white on top. Turn again so orange faces the camera." },
  { face: "D", up: "F", tip: "Show the bottom: yellow faces the camera, with green at the top of the picture." },
];
