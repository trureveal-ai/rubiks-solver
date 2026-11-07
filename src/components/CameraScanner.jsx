import { useState, useRef, useEffect, useCallback } from "react";
import { C, NAMES, FLABEL, initCube } from "../engine/cube.js";
import { validateCube } from "../engine/validate.js";
import { classifyRgb, averageRgba } from "../engine/color-classify.js";

// The six faces, in capture order, with the center color the user should see
// and a short orientation hint. Centers mirror initCube() in cube.js:
//   U=Yellow  R=Red  F=Blue  D=White  L=Orange  B=Green
const FACES = [
  { key: "U", center: "Y", hint: "Yellow center up, Blue face toward you" },
  { key: "F", center: "B", hint: "Blue center facing the camera, Yellow on top" },
  { key: "R", center: "R", hint: "Red center facing the camera, Yellow on top" },
  { key: "B", center: "G", hint: "Green center facing the camera, Yellow on top" },
  { key: "L", center: "O", hint: "Orange center facing the camera, Yellow on top" },
  { key: "D", center: "W", hint: "White center down-face toward you, Blue on top" },
];

// getUserMedia errors we want to explain clearly rather than crash on.
function describeCameraError(err) {
  const name = err && err.name;
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Camera permission was denied. Allow camera access in your browser, or use the PAINT tab to enter colors by hand.";
  if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError")
    return "No camera was found on this device. Use the PAINT tab to enter the cube colors by hand.";
  if (name === "NotReadableError" || name === "TrackStartError")
    return "The camera is in use by another app. Close it and try again, or use the PAINT tab.";
  return "Could not start the camera. Use the PAINT tab to enter the cube colors by hand.";
}

export default function CameraScanner({ cs }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  // supported | idle | starting | live | denied | done
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const [faceIdx, setFaceIdx] = useState(0);
  const [captured, setCaptured] = useState({}); // { U: [9 letters], ... }
  const [result, setResult] = useState(null); // { cube, errors }

  const supported =
    typeof navigator !== "undefined" &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function";

  const stopStream = useCallback(() => {
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Always release the camera when this component unmounts.
  useEffect(() => stopStream, [stopStream]);

  // Attach the stream to the <video> once the live view has mounted. The video
  // element doesn't exist during the "starting" phase, so we can't assign
  // srcObject inside startCamera — this effect runs after the element renders.
  useEffect(() => {
    if (phase !== "live") return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    video.play().catch(() => { /* interrupted play is harmless; stream is attached */ });
  }, [phase]);

  const startCamera = useCallback(async () => {
    if (!supported) return;
    setError("");
    setPhase("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      setPhase("live"); // the mount effect attaches the stream to the video element
    } catch (err) {
      stopStream();
      setError(describeCameraError(err));
      setPhase("denied");
    }
  }, [supported, stopStream]);

  // Sample the live frame into a 3×3 grid of color letters for the current face.
  const captureFace = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = canvasRef.current || (canvasRef.current = document.createElement("canvas"));
    const vw = video.videoWidth, vh = video.videoHeight;
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, vw, vh);

    // The overlay grid is a centered square covering ~70% of the shorter side.
    const side = Math.min(vw, vh) * 0.7;
    const ox = (vw - side) / 2;
    const oy = (vh - side) / 2;
    const cell = side / 3;
    const half = cell * 0.18; // sample ~36% of each cell, centered

    let imageData;
    try {
      imageData = ctx.getImageData(0, 0, vw, vh);
    } catch {
      // Tainted canvas (shouldn't happen for a same-origin getUserMedia stream).
      return;
    }
    const data = imageData.data;

    const letters = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const cx = ox + cell * (col + 0.5);
        const cy = oy + cell * (row + 0.5);
        const avg = averageRgba(
          data, vw,
          Math.round(cx - half), Math.round(cy - half),
          Math.round(cx + half), Math.round(cy + half),
        );
        letters.push(classifyRgb(avg.r, avg.g, avg.b));
      }
    }

    const faceKey = FACES[faceIdx].key;
    const nextCaptured = { ...captured, [faceKey]: letters };
    setCaptured(nextCaptured);

    if (faceIdx < FACES.length - 1) {
      setFaceIdx(faceIdx + 1);
    } else {
      // All six faces captured — assemble, validate, set, and show result.
      const base = initCube();
      const cube = { ...base };
      FACES.forEach((f) => { if (nextCaptured[f.key]) cube[f.key] = nextCaptured[f.key]; });
      const errors = validateCube(cube);
      cs.setCube(cube);
      setResult({ cube, errors });
      setPhase("done");
      stopStream();
    }
  }, [faceIdx, captured, cs, stopStream]);

  const restart = useCallback(() => {
    setCaptured({});
    setFaceIdx(0);
    setResult(null);
    setError("");
    startCamera();
  }, [startCamera]);

  // ── Shared styling ──────────────────────────────────────────────
  const panel = {
    background: "var(--surface-2)", border: "1px solid var(--border)",
    borderRadius: "var(--r-4)", padding: 16,
  };
  const primaryBtn = {
    background: "linear-gradient(135deg,var(--blue),var(--green))", border: "none",
    borderRadius: "var(--r-3)", padding: "12px 22px", color: "#fff",
    fontFamily: "var(--font-sans)", fontWeight: 900, fontSize: "0.85rem",
    letterSpacing: 1, cursor: "pointer",
  };
  const ghostBtn = {
    background: "transparent", border: "1px solid var(--border)",
    borderRadius: "var(--r-3)", padding: "10px 16px", color: "#888",
    fontFamily: "var(--font-sans)", fontSize: 12, letterSpacing: 1, cursor: "pointer",
  };

  // ── Unsupported ─────────────────────────────────────────────────
  if (!supported) {
    return (
      <div style={{ ...panel, textAlign: "center" }} data-testid="scan-unsupported">
        <div style={{ fontSize: 13, color: "var(--err)", letterSpacing: 1, marginBottom: 8 }}>
          📷 CAMERA NOT AVAILABLE
        </div>
        <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6 }}>
          This browser does not support camera capture (getUserMedia). Use the
          PAINT tab to enter the cube colors by hand.
        </div>
      </div>
    );
  }

  const faceColor = (letter) => C[letter] || "#444";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }} data-testid="scan-root">
      <div style={{ fontSize: 11, color: "#666", letterSpacing: 1, textAlign: "center" }}>
        Scan each face with your webcam. Center the face in the grid, then capture.
      </div>

      {/* ── Idle ── */}
      {phase === "idle" && (
        <div style={{ ...panel, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "var(--accent)", letterSpacing: 1, marginBottom: 10 }}>
            📷 CAMERA SCAN
          </div>
          <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6, marginBottom: 16 }}>
            You will capture all six faces one at a time. Good, even lighting
            gives the most accurate color reads. The result is validated before
            solving, and you can fix any sticker on the PAINT tab.
          </div>
          <button onClick={startCamera} style={primaryBtn} data-testid="scan-start">
            ▶ START CAMERA
          </button>
        </div>
      )}

      {phase === "starting" && (
        <div style={{ ...panel, textAlign: "center", color: "#888", fontSize: 12, letterSpacing: 1 }}>
          ⟳ Requesting camera…
        </div>
      )}

      {/* ── Denied / error fallback ── */}
      {phase === "denied" && (
        <div style={{ ...panel, textAlign: "center" }} data-testid="scan-error">
          <div style={{ fontSize: 13, color: "var(--err)", letterSpacing: 1, marginBottom: 8 }}>
            ⚠ CAMERA UNAVAILABLE
          </div>
          <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6, marginBottom: 14 }}>
            {error}
          </div>
          <button onClick={startCamera} style={ghostBtn}>↻ TRY AGAIN</button>
        </div>
      )}

      {/* ── Live capture ── */}
      {phase === "live" && (
        <div style={panel}>
          <div style={{ textAlign: "center", marginBottom: 10 }}>
            <span style={{
              fontSize: 12, fontWeight: 900, letterSpacing: 1,
              color: faceColor(FACES[faceIdx].center),
            }}>
              {FLABEL[FACES[faceIdx].key]} FACE ({faceIdx + 1}/6)
            </span>
            <div style={{ fontSize: 11, color: "#888", marginTop: 4, letterSpacing: 0.5 }}>
              {FACES[faceIdx].hint}
            </div>
          </div>

          <div style={{ position: "relative", width: "100%", maxWidth: 360, margin: "0 auto", aspectRatio: "1" }}>
            <video
              ref={videoRef}
              playsInline
              muted
              data-testid="scan-video"
              style={{
                width: "100%", height: "100%", objectFit: "cover",
                borderRadius: "var(--r-3)", background: "#000", display: "block",
              }}
            />
            {/* 3×3 grid overlay — centered 70% square matching the sampler. */}
            <div style={{
              position: "absolute", top: "15%", left: "15%", width: "70%", height: "70%",
              display: "grid", gridTemplateColumns: "repeat(3,1fr)", gridTemplateRows: "repeat(3,1fr)",
              pointerEvents: "none",
            }} data-testid="scan-overlay">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} style={{ border: "1.5px solid rgba(255,255,255,0.75)", boxShadow: "0 0 2px rgba(0,0,0,0.6)" }} />
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
            <button onClick={captureFace} style={primaryBtn} data-testid="scan-capture">
              📸 CAPTURE {FLABEL[FACES[faceIdx].key]}
            </button>
            <button onClick={restart} style={ghostBtn}>↻ RESTART</button>
          </div>

          {/* Progress dots */}
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 12 }}>
            {FACES.map((f, i) => (
              <div key={f.key} title={FLABEL[f.key]} style={{
                width: 10, height: 10, borderRadius: "50%",
                background: captured[f.key] ? "var(--green)" : i === faceIdx ? "var(--accent)" : "var(--border)",
                border: "1px solid var(--border-2)",
              }} />
            ))}
          </div>
        </div>
      )}

      {/* ── Result ── */}
      {phase === "done" && result && (
        <div style={panel} data-testid="scan-result">
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            {result.errors.length === 0 ? (
              <span style={{ color: "var(--green)", fontSize: 12, letterSpacing: 1, fontWeight: 900 }}>
                ✓ SCAN COMPLETE — VALID CUBE
              </span>
            ) : (
              <span style={{ color: "var(--err)", fontSize: 12, letterSpacing: 1, fontWeight: 900 }}>
                ⚠ SCANNED — NEEDS FIXES
              </span>
            )}
          </div>

          {/* Mini preview of every captured face */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginBottom: 12 }}>
            {FACES.map((f) => (
              <div key={f.key} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#888", letterSpacing: 1, marginBottom: 3 }}>{FLABEL[f.key]}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,10px)", gap: 2 }}>
                  {(result.cube[f.key] || []).map((l, i) => (
                    <div key={i} title={NAMES[l]} style={{
                      width: 10, height: 10, borderRadius: 2, background: faceColor(l),
                      border: "1px solid rgba(0,0,0,0.4)",
                    }} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {result.errors.length > 0 && (
            <div style={{
              background: "var(--err-bg)", border: "1px solid var(--err-border)",
              borderRadius: "var(--r-3)", padding: 12, marginBottom: 12,
            }}>
              <div style={{ fontSize: 11, color: "var(--err)", letterSpacing: 1, marginBottom: 6 }}>
                Fix these on the PAINT tab:
              </div>
              {result.errors.map((e, i) => (
                <div key={i} style={{ fontSize: 11, color: "var(--err-2)", marginBottom: 3 }}>• {e}</div>
              ))}
            </div>
          )}

          <div style={{ fontSize: 11, color: "#777", lineHeight: 1.6, marginBottom: 14, textAlign: "center" }}>
            The scanned cube has been loaded. Open the PAINT tab to review and
            correct any mis-read stickers before solving.
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => cs.setTab("paint")} style={primaryBtn}>✏ REVIEW IN PAINT</button>
            <button onClick={restart} style={ghostBtn}>↻ SCAN AGAIN</button>
          </div>
        </div>
      )}
    </div>
  );
}
