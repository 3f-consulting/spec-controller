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
 * tests/steps/fitnessReconciliation.steps.ts. The rule that CONSUMES this index is pinned next
 * door in parse/convertedFitnessObligations.test.ts; this file pins only the reading.
 */

import { describe, it, expect } from "vitest";
import { fitnessChecksOf } from "./fitnessChecks.js";
import { resolveFitnessChecks } from "../parse/targetManifest.js";

describe("[SCN-LNT-018] the configured rows read into the set of @SCNs the obligation rule takes", () => {
  it("reads each row as the @SCN it names — the characteristic a row may still carry is not read", () => {
    expect([
      ...fitnessChecksOf([
        { scn: "SCN-AAA-001", command: "eslint" },
        { scn: "SCN-AAA-007", characteristic: "mutation", command: "pnpm mutation:score" },
      ]),
    ]).toEqual(["SCN-AAA-001", "SCN-AAA-007"]);
  });

  it("keeps two rows that once shared a characteristic as two configured checks", () => {
    // The word is retired; what keys a check is its own @SCN, so two rows sharing it are two.
    expect([
      ...fitnessChecksOf([
        { scn: "SCN-AAA-012", characteristic: "ci-run-time", command: "timeout 75 vitest run" },
        { scn: "SCN-AAA-013", characteristic: "ci-run-time", command: "timeout 150 cucumber-js" },
      ]),
    ]).toEqual(["SCN-AAA-012", "SCN-AAA-013"]);
  });

  it("stores the @SCN BARE, so a row spelled the way a feature file spells it still matches", () => {
    expect([...fitnessChecksOf([{ scn: "@SCN-AAA-001" }])]).toEqual(["SCN-AAA-001"]);
  });

  it("drops a row that names no scenario, rather than throwing", () => {
    // Config is data from outside: a check that throws on a typo produces no verdict at all, which
    // is loud nowhere. A dropped row leaves its scenario unconfigured, which the corpus reports.
    expect([
      ...fitnessChecksOf([
        { characteristic: "complexity" },
        { scn: "  " },
        { scn: 7 },
        () => "not a row either",
        "not a row",
        null,
        { scn: "SCN-AAA-004" },
      ]),
    ]).toEqual(["SCN-AAA-004"]);
  });

  it("reads nothing from a value that is not a list of rows", () => {
    for (const entries of [undefined, null, "rows", 7, { "SCN-AAA-001": "complexity" }]) {
      expect([...fitnessChecksOf(entries)]).toEqual([]);
    }
  });
});

describe("[SCN-LNT-018] the rows come from the TARGET's manifest", () => {
  it("reads them from the target's own specController.fitnessChecks", () => {
    // The target's, for the reason the check registry and the ceilings are (@SCN-LNT-005): a row
    // resolved from this tool's own manifest would answer for a repository the run never read.
    expect([
      ...resolveFitnessChecks({ specController: { fitnessChecks: [{ scn: "SCN-AAA-001" }] } }),
    ]).toEqual(["SCN-AAA-001"]);
  });

  it("resolves empty for a manifest that configures none — inert on an unconverted target", () => {
    expect([...resolveFitnessChecks({})]).toEqual([]);
    expect([...resolveFitnessChecks({ specController: {} })]).toEqual([]);
  });
});
