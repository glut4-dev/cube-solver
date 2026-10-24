import { RGB, rgbToLab } from "./color";

export interface ImageDataLike {
  data: Uint8ClampedArray | number[];
  width: number;
  height: number;
}

export type Severity = "error" | "warning";
export interface QualityIssue {
  severity: Severity;
  message: string;
}

export interface FaceAnalysis {
  /** Median colour of each of the 9 stickers, row by row. */
  samples: RGB[];
  /** 0..1 per sticker: how even the colour is inside the sticker. */
  uniformity: number[];
  sharpness: number;
  brightness: number;
  clipped: number;
  issues: QualityIssue[];
}

/** Thresholds, tuned for a 300×300 crop of one face. */
export const LIMITS = {
  blurError: 15,
  blurWarn: 45,
  darkError: 45,
  darkWarn: 70,
  clippedWarn: 0.12,
  clippedError: 0.3,
  /** Lab spread (std) inside one sticker above which the sticker is "uneven". */
  unevenSpread: 14,
};

function median(values: number[]): number {
  const s = values.slice().sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/**
 * Analyse a square image of one cube face aligned to a 3×3 grid:
 * sample each sticker and check sharpness, exposure and alignment.
 */
export function analyzeFace(img: ImageDataLike): FaceAnalysis {
  const { data, width: w, height: h } = img;
  const lum = new Float32Array(w * h);
  let sum = 0;
  let clippedCount = 0;
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    lum[i] = l;
    sum += l;
    if (r > 250 && g > 250 && b > 250) clippedCount++;
  }
  const brightness = sum / (w * h);
  const clipped = clippedCount / (w * h);

  // Sharpness: variance of the Laplacian.
  let lapSum = 0;
  let lapSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const v = 4 * lum[i] - lum[i - 1] - lum[i + 1] - lum[i - w] - lum[i + w];
      lapSum += v;
      lapSq += v * v;
      n++;
    }
  const sharpness = n ? lapSq / n - (lapSum / n) ** 2 : 0;

  // Sample each sticker from its inner area (avoid the black borders).
  const samples: RGB[] = [];
  const uniformity: number[] = [];
  const cw = w / 3;
  const ch = h / 3;
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) {
      const x0 = Math.floor(c * cw + cw * 0.3);
      const x1 = Math.floor(c * cw + cw * 0.7);
      const y0 = Math.floor(r * ch + ch * 0.3);
      const y1 = Math.floor(r * ch + ch * 0.7);
      const rs: number[] = [];
      const gs: number[] = [];
      const bs: number[] = [];
      for (let y = y0; y < y1; y += 2)
        for (let x = x0; x < x1; x += 2) {
          const i = (y * w + x) * 4;
          rs.push(data[i]);
          gs.push(data[i + 1]);
          bs.push(data[i + 2]);
        }
      const med: RGB = [median(rs), median(gs), median(bs)];
      samples.push(med);

      // Spread in Lab around the median: high = glare, shadow edge or misaligned grid.
      const mLab = rgbToLab(med);
      let spread = 0;
      for (let k = 0; k < rs.length; k++) {
        const lab = rgbToLab([rs[k], gs[k], bs[k]]);
        spread += (lab[0] - mLab[0]) ** 2 + (lab[1] - mLab[1]) ** 2 + (lab[2] - mLab[2]) ** 2;
      }
      spread = Math.sqrt(spread / Math.max(1, rs.length));
      uniformity.push(Math.max(0, Math.min(1, 1 - spread / (LIMITS.unevenSpread * 2))));
    }

  const issues: QualityIssue[] = [];
  if (brightness < LIMITS.darkError) issues.push({ severity: "error", message: "The photo is too dark. Add light or move closer to a window." });
  else if (brightness < LIMITS.darkWarn) issues.push({ severity: "warning", message: "The photo is a bit dark; colours may be misread." });

  if (clipped > LIMITS.clippedError) issues.push({ severity: "error", message: "Strong glare or overexposure. Tilt the cube slightly or avoid direct light." });
  else if (clipped > LIMITS.clippedWarn) issues.push({ severity: "warning", message: "Some glare is visible on the stickers." });

  if (sharpness < LIMITS.blurError) issues.push({ severity: "error", message: "The photo is blurry. Hold the phone steady and let it focus." });
  else if (sharpness < LIMITS.blurWarn) issues.push({ severity: "warning", message: "The photo is slightly blurry." });

  const uneven = uniformity.filter((u) => u < 0.5).length;
  if (uneven >= 3) issues.push({ severity: "error", message: `${uneven} stickers don't line up with the grid or have reflections. Fit the cube exactly inside the grid.` });
  else if (uneven > 0) issues.push({ severity: "warning", message: `${uneven} sticker${uneven > 1 ? "s look" : " looks"} uneven (reflection or slightly off the grid).` });

  return { samples, uniformity, sharpness, brightness, clipped, issues };
}
