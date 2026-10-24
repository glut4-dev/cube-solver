export type RGB = [number, number, number];
export type Lab = [number, number, number];

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function rgbToLab([r, g, b]: RGB): Lab {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X);
  const fy = f(Y);
  const fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/**
 * Colour distance tuned for cube stickers: lightness counts less than hue,
 * because shadows change lightness much more than they change colour.
 */
export function labDistance(a: Lab, b: Lab): number {
  const dL = (a[0] - b[0]) * 0.6;
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

/** Reference sticker colours (typical cube plastic) for a sanity check on centres. */
export const REFERENCE_RGB: Record<string, RGB> = {
  white: [235, 235, 235],
  yellow: [240, 220, 30],
  red: [200, 20, 30],
  orange: [255, 120, 20],
  green: [0, 160, 70],
  blue: [0, 70, 180],
};

export function nearestReference(rgb: RGB): string {
  const lab = rgbToLab(rgb);
  let best = "";
  let bestD = Infinity;
  for (const [name, ref] of Object.entries(REFERENCE_RGB)) {
    const d = labDistance(lab, rgbToLab(ref));
    if (d < bestD) {
      bestD = d;
      best = name;
    }
  }
  return best;
}
