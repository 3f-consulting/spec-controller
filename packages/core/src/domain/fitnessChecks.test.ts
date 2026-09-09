/**
 * @unit for @SCN-LNT-018 — the other half of the converted route: the CONFIGURED ROWS arriving as
 * data, read from a target's manifest into the index the obligation rule takes.
 *
 * AND FOR @SCN-LNT-019 — the BAR half of the same reading: whether a row carries one at all, which
 * is the whole of what says a converted check is measured rather than static. It belongs here
 * rather than beside the obligation rule because it is a fact about the ROW; what the rule then
 * does with it is pinned in parse/convertedFitnessObligations.test.ts.
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
import {
  fitnessChecksOf,
  carriesBar,
  type FitnessCheck,
} from "./fitnessChecks.js";
import { resolveFitnessChecks, type KillFloorReader } from "../parse/targetManifest.js";

/**
 * A reader over a target with no record to source a gate from — the injected argument every
 * resolution below takes, answering the one thing a reader can answer besides a number.
 */
const NO_RECORD: KillFloorReader = () => null;

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
    // A manifest written by hand will sooner or later carry the sigils — the stance `thresholdsOf`
    // and `checkRegistryOf` already take, and the lookup is bare on both sides.
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
        },
        NO_RECORD
      ),
    ]).toEqual([["SCN-AAA-001", { characteristic: "complexity" }]]);
  });

  it("resolves empty for a manifest that configures none — inert on an unconverted target", () => {
    expect([...resolveFitnessChecks({}, NO_RECORD)]).toEqual([]);
    expect([...resolveFitnessChecks({ specController: {} }, NO_RECORD)]).toEqual([]);
  });
});

describe("[SCN-LNT-019] the row's SHAPE says which kind of check it is", () => {
  it("holds the bar a floor row names, whole and with its direction", () => {
    // THE WHOLE BAR, not its number picked out (@SCN-MUT-001): the direction is half of the bar and
    // a reader that only knew to copy the number would drop it in transit.
    expect([
      ...fitnessChecksOf([
        { scn: "SCN-AAA-007", characteristic: "mutation", command: "pnpm mutation:score", atLeast: 90 },
      ]),
    ]).toEqual([
      ["SCN-AAA-007", { characteristic: "mutation", bar: { threshold: 90, atLeast: true } }],
    ]);
  });

  it("holds a ceiling row's bar sparsely — the number, and no direction beside it", () => {
    expect([...fitnessChecksOf([{ scn: "SCN-AAA-005", characteristic: "ci-run-time", atMost: 75 }])]).toEqual([
      ["SCN-AAA-005", { characteristic: "ci-run-time", bar: { threshold: 75 } }],
    ]);
  });

  it("leaves a row naming no bar carrying none at all — the static case, and it is the shape that says so", () => {
    // No type field and no second tag: what makes this row static is that it names no bar, which is
    // the discrimination `thresholdsOf` has always made.
    expect([...fitnessChecksOf([{ scn: "SCN-AAA-001", characteristic: "complexity", command: "eslint" }])]).toEqual([
      ["SCN-AAA-001", { characteristic: "complexity" }],
    ]);
  });

  it("keeps a row MEASURED though the bar it names is one nothing can read", () => {
    // The loud shape. A row that named a bar and authored none this can read is measured with
    // nothing to hold it to — reported by the missing-bar arm (@SCN-CIP-002) rather than sent down
    // the static route to be reported as a check nobody wrote.
    for (const authored of ["ninety", { mutationGate: "domain" }, Number.NaN, -1, null, [90]]) {
      expect([...fitnessChecksOf([{ scn: "SCN-AAA-007", characteristic: "mutation", atLeast: authored }])]).toEqual([
        ["SCN-AAA-007", { characteristic: "mutation", bar: null }],
      ]);
    }
  });

  it("reads a bar naming a mutation gate as the number that gate's record implies", () => {
    // THE ROW IS THE SECOND PLACE A TARGET CAN AUTHOR A BAR, so it is the second place the
    // substitution @SCN-MUT-012 rules for `specController.thresholds` has to happen — through the
    // SAME injected reader, at the app edge, before the engine's own reading of the row. What the
    // engine sees is the number it has always taken; the arm above pins that the ENGINE alone,
    // handed the reference, still reads it as a bar it cannot read.
    expect([
      ...resolveFitnessChecks(
        {
          specController: {
            fitnessChecks: [
              {
                scn: "SCN-AAA-007",
                characteristic: "mutation",
                command: "pnpm --silent mutation:score",
                atLeast: { mutationGate: "domain" },
              },
            ],
          },
        },
        () => 699
      ),
    ]).toEqual([
      ["SCN-AAA-007", { characteristic: "mutation", bar: { threshold: 699, atLeast: true } }],
    ]);
  });

  it("leaves a gate reference nothing can source as NO BAR, never as a number of the edge's own", () => {
    // @SCN-MUT-013's stance, reached on this route too: the row stays MEASURED with nothing to hold
    // it to, so the complaint arrives from the missing-bar arm about a bar nobody authored rather
    // than from a bar the edge picked.
    expect([
      ...resolveFitnessChecks(
        {
          specController: {
            fitnessChecks: [
              { scn: "SCN-AAA-007", characteristic: "mutation", atLeast: { mutationGate: "domain" } },
            ],
          },
        },
        NO_RECORD
      ),
    ]).toEqual([["SCN-AAA-007", { characteristic: "mutation", bar: null }]]);
  });

  it("keeps a row naming BOTH directions measured, and holds it to neither", () => {
    // Two directions at once is a contradiction rather than more information — whichever key were
    // read first would silently settle it — so the row is measured and the bar is nothing.
    expect([
      ...fitnessChecksOf([{ scn: "SCN-AAA-007", characteristic: "mutation", atLeast: 90, atMost: 95 }]),
    ]).toEqual([["SCN-AAA-007", { characteristic: "mutation", bar: null }]]);
  });
});

describe("[SCN-LNT-019] ONE predicate answers `does this row carry a bar`", () => {
  function rowFor(entry: Record<string, unknown>): FitnessCheck {
    const row = fitnessChecksOf([
      { scn: "SCN-AAA-007", characteristic: "mutation", ...entry },
    ]).get("SCN-AAA-007");
    expect(row).toBeDefined();
    return row as FitnessCheck;
  }

  it("answers yes for a bar it read and yes for a bar it could not, and no only where none was named", () => {
    // ONE SPELLING, because the debit reads it to raise a measured obligation and the credit reads
    // it to skip the fitness-report credit. Two spellings and the two sides grow separate opinions
    // of one fact — and the row whose bar nothing can read is exactly where they would first differ.
    expect(carriesBar(rowFor({ atLeast: 90 }))).toBe(true);
    expect(carriesBar(rowFor({ atMost: 75 }))).toBe(true);
    expect(carriesBar(rowFor({ atLeast: "ninety" }))).toBe(true);
    expect(carriesBar(rowFor({ atLeast: 90, atMost: 95 }))).toBe(true);
    expect(carriesBar(rowFor({}))).toBe(false);
    expect(carriesBar(rowFor({ command: "eslint" }))).toBe(false);
  });
});
