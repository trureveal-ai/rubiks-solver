import { useState, useCallback, useEffect, useMemo, useRef } from "react";

// ── Move → spoken-text mapping ─────────────────────────────────────
// Turns cube notation into something the speech synthesizer reads naturally:
//   "R"  → "R"        (face letter, spoken as the letter)
//   "R'" → "R prime"  (counter-clockwise)
//   "U2" → "U two"    (half turn)
// Kept as a pure, exported function so it can be unit-tested without a DOM.
const FACE_WORDS = { U: "U", D: "D", F: "F", B: "B", R: "R", L: "L" };

export function moveToSpeech(move) {
  if (!move || typeof move !== "string") return "";
  const trimmed = move.trim();
  if (!trimmed) return "";

  // A step is usually a single token, but handle a space-separated group too.
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    return tokens.map(moveToSpeech).filter(Boolean).join(", ");
  }

  const token = tokens[0];
  const faceWord = FACE_WORDS[token[0]];
  if (!faceWord) return "";

  const suffix = token.slice(1);
  if (suffix === "'") return `${faceWord} prime`;
  if (suffix === "2") return `${faceWord} two`;
  return faceWord;
}

// Feature-detect the Web Speech API. Read lazily (not at module load) so a test
// harness that injects a spy after import, and browsers without the API, both
// resolve correctly.
export function speechSupported() {
  return (
    typeof window !== "undefined" &&
    typeof window.speechSynthesis !== "undefined" &&
    typeof window.SpeechSynthesisUtterance !== "undefined"
  );
}

// ── Hook ───────────────────────────────────────────────────────────
// Exposes an `enabled` toggle and a `speakMove(move)` that speaks a single
// cube move via window.speechSynthesis. Everything no-ops gracefully (never
// throws) when the API is unavailable or voice is disabled.
export default function useVoiceGuide() {
  const supported = useMemo(() => speechSupported(), []);
  const [enabled, setEnabled] = useState(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const cancel = useCallback(() => {
    if (!supported) return;
    try {
      if (typeof window.speechSynthesis.cancel === "function") {
        window.speechSynthesis.cancel();
      }
    } catch {
      /* no-op — some engines throw if nothing is queued */
    }
  }, [supported]);

  // Speak arbitrary text. Guarded so an unavailable/throwing engine is a no-op.
  const speak = useCallback(
    (text) => {
      if (!enabledRef.current || !supported || !text) return;
      let utterance;
      try {
        utterance = new window.SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;
      } catch {
        return;
      }
      // Clear anything still queued so rapid playback doesn't pile up.
      cancel();
      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        /* no-op */
      }
    },
    [supported, cancel],
  );

  const speakMove = useCallback(
    (move) => {
      const text = moveToSpeech(move);
      if (text) speak(text);
    },
    [speak],
  );

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      if (!next) cancel(); // turning off halts any in-progress utterance
      return next;
    });
  }, [cancel]);

  // Stop any speech when the consumer unmounts.
  useEffect(() => cancel, [cancel]);

  return { supported, enabled, setEnabled, toggle, speak, speakMove, cancel };
}
