/**
 * @unit for @SCN-LNT-018 — the other half of the converted route: the CONFIGURED ROWS arriving as
 * data, read from a target's manifest into the index the obligation rule takes.
 *
 * THE ENDING A ROW ONCE NAMED FOR ITS COMMAND'S `I examined nothing` IS GONE (3F-3252). A skip
 * cannot mean it — the command still runs and still ends — so the field could only ever be read
 * for whether it was named, which would have forgiven every skip.
 *
 * Bidirectional evidence: the describes carry the @SCN id, matching
 * features/fitness-reconciliation.feature and the @integration steps in
 * tests/steps/lintReconciliation.steps.ts. The rule that CONSUMES this index is pinned next
 * door in parse/convertedFitnessObligations.test.ts; this file pins only the reading.
 */

import { describe, it, expect } from "vitest";
import { fitnessChecksOf } from "./fitnessChecks.js";
import { resolveFitnessChecks } from "../parse/targetManifest.js";

describe("[SCN-LNT-018] the configured rows read into the registry the obligation rule takes", () => {
  it("keys each row by the @SCN it names, holding the characteristic it asserts", () => {
    expect([
      ...fitnessChecksOf([
        { scn: "SCN-AAA-001", characteristic: "complexity", command: "eslint" },
        { scn: "SCN-AAA-007", characteristic: "mutation", command: "pnpm mutation:score" },
      ]),
    ]).toEqual([
      ["SCN-AAA-001", { characteristic: "complexity" }],
      ["SCN-AAA-007", { characteristic: "mutation" }],
    ]);
  });

  it("stores both terms BARE, so a row spelled the way a feature file spells them still matches", () => {
    // A manifest written by hand will sooner or later carry the sigils — the stance the retired
    // `thresholdsOf` took, and the lookup is bare on both sides.
    expect([...fitnessChecksOf([{ scn: "@SCN-AAA-001", characteristic: "@complexity" }])]).toEqual([
      ["SCN-AAA-001", { characteristic: "complexity" }],
    ]);
  });

  it("drops a row that names no scenario or no characteristic, rather than throwing", () => {
    // Config is data from outside: a check that throws on a typo produces no verdict at all, which
    // is loud nowhere. A dropped row leaves its scenario naming no characteristic, which the
    // corpus is where anybody notices.
    expect([
      ...fitnessChecksOf([
        { characteristic: "complexity" },
        { scn: "SCN-AAA-001" },
        { scn: "  ", characteristic: "complexity" },
        { scn: "SCN-AAA-001", characteristic: "  " },
        { scn: "SCN-AAA-001", characteristic: 7 },
        () => "not a row either",
        "not a row",
        null,
        { scn: "SCN-AAA-004", characteristic: "complexity" },
      ]),
    ]).toEqual([["SCN-AAA-004", { characteristic: "complexity" }]]);
  });

  it("reads nothing from a value that is not a list of rows", () => {
    for (const entries of [undefined, null, "rows", 7, { "SCN-AAA-001": "complexity" }]) {
      expect([...fitnessChecksOf(entries)]).toEqual([]);
    }
  });
});

describe("[SCN-LNT-018] the rows come from the TARGET's manifest", () => {
  it("reads them from the target's own specController.fitnessChecks", () => {
    // The target's, for the reason the check registry and the ceilings are (@SCN-LNT-005): a
    // characteristic means what the target says it means, and a row resolved from this tool's own
    // manifest would answer for a repository the run never read.
    expect([
      ...resolveFitnessChecks(
        {
          specController: { fitnessChecks: [{ scn: "SCN-AAA-001", characteristic: "complexity" }] },
        }
      ),
    ]).toEqual([["SCN-AAA-001", { characteristic: "complexity" }]]);
  });

  it("resolves empty for a manifest that configures none — inert on an unconverted target", () => {
    expect([...resolveFitnessChecks({})]).toEqual([]);
    expect([...resolveFitnessChecks({ specController: {} })]).toEqual([]);
  });
});
