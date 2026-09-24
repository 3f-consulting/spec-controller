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

const DUPLICATE_LINE =
  "A duplicated @SCN code is not listed here: it is reported on its account's rows, as `duplicate-scn-code`.";

/** The section's first statement: the clean line, or the error count. */
function statementOf(md: string): string {
  const section = md.slice(md.indexOf("## Scenario code errors"));
  return section.split("\n\n")[1] ?? "";
}

/** The number the statement puts before `noun`, or undefined when it states none. */
function countBefore(statement: string, noun: string): number | undefined {
  const match = new RegExp(`(\\d+) ${noun}s?\\b`).exec(statement);
  return match ? Number(match[1]) : undefined;
}

describe("[SCN-STG-021] clean scenario codes are stated with the corpus's own count of feature files and of feature codes", () => {
  // Every population here has counts that differ, save the last, so a sentence that states one
  // count for both is caught (3F-3666).
  const populations = [
    { featureFiles: 3, featureCodes: 2 },
    { featureFiles: 1, featureCodes: 0 },
    { featureFiles: 2, featureCodes: 1 },
    { featureFiles: 2, featureCodes: 2 },
  ];

  for (const population of populations) {
    it(`states the codes clean over ${population.featureFiles} files carrying ${population.featureCodes} codes`, () => {
      const md = renderMarkdown({ ...balancedWith([]), scenarioCodePopulation: population }, ctx);
      const statement = statementOf(md);
      expect(statement).toMatch(/\bclean\b/);
      expect(countBefore(statement, "feature file")).toBe(population.featureFiles);
      expect(countBefore(statement, "feature code")).toBe(population.featureCodes);
      expect(md).toContain(DUPLICATE_LINE);
      expect(md).toContain("**BALANCED**");
    });
  }

  it("states no counts for a report saved before the population was recorded", () => {
    const statement = statementOf(renderMarkdown(balancedWith([]), ctx));
    expect(statement).toMatch(/\bclean\b/);
    expect(countBefore(statement, "feature file")).toBeUndefined();
    expect(countBefore(statement, "feature code")).toBeUndefined();
  });

  it("says where a duplicate is reported beside the errors too", () => {
    expect(renderMarkdown(balancedWith([FOREIGN]), ctx)).toContain(DUPLICATE_LINE);
  });

  it("says nothing when no corpus was judged", () => {
    const { scenarioCodeErrors: _judged, ...unjudged } = balancedWith([]);
    expect(renderMarkdown(unjudged, ctx)).not.toContain("## Scenario code errors");
  });
});

describe("[SCN-STG-023] a corpus with no feature file is never stated clean", () => {
  it("says no feature file was judged, stating no code clean and no count", () => {
    const md = renderMarkdown({ ...balancedWith([]), scenarioCodePopulation: { featureFiles: 0, featureCodes: 0 } }, ctx);
    const statement = statementOf(md);
    expect(statement).not.toMatch(/\bclean\b/);
    expect(countBefore(statement, "feature file")).toBeUndefined();
    expect(countBefore(statement, "feature code")).toBeUndefined();
    expect(statement).toMatch(/\bno feature file\b/i);
    expect(md).toContain(DUPLICATE_LINE);
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
