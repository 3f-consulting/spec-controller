/**
 * Unit tests for the scenario ⟷ sub-issue gate decision (the @unit floor of
 * spec-controller's OWN light gate coverage — ported from an earlier internal tool, kept
 * light; NOT a wholesale port of the source gate-test corpus).
 *
 * Bidirectional evidence: the describe/it strings carry the @SCN-SSM-NNN id
 * matching features/scenario-sub-issue-match.feature.
 *
 * Parent: 3F-1137 (the port + fork-exemption design).
 */

import { describe, it, expect } from "vitest";
import {
  attributeChangedBlockCites,
  changedLinesByFile,
  decideScnGate,
  parseCitedCodesInSource,
  parseTestBlocks,
  type ScnGateInput,
} from "./scnSubIssueGate.js";

function baseInput(overrides: Partial<ScnGateInput> = {}): ScnGateInput {
  return {
    addedCodes: [],
    updatedCodes: [],
    deletedCodes: [],
    renumberPairs: [],
    exemptions: [],
    unitEquivalentBehaviourBearing: false,
    unitEquivalentCitedCodes: [],
    uncitedChangedTestBlocks: [],
    hasTicketHandle: false,
    isExternalPr: false,
    ...overrides,
  };
}

describe("[SCN-SSM-001] a behaviour-bearing change on a ticketed internal PR passes the gate", () => {
  it("passes an added scenario code when the PR carries a ticket handle and is not external", () => {
    const result = decideScnGate(
      baseInput({ addedCodes: ["SCN-LDG-001"], hasTicketHandle: true, isExternalPr: false })
    );
    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });
});

describe("[SCN-SSM-002] a behaviour-bearing change on an internal PR with no ticket handle reds the gate", () => {
  it("reds an added scenario code when the PR carries no ticket handle and is not external, naming the unbound code", () => {
    const result = decideScnGate(
      baseInput({ addedCodes: ["SCN-LDG-002"], hasTicketHandle: false, isExternalPr: false })
    );
    expect(result.ok).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    const violation = result.violations[0]!;
    expect(violation.kind).toBe("missing-ticket-handle");
    expect(violation.code).toBe("SCN-LDG-002");
    // The violation NAMES the unbound code (the bidirectional teeth).
    expect(violation.message).toContain("SCN-LDG-002");
  });
});

describe("[SCN-SSM-003] a fork-sourced external PR is exempt from the gate", () => {
  it("exempts a behaviour-bearing added code with no ticket handle when the PR is external (fork)", () => {
    const result = decideScnGate(
      baseInput({ addedCodes: ["SCN-LDG-003"], hasTicketHandle: false, isExternalPr: true })
    );
    // The exemption: a fork PR is skipped regardless of the missing handle.
    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("still reds the SAME no-handle change on an INTERNAL PR — fork status is the only exemption (teeth intact)", () => {
    const result = decideScnGate(
      baseInput({ addedCodes: ["SCN-LDG-003"], hasTicketHandle: false, isExternalPr: false })
    );
    expect(result.ok).toBe(false);
    expect(result.violations[0]!.kind).toBe("missing-ticket-handle");
  });
});

describe("[SCN-SSM-004] the cite check reads the checked-out test files, not the diff", () => {
  it("reads a cite off a plain describe line — no diff marker, because file state has none", () => {
    const source = [
      'import { describe, it, expect } from "vitest";',
      "",
      'describe("[SCN-API-001] the summary tally", () => {',
      '  it("counts the reconciliations", () => {',
      "    expect(makeSummary().scenarioReconciliations).toBe(1);",
      "  });",
      "});",
    ].join("\n");

    // The 3F-1741 fix: in live file content the cite carries NO leading +/-, so a
    // scanner that requires a diff marker sees nothing. This one reads it.
    expect(parseCitedCodesInSource(source)).toEqual(["SCN-API-001"]);
  });

  it("reads a cite off an it line, in the bare [SCN-…] and the @SCN-… form alike", () => {
    const source = [
      'it("[SCN-LDG-002] posts the suspense item", () => {});',
      'it("@SCN-LDG-003 balances the ledger", () => {});',
    ].join("\n");

    expect(parseCitedCodesInSource(source)).toEqual(["SCN-LDG-002", "SCN-LDG-003"]);
  });

  it("skips a code embedded in a quoted string literal — the guard's own fixtures are test data, not cites", () => {
    // A static check fixture holding diff text as data. Scanning file state rather than a
    // diff widens what the scanner reads, so this exclusion has to keep holding.
    const source = [
      "const diffFixture = [",
      '  "+describe(\\"[SCN-FIX-001] a fixture, not a cite\\", () => {});",',
      "].join(\"\\n\");",
    ].join("\n");

    expect(parseCitedCodesInSource(source)).toEqual([]);
  });

  it("returns no codes for a test file that cites none", () => {
    const source = [
      'describe("the summary tally", () => {',
      '  it("counts the reconciliations", () => {});',
      "});",
    ].join("\n");

    expect(parseCitedCodesInSource(source)).toEqual([]);
  });
});

describe("[SCN-SSM-005] a changed test block carries its own cite — a sibling's does not vouch for it", () => {
  /**
   * A test file in the repo's own idiom: the cite sits on the `describe`, and the
   * `it`s beneath inherit it. A SECOND, uncited block sits alongside — the sibling
   * whose cite must not travel.
   */
  const source = [
    'import { describe, it, expect } from "vitest";', // 1
    "", // 2
    'describe("[SCN-API-001] the tally", () => {', // 3
    '  it("counts", () => {', // 4
    "    expect(tally()).toBe(1);", // 5
    "  });", // 6
    "});", // 7
    "", // 8
    'describe("the doubling", () => {', // 9
    '  it("doubles the tally", () => {', // 10
    "    expect(doubled()).toBe(2);", // 11
    "  });", // 12
    "});", // 13
  ].join("\n");

  it("binds a cite to the block it annotates and inherits it down the ancestor chain", () => {
    const blocks = parseTestBlocks(source);

    const countsBlock = blocks.find((b) => b.title === "counts");
    // The `it` carries no cite of its own — it INHERITS the describe's. This is the
    // repo's convention (148 describe-cites vs 7 on it), so inheritance is forced.
    expect(countsBlock?.citedCodes).toEqual(["SCN-API-001"]);
    expect(countsBlock?.chain).toEqual(["[SCN-API-001] the tally", "counts"]);
    expect(countsBlock?.isLeaf).toBe(true);

    const doublesBlock = blocks.find((b) => b.title === "doubles the tally");
    // The sibling's cite does NOT reach across into this chain.
    expect(doublesBlock?.citedCodes).toEqual([]);
    expect(doublesBlock?.startLine).toBe(10);
  });

  it("reads the touched new-file line numbers out of the diff's hunk headers", () => {
    const diff = [
      "diff --git a/packages/pkg/src/tally.test.ts b/packages/pkg/src/tally.test.ts",
      "--- a/packages/pkg/src/tally.test.ts",
      "+++ b/packages/pkg/src/tally.test.ts",
      "@@ -7,3 +7,9 @@",
      " });",
      " ",
      '+describe("the doubling", () => {',
      '+  it("doubles the tally", () => {',
      "+    expect(doubled()).toBe(2);",
      "+  });",
      "+});",
    ].join("\n");

    // Hunk starts at new-file line 7; the two context lines are 7 and 8, so the five
    // added lines are 9-13. The diff is the CHANGE-DETECTOR — this is how we learn
    // WHICH blocks the PR actually touched.
    expect(changedLinesByFile(diff).get("packages/pkg/src/tally.test.ts")).toEqual([
      9, 10, 11, 12, 13,
    ]);
  });

  it("reds a touched block whose whole ancestor chain carries no cite — shape (b), the hole", () => {
    // The PR added the second describe (lines 9-13) and touched nothing else.
    const result = attributeChangedBlockCites(source, [9, 10, 11, 12, 13]);

    // The uncited block is NAMED by its chain, so the engineer knows what to fix.
    expect(result.uncitedBlocks).toEqual(["the doubling > doubles the tally"]);
    // The sibling's cite is NOT counted as vouching for the touched block.
    expect(result.citedCodes).toEqual([]);
  });

  it("passes a touched block that INHERITS its cite from an enclosing describe — shape (a), by design", () => {
    // Operator ruling (2026-07-14): a new `it` inside a cited `describe` inherits that
    // cite and is claiming that scenario. That is the convention working, not a hole —
    // this arm PINS it green so a future tightening cannot silently reject it.
    const result = attributeChangedBlockCites(source, [4, 5, 6]);

    expect(result.uncitedBlocks).toEqual([]);
    expect(result.citedCodes).toEqual(["SCN-API-001"]);
  });

  it("reds the gate when a changed test block cites nothing, even on a ticketed PR", () => {    const result = decideScnGate(
      baseInput({
        unitEquivalentBehaviourBearing: true,
        unitEquivalentCitedCodes: ["SCN-API-001"],
        uncitedChangedTestBlocks: ["the doubling > doubles the tally"],
        // The handle must not rescue an uncited BLOCK, just as it never rescued an
        // uncited FILE — being on a ticket proves a live work-unit, not which scenario.
        hasTicketHandle: true,
      })
    );

    expect(result.ok).toBe(false);
    const violation = result.violations[0]!;
    expect(violation.kind).toBe("uncited-unit-equivalent");
    expect(violation.message).toContain("the doubling > doubles the tally");
  });
});

describe("[SCN-SSM-007] a describe whose title carries braces stays open over the its beneath it", () => {
  /**
   * The two brace-carrying title forms, side by side. Both are written here as
   * quoted fixture LINES, so the scanner reads them as data rather than as this
   * file's own cites — the same convention the SSM-004 fixture relies on.
   */
  const templateLiteralTitle = [
    'import { describe, it, expect } from "vitest";', // 1
    "", // 2
    "const suite = \"the tally\";", // 3
    "describe(`[SCN-API-001] ${suite}`, () => {", // 4
    '  it("counts", () => {', // 5
    "    expect(tally()).toBe(1);", // 6
    "  });", // 7
    "});", // 8
  ].join("\n");

  const quotedBraceTitle = [
    'describe("[SCN-RMG-001] planKeptRun: the paths from { storeRoot, target, runId }", () => {', // 1
    '  it("nests the run dir", () => {', // 2
    "    expect(planKeptRun(input).runDir).toBe(expected);", // 3
    "  });", // 4
    "});", // 5
  ].join("\n");

  it("keeps the describe open past a template-literal interpolation in its title", () => {
    const blocks = parseTestBlocks(templateLiteralTitle);

    const describeBlock = blocks.find((b) => b.startLine === 4);
    // Counting raw characters closed this block on line 4: the `${` and `}` of the
    // interpolation net out before the arrow's `{` ever opens the body.
    expect(describeBlock?.endLine).toBe(8);
    expect(describeBlock?.isLeaf).toBe(false);
  });

  it("reads the it beneath a template-literal-titled describe as carrying the describe's cite", () => {
    const countsBlock = parseTestBlocks(templateLiteralTitle).find((b) => b.title === "counts");

    expect(countsBlock?.citedCodes).toEqual(["SCN-API-001"]);
    expect(countsBlock?.chain).toEqual(["[SCN-API-001] ${suite}", "counts"]);
  });

  it("does the same for a plain-quoted title that names an object shape", () => {
    // Not a hypothetical form: this is keptRun.test.ts's real title, and its three
    // its were parsing as uncited top-level blocks before this fix.
    const blocks = parseTestBlocks(quotedBraceTitle);

    const describeBlock = blocks[0];
    expect(describeBlock?.endLine).toBe(5);
    expect(describeBlock?.isLeaf).toBe(false);

    const nestsBlock = blocks.find((b) => b.title === "nests the run dir");
    expect(nestsBlock?.citedCodes).toEqual(["SCN-RMG-001"]);
  });

  it("reports no uncited block when the touched it sits under a brace-titled cited describe", () => {
    // The whole point at the gate's boundary: touching lines 5-7 (the `it`) must not
    // be read as a violation, because the cite is one line above the it's own.
    const result = attributeChangedBlockCites(templateLiteralTitle, [5, 6, 7]);

    expect(result.uncitedBlocks).toEqual([]);
    expect(result.citedCodes).toEqual(["SCN-API-001"]);
  });

  it("still reds a touched block whose brace-titled ancestor carries no cite — SSM-005's teeth intact", () => {
    const uncitedAncestor = [
      "describe(`${suite} the doubling`, () => {", // 1
      '  it("doubles the tally", () => {', // 2
      "    expect(doubled()).toBe(2);", // 3
      "  });", // 4
      "});", // 5
    ].join("\n");

    // Finding the ancestor chain is not the same as excusing it. An open-but-uncited
    // describe still leaves its it with an empty chain, which is the violation.
    const result = attributeChangedBlockCites(uncitedAncestor, [2, 3, 4]);

    expect(result.uncitedBlocks).toEqual(["${suite} the doubling > doubles the tally"]);
    expect(result.citedCodes).toEqual([]);
  });
});
