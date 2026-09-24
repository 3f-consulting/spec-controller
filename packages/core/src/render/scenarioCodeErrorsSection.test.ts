/**
 * The `## Scenario code errors` section and the verdict it forces (3F-3635), rendered from a
 * reconciliation the real `reconcile()` produced — balanced, so the only fault on it is the code
 * error the corpus carries.
 */

import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown.js";
import { evidenceReconciliationOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import type { ScenarioCodeError } from "../domain/scenarioCodeError.js";
import type { RunContext } from "../provenance/provenance.js";

const ctx: RunContext = {
  target: "scenario-code-errors-target",
  inputs: { features: "features" },
  runStart: new Date("2026-09-24T09:00:00.000Z"),
  sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
  toolSha: "13ee47f271ace511efdb2511276284b4cb50c247",
  toolVersion: "0.1.0",
};

/** A balanced reconciliation of two satisfied accounts, carrying the given code errors. */
function balancedWith(scenarioCodeErrors: readonly ScenarioCodeError[]): EvidenceReconciliation {
  const reconciliation = evidenceReconciliationOf(
    [
      { scnId: "SCN-ONE-001", evidenceObligations: [{ qualityCheck: "unit" }] },
      { scnId: "SCN-ONE-002", evidenceObligations: [{ qualityCheck: "unit" }] },
    ],
    [
      { qualityCheck: "unit", scnId: "SCN-ONE-001", status: "passed" },
      { qualityCheck: "unit", scnId: "SCN-ONE-002", status: "passed" },
    ],
    [],
    true,
    false
  );
  return { ...reconciliation, scenarioCodeErrors };
}

const FOREIGN: ScenarioCodeError = {
  kind: "foreign-scn-code",
  files: ["two.feature"],
  message: "two.feature carries the feature code @TWO, but holds the scenario @SCN-ONE-002, whose feature part names ONE.",
};

describe("[SCN-STG-011] a foreign-scn-code is listed under Scenario code errors, and the run reds", () => {
  const md = renderMarkdown(balancedWith([FOREIGN]), ctx);

  it("lists the error by its handle and message, in a section of its own", () => {
    expect(md).toContain("## Scenario code errors");
    expect(md).toContain(`- \`foreign-scn-code\` — ${FOREIGN.message}`);
  });

  it("sits before the summary views, as a caveat on every cut beneath it", () => {
    const sections = md.split("\n").filter((line) => line.startsWith("## "));
    expect(sections.indexOf("## Scenario code errors")).toBe(sections.indexOf("## Summary views") - 1);
  });

  it("gives the run a verdict of exit 1 though every account balances", () => {
    expect(md).toMatch(/\*\*SCENARIO CODE ERRORS\*\* — .*\(exit 1\)/);
    expect(md).not.toContain("**BALANCED**");
  });
});

const CLEAN_STATEMENT =
  "Scenario codes are clean — 2 feature codes, each carried by exactly one of 2 feature files, " +
  "and every coded scenario sits in the file its code names.";
const DUPLICATE_LINE =
  "A duplicated @SCN code is not listed here: it is reported on its account's rows, as `duplicate-scn-code`.";

describe("[SCN-STG-021] clean scenario codes are stated, not left blank, and a duplicated code is reported on the rows", () => {
  const featureNames = new Map([
    ["ONE", "one"],
    ["TWO", "two"],
  ]);

  it("states the codes clean with their population, and says where a duplicate is reported", () => {
    const md = renderMarkdown(balancedWith([]), ctx, undefined, featureNames);
    expect(md).toContain("## Scenario code errors");
    expect(md).toContain(CLEAN_STATEMENT);
    expect(md).toContain(DUPLICATE_LINE);
    expect(md).toContain("**BALANCED**");
  });

  it("says where a duplicate is reported beside the errors too", () => {
    expect(renderMarkdown(balancedWith([FOREIGN]), ctx, undefined, featureNames)).toContain(DUPLICATE_LINE);
  });

  it("says nothing when no corpus was judged", () => {
    const { scenarioCodeErrors: _judged, ...unjudged } = balancedWith([]);
    expect(renderMarkdown(unjudged, ctx, undefined, featureNames)).not.toContain("## Scenario code errors");
  });
});

describe("[SCN-CLI-055] an out-of-balance account and a scenario code error in one run: exit 1, both reported", () => {
  const outOfBalance: EvidenceReconciliation = {
    ...evidenceReconciliationOf(
      [
        { scnId: "SCN-ONE-001", evidenceObligations: [{ qualityCheck: "unit" }] },
        { scnId: "SCN-ONE-002", evidenceObligations: [{ qualityCheck: "unit" }] },
      ],
      [{ qualityCheck: "unit", scnId: "SCN-ONE-001", status: "passed" }],
      [],
      true,
      false
    ),
    scenarioCodeErrors: [FOREIGN],
  };
  const md = renderMarkdown(outOfBalance, ctx);
  const headline = md.split("\n").find((line) => line.startsWith("**SCENARIO CODE ERRORS**")) ?? "";

  it("heads the verdict with the scenario code error, and names the accounts out of balance too", () => {
    expect(headline).toMatch(/accounts do not agree/);
    expect(headline).toMatch(/\(exit 1\)$/);
  });

  it("lists the error and still carries the out-of-balance account", () => {
    expect(md).toContain(`- \`foreign-scn-code\` — ${FOREIGN.message}`);
    expect(md).toMatch(/\| SCN-ONE-002 \|[^\n]*out-of-balance/);
  });
});
