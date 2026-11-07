// ── Camera color classification ───────────────────────────────────
// Pure, unit-testable helpers that map a sampled RGB (or HSV) value to one
// of the six cube color letters (W, Y, R, O, B, G).
//
// Strategy (robust to real-world lighting):
//   1. White is achromatic — detect it first by LOW saturation. Every other
//      cube color is vivid (saturation well above any realistic white tint).
//   2. The five chromatic colors are separated by HUE via nearest-anchor
//      matching. Hue is far more stable than raw RGB under brightness and
//      white-balance shifts, so a dim or washed-out sticker still lands on
//      the right anchor.
//
// Anchors are derived from the app's canonical C color map in cube.js, so the
// classifier stays in lock-step with how the cube is rendered.

import { C, PAL } from './cube.js';

// ── Color-space helpers ───────────────────────────────────────────

// "#RRGGBB" (or "RRGGBB") → { r, g, b } in 0..255. Returns null on garbage.
export function hexToRgb(hex) {
  if (typeof hex !== 'string') return null;
  const m = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return null;
  return {
    r: parseInt(m.slice(0, 2), 16),
    g: parseInt(m.slice(2, 4), 16),
    b: parseInt(m.slice(4, 6), 16),
  };
}

// RGB (0..255) → HSV with h in 0..360, s and v in 0..1.
export function rgbToHsv(r, g, b) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta > 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : delta / max;
  const v = max;
  return { h, s, v };
}

// Smallest absolute distance between two hues on the 0..360 circle.
export function hueDistance(a, b) {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

// ── Reference anchors (built from the canonical C map) ─────────────
// Chromatic anchors carry a hue; white is handled as the achromatic case.
// Computed once at module load so tests and the app share identical anchors.
export const CHROMATIC = ['Y', 'R', 'O', 'B', 'G'].map((letter) => {
  const { r, g, b } = hexToRgb(C[letter]);
  const { h } = rgbToHsv(r, g, b);
  return { letter, hue: h };
});

// Default thresholds. Exported so tests (and future tuning) can see/override.
export const DEFAULTS = {
  // Saturation at or below this reads as achromatic → White. Cube whites stay
  // near 0; the vivid faces sit far above (green ~0.63 is the lowest), so this
  // leaves generous headroom for a warm/cool white-balance tint on white.
  whiteSatMax: 0.32,
  // A near-black reading (shouldn't occur on a lit cube) still resolves to the
  // nearest chromatic anchor rather than being forced white.
  blackValMax: 0.12,
};

// ── Classifiers ───────────────────────────────────────────────────

// Classify an HSV triple → one of 'W','Y','R','O','B','G'.
export function classifyHsv({ h, s, v }, opts = {}) {
  const { whiteSatMax, blackValMax } = { ...DEFAULTS, ...opts };

  // Achromatic + not pure black → White.
  if (s <= whiteSatMax && v > blackValMax) return 'W';

  // Chromatic: nearest hue anchor wins.
  let best = CHROMATIC[0];
  let bestDist = Infinity;
  for (const anchor of CHROMATIC) {
    const d = hueDistance(h, anchor.hue);
    if (d < bestDist) { bestDist = d; best = anchor; }
  }
  return best.letter;
}

// Classify an RGB triple (0..255) → one of 'W','Y','R','O','B','G'.
export function classifyRgb(r, g, b, opts = {}) {
  return classifyHsv(rgbToHsv(r, g, b), opts);
}

// ── Sampling helper ───────────────────────────────────────────────
// Average the RGB of a rectangular region of a flat RGBA pixel buffer (the
// shape returned by CanvasRenderingContext2D.getImageData().data). Pure and
// bounds-safe so it can be unit-tested without a real canvas.
//   data   : Uint8ClampedArray | number[] of length width*height*4
//   width  : row stride in pixels
//   x0,y0  : inclusive top-left of the region
//   x1,y1  : exclusive bottom-right of the region
export function averageRgba(data, width, x0, y0, x1, y1) {
  let rs = 0, gs = 0, bs = 0, n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * 4;
      if (i < 0 || i + 2 >= data.length) continue;
      rs += data[i]; gs += data[i + 1]; bs += data[i + 2]; n++;
    }
  }
  if (n === 0) return { r: 0, g: 0, b: 0 };
  return { r: Math.round(rs / n), g: Math.round(gs / n), b: Math.round(bs / n) };
}

// Sanity guard: the six letters the classifier can emit, matching PAL.
export const CLASSIFIER_LETTERS = Object.freeze([...PAL]);
