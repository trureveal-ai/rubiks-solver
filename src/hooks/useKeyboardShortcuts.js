import { useEffect } from "react";
import { PHASES } from "../state/phaseMachine.js";

// Solution-playback keyboard shortcuts. Only active during the solution phase.
//   ← / →        step back / forward
//   Space        play / pause
//   Home / End   jump to start / end
//   Ctrl/⌘ Z     undo (step back), Ctrl/⌘ Shift Z   redo (step forward)
export default function useKeyboardShortcuts({ anim, solution, phase }) {
  useEffect(() => {
    const handler = (e) => {
      if (phase !== PHASES.SOLUTION || !solution) return;
      // Don't capture if user is typing in an input
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      const total = solution.steps.length;
      // Undo/redo: Ctrl+Z / Ctrl+Shift+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (anim.step > 0 && anim.pendingStep === null) {
          anim.setPlayingSync(false);
          anim.goStep(anim.step - 1);
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (anim.step < total && anim.pendingStep === null) {
          anim.setPlayingSync(false);
          anim.goStep(anim.step + 1);
        }
        return;
      }

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          if (anim.step < total && anim.pendingStep === null) {
            anim.setPlayingSync(false);
            anim.goStep(anim.step + 1);
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (anim.step > 0 && anim.pendingStep === null) {
            anim.setPlayingSync(false);
            anim.goStep(anim.step - 1);
          }
          break;
        case " ":
          e.preventDefault();
          if (anim.step < total) {
            if (!anim.playing) { anim.setPlayingSync(true); anim.goStep(anim.step + 1); }
            else { anim.setPlayingSync(false); }
          }
          break;
        case "Home":
          e.preventDefault();
          anim.setPlayingSync(false);
          anim.goStep(0);
          break;
        case "End":
          e.preventDefault();
          anim.setPlayingSync(false);
          anim.goStep(total);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [anim, solution, phase]);
}
