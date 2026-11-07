import { describe, it, expect } from "vitest";
import { moveToSpeech, speechSupported } from "./useVoiceGuide.js";

describe("moveToSpeech", () => {
  it("speaks a plain face turn as the bare letter", () => {
    expect(moveToSpeech("R")).toBe("R");
    expect(moveToSpeech("U")).toBe("U");
    expect(moveToSpeech("L")).toBe("L");
  });

  it("speaks a prime (counter-clockwise) move as '<face> prime'", () => {
    expect(moveToSpeech("R'")).toBe("R prime");
    expect(moveToSpeech("F'")).toBe("F prime");
  });

  it("speaks a double (180°) move as '<face> two'", () => {
    expect(moveToSpeech("U2")).toBe("U two");
    expect(moveToSpeech("D2")).toBe("D two");
  });

  it("covers every face letter", () => {
    expect(moveToSpeech("D")).toBe("D");
    expect(moveToSpeech("F")).toBe("F");
    expect(moveToSpeech("B")).toBe("B");
  });

  it("joins a multi-token group", () => {
    expect(moveToSpeech("R U'")).toBe("R, U prime");
  });

  it("trims surrounding whitespace", () => {
    expect(moveToSpeech("  R2  ")).toBe("R two");
  });

  it("returns an empty string for empty, nullish, or unknown input", () => {
    expect(moveToSpeech("")).toBe("");
    expect(moveToSpeech("   ")).toBe("");
    expect(moveToSpeech(null)).toBe("");
    expect(moveToSpeech(undefined)).toBe("");
    expect(moveToSpeech(42)).toBe("");
    expect(moveToSpeech("X")).toBe("");
  });
});

describe("speechSupported", () => {
  it("is false in a non-DOM (node) environment with no window", () => {
    // vitest runs these in the `node` environment — window is undefined here.
    expect(speechSupported()).toBe(false);
  });
});
