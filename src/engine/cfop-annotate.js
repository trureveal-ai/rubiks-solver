// ── CFOP-style annotation of the Kociemba solution ────────────────────────
// Agent G, Wave 3 — item #28.
//
// IMPORTANT / HONEST FRAMING:
// The default solution is produced by the Kociemba TWO-PHASE algorithm, which
// is near-optimal and does NOT build the cube the way a human CFOP solver does
// (Cross → F2L → OLL → PLL). So we cannot extract genuine CFOP phases from it.
//
// What we CAN do is give a faithful CFOP-*style* reading using the one real
// structural boundary the two-phase output provides:
//   • Phase 1 reduces the cube to the G1 subgroup ⟨U,D,R2,L2,F2,B2⟩.
//     This "get everything into position/orientation" work loosely parallels
//     the CFOP job of building the first two layers (Cross + F2L).
//   • Phase 2 solves the cube within G1 — loosely the CFOP last-layer job
//     (OLL + PLL).
// We label the two groups with their CFOP counterparts and say plainly that
// this is a mapping, not a literal CFOP solve.

/**
 * @param {{steps:{move:string, phase:number}[], totalMoves:number}} solution
 * @returns {{ groups, totalMoves, phaseBoundary, isApproximate:true, disclaimer }}
 */
export function cfopAnnotate(solution) {
  const steps = solution?.steps || [];
  const realSteps = steps.filter((s) => s.move);

  const phase1 = realSteps.filter((s) => s.phase === 1).map((s) => s.move);
  const phase2 = realSteps.filter((s) => s.phase === 2).map((s) => s.move);

  const groups = [
    {
      title: "Cross + F2L",
      cfopPhases: ["Cross", "F2L"],
      source: "Kociemba Phase 1 — reduction to ⟨U,D,R2,L2,F2,B2⟩",
      color: "var(--orange)",
      moves: phase1,
      moveCount: phase1.length,
      explain:
        "In CFOP a solver first builds the white Cross, then pairs up and inserts the four First-Two-Layers slots. " +
        "The optimal two-phase solver instead spends its first phase reducing the whole cube into the G1 subgroup — " +
        "the bulk of the \"get the pieces where they belong\" work — so we map Phase 1 onto Cross + F2L.",
    },
    {
      title: "OLL + PLL",
      cfopPhases: ["OLL", "PLL"],
      source: "Kociemba Phase 2 — solve within G1",
      color: "var(--blue)",
      moves: phase2,
      moveCount: phase2.length,
      explain:
        "CFOP finishes with OLL (Orient the Last Layer so the top face is one color) then PLL (Permute the Last Layer " +
        "into place). The two-phase solver's second phase finishes the solve using only ⟨U,D,R2,L2,F2,B2⟩ turns, which " +
        "we map onto that last-layer OLL + PLL work.",
    },
  ].filter((g) => g.moveCount > 0);

  return {
    groups,
    totalMoves: realSteps.length,
    phaseBoundary: phase1.length,
    isApproximate: true,
    disclaimer:
      "This is a CFOP-style reading of the near-optimal Kociemba solution, not a genuine CFOP solve. " +
      "The two-phase algorithm doesn't build the cube layer by layer, so moves are grouped by Kociemba's " +
      "Phase 1 / Phase 2 boundary and mapped onto the CFOP stages they most resemble.",
  };
}
