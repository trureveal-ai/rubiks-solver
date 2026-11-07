import { describe, it, expect } from "vitest";
import { determineRaceResult, solverTargetMs } from "./RaceMode.jsx";

describe("determineRaceResult", () => {
  it("returns null until both times are known", () => {
    expect(determineRaceResult(null, null)).toBe(null);
    expect(determineRaceResult(5000, null)).toBe(null);
    expect(determineRaceResult(null, 5000)).toBe(null);
  });

  it("declares the user the winner when they are faster", () => {
    expect(determineRaceResult(5200, 4800)).toBe("user");
  });

  it("declares the solver the winner when it is faster", () => {
    expect(determineRaceResult(4000, 6000)).toBe("solver");
  });

  it("declares a tie on exactly equal times", () => {
    expect(determineRaceResult(5000, 5000)).toBe("tie");
  });

  it("treats a zero time as known (not missing)", () => {
    expect(determineRaceResult(0, 10)).toBe("solver");
    expect(determineRaceResult(10, 0)).toBe("user");
  });
});

describe("solverTargetMs", () => {
  it("scales linearly with move count", () => {
    expect(solverTargetMs(0)).toBe(0);
    expect(solverTargetMs(20)).toBeGreaterThan(solverTargetMs(10));
    expect(solverTargetMs(10)).toBe(solverTargetMs(20) / 2);
  });

  it("never returns a negative target", () => {
    expect(solverTargetMs(-5)).toBe(0);
  });
});
