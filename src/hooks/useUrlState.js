import { useCallback } from "react";

// ── URL state sharing ────────────────────────────────────────────────────────
// Encode the 54 facelets into a compact, dependency-free string carried in a
// `?cube=` query param so a cube can be shared via link and restored on load.
//
// Encoding: 54 facelets, each one of 6 colors. Three facelets pack into one byte
// (6³ = 216 < 256) → 18 bytes → base64url (~24 chars). Face and color orderings
// are kept LOCAL (not imported from cube.js) so the share format stays stable
// even if display constants change elsewhere.

const PARAM = "cube";
const FACES = ["U", "R", "F", "D", "L", "B"];
const COLORS = ["W", "Y", "R", "O", "B", "G"];
const COLOR_INDEX = Object.fromEntries(COLORS.map((c, i) => [c, i]));

function bytesToBase64Url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(str) {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Cube → compact code, or null if the cube isn't a well-formed 6×9 color grid.
export function encodeCube(cube) {
  const idx = [];
  for (const f of FACES) {
    const face = cube?.[f];
    if (!Array.isArray(face) || face.length !== 9) return null;
    for (const c of face) {
      const ci = COLOR_INDEX[c];
      if (ci === undefined) return null;
      idx.push(ci);
    }
  }
  const bytes = new Uint8Array(18);
  for (let i = 0; i < 18; i++) {
    bytes[i] = idx[i * 3] * 36 + idx[i * 3 + 1] * 6 + idx[i * 3 + 2];
  }
  return bytesToBase64Url(bytes);
}

// Compact code → cube, or null if malformed. Does NOT assert solvability —
// the existing validation UI surfaces that; we only reject structural garbage.
export function decodeCube(code) {
  try {
    if (!code || !/^[A-Za-z0-9\-_]+$/.test(code)) return null;
    const bytes = base64UrlToBytes(code);
    if (bytes.length !== 18) return null;
    const idx = new Array(54);
    for (let i = 0; i < 18; i++) {
      const v = bytes[i];
      if (v > 215) return null; // out of the valid 0..215 range
      idx[i * 3] = Math.floor(v / 36);
      idx[i * 3 + 1] = Math.floor(v / 6) % 6;
      idx[i * 3 + 2] = v % 6;
    }
    const cube = {};
    let p = 0;
    for (const f of FACES) {
      const face = new Array(9);
      for (let j = 0; j < 9; j++) {
        const c = COLORS[idx[p++]];
        if (!c) return null;
        face[j] = c;
      }
      cube[f] = face;
    }
    return cube;
  } catch {
    return null;
  }
}

export default function useUrlState() {
  // Build an absolute share URL for `cube` (null if the cube can't be encoded).
  const buildShareUrl = useCallback((cube) => {
    const code = encodeCube(cube);
    if (!code) return null;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set(PARAM, code);
      return url.toString();
    } catch {
      return null;
    }
  }, []);

  // Reflect the current cube in the address bar without a navigation/reload.
  const writeCubeToUrl = useCallback((cube) => {
    const code = encodeCube(cube);
    if (!code) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set(PARAM, code);
      window.history.replaceState(null, "", url.toString());
    } catch {
      /* ignore — sharing still works via buildShareUrl */
    }
  }, []);

  // Read a cube from the current URL on load, or null if absent/malformed.
  const readInitialCube = useCallback(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get(PARAM);
      if (!code) return null;
      return decodeCube(code);
    } catch {
      return null;
    }
  }, []);

  return { buildShareUrl, writeCubeToUrl, readInitialCube };
}
