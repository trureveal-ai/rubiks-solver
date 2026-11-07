import { describe, it, expect } from 'vitest';
import {
  hexToRgb, rgbToHsv, hueDistance,
  classifyRgb, classifyHsv, averageRgba,
  CHROMATIC, CLASSIFIER_LETTERS,
} from './color-classify.js';
import { C, PAL } from './cube.js';

// Scale an RGB toward black/white to simulate under/over-exposure.
const scale = ({ r, g, b }, k) => ({
  r: Math.max(0, Math.min(255, Math.round(r * k))),
  g: Math.max(0, Math.min(255, Math.round(g * k))),
  b: Math.max(0, Math.min(255, Math.round(b * k))),
});
// Blend an RGB toward a tint color by amount t (0..1) — simulates a color cast.
const tint = ({ r, g, b }, t, target) => ({
  r: Math.round(r * (1 - t) + target.r * t),
  g: Math.round(g * (1 - t) + target.g * t),
  b: Math.round(b * (1 - t) + target.b * t),
});

describe('hexToRgb', () => {
  it('parses canonical cube hexes', () => {
    expect(hexToRgb('#FFD600')).toEqual({ r: 255, g: 214, b: 0 });
    expect(hexToRgb('1565C0')).toEqual({ r: 21, g: 101, b: 192 });
  });
  it('rejects garbage', () => {
    expect(hexToRgb('#xyz')).toBeNull();
    expect(hexToRgb(null)).toBeNull();
    expect(hexToRgb('#FFF')).toBeNull();
  });
});

describe('rgbToHsv', () => {
  it('pure red → hue 0, full sat/val', () => {
    const { h, s, v } = rgbToHsv(255, 0, 0);
    expect(h).toBeCloseTo(0, 5);
    expect(s).toBeCloseTo(1, 5);
    expect(v).toBeCloseTo(1, 5);
  });
  it('white → zero saturation', () => {
    expect(rgbToHsv(239, 239, 239).s).toBeCloseTo(0, 5);
  });
  it('green hue near 120', () => {
    expect(rgbToHsv(0, 255, 0).h).toBeCloseTo(120, 5);
  });
});

describe('hueDistance', () => {
  it('is circular', () => {
    expect(hueDistance(350, 10)).toBeCloseTo(20, 5);
    expect(hueDistance(10, 350)).toBeCloseTo(20, 5);
    expect(hueDistance(0, 180)).toBeCloseTo(180, 5);
  });
});

describe('anchors', () => {
  it('cover the five chromatic letters', () => {
    expect(CHROMATIC.map((a) => a.letter).sort()).toEqual(['B', 'G', 'O', 'R', 'Y']);
  });
  it('CLASSIFIER_LETTERS matches PAL', () => {
    expect(CLASSIFIER_LETTERS).toEqual(PAL);
  });
});

describe('classify — exact canonical colors', () => {
  for (const letter of PAL) {
    it(`${letter} (${C[letter]}) classifies as ${letter}`, () => {
      const { r, g, b } = hexToRgb(C[letter]);
      expect(classifyRgb(r, g, b)).toBe(letter);
    });
  }
});

describe('classify — lighting-shifted variants', () => {
  for (const letter of PAL) {
    const base = hexToRgb(C[letter]);
    it(`${letter} survives dimming to 60%`, () => {
      const d = scale(base, 0.6);
      expect(classifyRgb(d.r, d.g, d.b)).toBe(letter);
    });
    it(`${letter} survives brightening to 130%`, () => {
      const b2 = scale(base, 1.3);
      expect(classifyRgb(b2.r, b2.g, b2.b)).toBe(letter);
    });
  }

  it('warm (yellowish) white stays White', () => {
    // #EFEFEF nudged toward warm bulb color.
    const warm = tint({ r: 239, g: 239, b: 239 }, 0.08, { r: 255, g: 230, b: 180 });
    expect(classifyRgb(warm.r, warm.g, warm.b)).toBe('W');
  });
  it('cool (bluish) white stays White', () => {
    const cool = tint({ r: 239, g: 239, b: 239 }, 0.08, { r: 200, g: 220, b: 255 });
    expect(classifyRgb(cool.r, cool.g, cool.b)).toBe('W');
  });
  it('dim gray (shadowed white) stays White', () => {
    expect(classifyRgb(120, 122, 121)).toBe('W');
  });

  it('red stays Red and does not bleed into orange', () => {
    // A slightly orange-shifted, dimmer red.
    expect(classifyRgb(170, 45, 40)).toBe('R');
  });
  it('orange stays Orange and is not confused with red or yellow', () => {
    expect(classifyRgb(220, 95, 10)).toBe('O'); // reddish-orange
    expect(classifyRgb(235, 120, 20)).toBe('O'); // yellowish-orange
  });
  it('vivid saturated colors are never called white', () => {
    for (const letter of ['Y', 'R', 'O', 'B', 'G']) {
      const { r, g, b } = hexToRgb(C[letter]);
      expect(classifyRgb(r, g, b)).not.toBe('W');
    }
  });
});

describe('classifyHsv threshold override', () => {
  it('respects a custom whiteSatMax', () => {
    const hsv = rgbToHsv(46, 125, 50); // green, s ~0.63
    // With an absurdly high white threshold, even green reads as white.
    expect(classifyHsv(hsv, { whiteSatMax: 0.9 })).toBe('W');
    expect(classifyHsv(hsv)).toBe('G');
  });
});

describe('averageRgba', () => {
  it('averages a uniform region', () => {
    const w = 4, h = 4;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      data[i * 4] = 100; data[i * 4 + 1] = 150; data[i * 4 + 2] = 200; data[i * 4 + 3] = 255;
    }
    expect(averageRgba(data, w, 0, 0, w, h)).toEqual({ r: 100, g: 150, b: 200 });
  });
  it('averages only the requested sub-region', () => {
    const w = 2;
    // pixels: (0,0)=red (1,0)=green (0,1)=blue (1,1)=white
    const data = new Uint8ClampedArray([
      255, 0, 0, 255, 0, 255, 0, 255,
      0, 0, 255, 255, 255, 255, 255, 255,
    ]);
    // top-left pixel only
    expect(averageRgba(data, w, 0, 0, 1, 1)).toEqual({ r: 255, g: 0, b: 0 });
  });
  it('is bounds-safe and returns black for an empty region', () => {
    const data = new Uint8ClampedArray(16);
    expect(averageRgba(data, 2, 5, 5, 6, 6)).toEqual({ r: 0, g: 0, b: 0 });
  });
  it('round-trips through the classifier (sampled blue → B)', () => {
    const { r, g, b } = hexToRgb(C.B);
    const data = new Uint8ClampedArray([r, g, b, 255]);
    const avg = averageRgba(data, 1, 0, 0, 1, 1);
    expect(classifyRgb(avg.r, avg.g, avg.b)).toBe('B');
  });
});
