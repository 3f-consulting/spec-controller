import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown.js";
import type { Ledger } from "../model.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { EvidenceObservation, Scenario } from "../model.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";
import { adopterReportCtx as ctx } from "./runContext.testkit.js";
import { __er } from "../evidenceReconciliation.testkit.js";

describe("[SCN-RPT-006] the markdown report groups out-of-balance scenarios by feature", () => {
  const spanning: Ledger = reconcile(
    [
      { scnId: "SCN-LDG-001", evidenceObligations: [{ qualityCheck: "unit" }] },
      { scnId: "SCN-LDG-003", evidenceObligations: [{ qualityCheck: "unit" }] },
      { scnId: "SCN-LNT-002", evidenceObligations: [{ qualityCheck: "fitness" }] },
      { scnId: "SCN-LDG-007", evidenceObligations: [{ qualityCheck: "integration" }] },
      { scnId: "SCN-LNT-009", evidenceObligations: [{ qualityCheck: "fitness" }] },
    ],
    [
      { qualityCheck: "unit", scnId: "SCN-LDG-001", status: "passed" },
      { qualityCheck: "integration", scnId: "SCN-LDG-007", status: "failed" },
      {
        qualityCheck: "fitness",
        staticCheck: "lint:guard-lint",
        scnId: "SCN-LNT-002",
        exists: true,
        enforcedOverRealSource: false,
      },
      {
        qualityCheck: "fitness",
        staticCheck: "lint:guard-lint",
        scnId: "SCN-LNT-009",
        exists: true,
        enforcedOverRealSource: true,
      },
    ]
  );

  it("renders an '### Out-of-balance by feature' table grouping the out-of-balance scenarios under their feature code", () => {
    const md = renderMarkdown(__er(spanning), ctx);

    expect(md).toContain("### Out-of-balance by feature");
    expect(md).toContain("3 of 5 scenario rows out of balance, grouped by feature.");
    expect(md).toContain("| Feature | Count | Out-of-balance `@SCN` ids |");
    expect(md).toContain("| LDG | 2 | SCN-LDG-003, SCN-LDG-007 |");
    expect(md).toContain("| LNT | 1 | SCN-LNT-002 |");
  });

  it("excludes the balanced scenarios (this is the discrepancy view)", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    const iSection = md.indexOf("### Out-of-balance by feature");
    const rest = md.slice(iSection + 1);
    const nextHeading = rest.search(/\n##/);
    const section = nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;
    expect(section).not.toContain("SCN-LDG-001");
    expect(section).not.toContain("SCN-LNT-009");
  });

  it("lists the features in first-appearance (document) order", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    const iTrb = md.indexOf("| LDG |");
    const iLnt = md.indexOf("| LNT |");
    expect(iTrb).toBeGreaterThanOrEqual(0);
    expect(iLnt).toBeGreaterThanOrEqual(0);
    expect(iTrb).toBeLessThan(iLnt);
  });

  it("omits the section entirely (total line and all) when no scenario is out of balance", () => {
    const allBalanced: Ledger = reconcile(
      [{ scnId: "SCN-LDG-001", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [{ qualityCheck: "unit", scnId: "SCN-LDG-001", status: "passed" }]
    );
    const md = renderMarkdown(__er(allBalanced), ctx);
    expect(md).not.toContain("### Out-of-balance by feature");
    expect(md).not.toContain("scenario rows out of balance");
  });

  it("slots the by-feature section after the fitness section and before the ledger (no warnings section)", () => {
    const withAll: Ledger = reconcile(
      [{ scnId: "SCN-LNT-002", evidenceObligations: [{ qualityCheck: "fitness" }] }],
      [{ qualityCheck: "fitness", staticCheck: "guard-lint", exists: true, enforcedOverRealSource: false }]
    );
    const md = renderMarkdown(__er(withAll), ctx);
    const iStatic = md.indexOf("### Fitness evidence obligations");
    const iByFeature = md.indexOf("### Out-of-balance by feature");
    const iLedger = md.indexOf("## Scenario Reconciliations");
    expect(iStatic).toBeGreaterThanOrEqual(0);
    expect(iByFeature).toBeGreaterThanOrEqual(0);
    expect(iLedger).toBeGreaterThanOrEqual(0);
    expect(iStatic).toBeLessThan(iByFeature);
    expect(iByFeature).toBeLessThan(iLedger);
    expect(md).not.toContain("## Warnings");
  });

  it("names each feature in full as '<slug> (<FFF>)' when a code→slug map is threaded", () => {
    const featureNames = new Map([
      ["LDG", "ledger"],
      ["LNT", "fitness-evidence"],
    ]);
    const md = renderMarkdown(__er(spanning, false, false), ctx, undefined, featureNames);
    expect(md).toContain("| ledger (LDG) | 2 | SCN-LDG-003, SCN-LDG-007 |");
    expect(md).toContain("| fitness-evidence (LNT) | 1 | SCN-LNT-002 |");
  });

  it("falls back to the bare FFF for an uncoded id the map doesn't cover", () => {
    const featureNames = new Map([["LDG", "ledger"]]);
    const md = renderMarkdown(__er(spanning, false, false), ctx, undefined, featureNames);
    expect(md).toContain("| ledger (LDG) | 2 | SCN-LDG-003, SCN-LDG-007 |");
    expect(md).toContain("| LNT | 1 | SCN-LNT-002 |");
  });

  it("renders the bare FFF when no feature-name map is threaded (the 4-arg back-compat path)", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    expect(md).toContain("| LDG | 2 | SCN-LDG-003, SCN-LDG-007 |");
    expect(md).toContain("| LNT | 1 | SCN-LNT-002 |");
  });

  const ledgerHeading = CORE_MESSAGES[CoreMessage.ScenarioReconciliationsHeading];

  function byFeatureLines(lines: string[]): string[] {
    const start = lines.indexOf(CORE_MESSAGES[CoreMessage.OutOfBalanceByFeatureHeading]);
    expect(start).toBeGreaterThanOrEqual(0);
    const end = lines.indexOf(ledgerHeading);
    expect(end).toBeGreaterThan(start);
    return lines.slice(start, end);
  }

  it("renders heading, blank, total line, blank, header, separator, one row per out-of-balance feature carrying its ids, then one blank", () => {
    const featureNames = new Map([["LDG", "ledger"]]);
    const lines = renderMarkdown(__er(spanning), ctx, undefined, featureNames).split("\n");

    expect(byFeatureLines(lines)).toEqual([
      CORE_MESSAGES[CoreMessage.OutOfBalanceByFeatureHeading],
      "",
      `${CORE_MESSAGES[CoreMessage.ScenarioRowsOutOfBalance](3, 5)}${CORE_MESSAGES[CoreMessage.GroupedByFeature]}.`,
      "",
      CORE_MESSAGES[CoreMessage.ByFeatureTableHeader],
      "| --- | --- | --- |",
      "| ledger (LDG) | 2 | SCN-LDG-003, SCN-LDG-007 |",
      "| LNT | 1 | SCN-LNT-002 |",
      "",
    ]);
  });

  it("emits no line at all when no scenario is out of balance, so the ledger heading follows the previous section's closing blank", () => {
    const allBalanced: Ledger = reconcile(
      [{ scnId: "SCN-LDG-001", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [{ qualityCheck: "unit", scnId: "SCN-LDG-001", status: "passed" }]
    );
    const lines = renderMarkdown(__er(allBalanced), ctx).split("\n");
    const ledgerAt = lines.indexOf(ledgerHeading);

    expect(lines).not.toContain(CORE_MESSAGES[CoreMessage.OutOfBalanceByFeatureHeading]);
    expect(ledgerAt).toBeGreaterThan(1);
    expect(lines[ledgerAt - 1]).toBe("");
    expect(lines[ledgerAt - 2]).not.toBe("");
  });
});

describe("[SCN-RPT-030] the by-feature total line counts the out-of-balance rows no feature can group", () => {
  const proven = { scnId: "SCN-BFP-001", evidenceObligations: [{ qualityCheck: "unit" as const }] };
  const unproven = { scnId: "SCN-BFP-002", evidenceObligations: [{ qualityCheck: "unit" as const }] };
  const provenCredit = { qualityCheck: "unit" as const, scnId: "SCN-BFP-001", status: "passed" as const };
  const strandedCredit = { qualityCheck: "unit" as const, scnId: "SCN-GONE-001", status: "passed" as const };
  const uncitedCredit = { qualityCheck: "unit" as const, scnId: null, status: "passed" as const };
  const byFeature = (ledger: Ledger): string => {
    const md = renderMarkdown(__er(ledger), ctx);
    const at = md.indexOf("### Out-of-balance by feature");
    return at < 0 ? "" : md.slice(at, md.indexOf("\n## ", at));
  };

  it("names the out-of-balance phantom-scenario row beside the grouped scenario rows, and never groups it", () => {
    const section = byFeature(reconcile([proven, unproven], [provenCredit, strandedCredit]));
    expect(section).toContain(
      "1 of 2 scenario rows out of balance, grouped by feature; 1 phantom-scenario row(s) out of balance, " +
        "not grouped by feature (no feature file names them)."
    );
    expect(section).toContain("| BFP | 1 | SCN-BFP-002 |");
    expect(section).not.toContain("SCN-GONE-001");
  });

  it("names both ungrouped kinds when a phantom-scenario and the suspense-scenario row are out of balance", () => {
    const section = byFeature(reconcile([proven, unproven], [provenCredit, strandedCredit, uncitedCredit]));
    expect(section).toContain(
      "1 of 2 scenario rows out of balance, grouped by feature; 1 phantom-scenario row(s) and 1 " +
        "suspense-scenario row(s) out of balance, not grouped by feature (no feature file names them)."
    );
  });

  it("renders the section with no table when the ungrouped rows are the only ones out of balance", () => {
    const section = byFeature(reconcile([proven], [provenCredit, strandedCredit, uncitedCredit]));
    expect(section).toContain(
      "0 of 1 scenario rows out of balance; 1 phantom-scenario row(s) and 1 suspense-scenario row(s) " +
        "out of balance, not grouped by feature (no feature file names them)."
    );
    expect(section).not.toContain("| Feature | Count |");
  });

  it("renders only the heading and the total line, with no table and no stray line, when the ungrouped rows are the only ones out of balance", () => {
    const section = byFeature(reconcile([proven], [provenCredit, strandedCredit, uncitedCredit]));
    const ungrouped = [
      CORE_MESSAGES[CoreMessage.PhantomScenarioRows](1),
      CORE_MESSAGES[CoreMessage.SuspenseScenarioRows](1),
    ].join(CORE_MESSAGES[CoreMessage.AndJoiner]);
    expect(section.split("\n")).toEqual([
      CORE_MESSAGES[CoreMessage.OutOfBalanceByFeatureHeading],
      "",
      `${CORE_MESSAGES[CoreMessage.ScenarioRowsOutOfBalance](0, 1)}; ${CORE_MESSAGES[CoreMessage.NotGroupedByFeature](ungrouped)}.`,
      "",
    ]);
  });

  it("adds no tail when every out-of-balance row is a scenario row", () => {
    const section = byFeature(reconcile([proven, unproven], [provenCredit]));
    expect(section).toContain("1 of 2 scenario rows out of balance, grouped by feature.");
    expect(section).not.toContain("not grouped by feature");
  });
});

describe("[SCN-RPT-007] the corpus census is recoverable from the ledger scenario-count", () => {
  const reconciliationFixture: Ledger = reconcile(
    [
      { scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }] },
      { scnId: "SCN-B", evidenceObligations: [{ qualityCheck: "integration" }] },
      { scnId: "SCN-C", evidenceObligations: [] },
    ],
    [{ qualityCheck: "unit", scnId: "SCN-A", status: "passed" }]
  );

  it("emits exactly its known top-level sections, so a dissolved census section cannot return unnamed", () => {
    const md = renderMarkdown({ ...__er(reconciliationFixture), scenarioCodeErrors: [] }, ctx);
    const sections = md.split("\n").filter((line) => line.startsWith("## "));
    expect(sections).toEqual([
      "## Run provenance",
      "## Scenario code errors",
      "## Summary views",
      "## Scenario Reconciliations",
    ]);
  });

  it("recovers the census from the ledger scenario-count alone — the zero-obligation scenario is a both-missing row, not a second axis", () => {
    const md = renderMarkdown(__er(reconciliationFixture), ctx);
    expect(md).toContain("- 3 Scenario Reconciliation(s): 1 balanced, 2 out-of-balance.");
    expect(md).toContain("SCN-C");
    expect(md).toContain("⊘ Evidence Obligation and Evidence Observation are both missing — the Scenario is untagged and uncited");
  });

  it("places the ledger summary under the '## Scenario Reconciliations' heading at the end, after Summary views", () => {
    const md = renderMarkdown(__er(reconciliationFixture), ctx);
    const iSummary = md.indexOf("## Summary views");
    const iLedger = md.indexOf("## Scenario Reconciliations");
    const iCount = md.indexOf("- 3 Scenario Reconciliation(s):");
    const iTable = md.indexOf("| Scenario | Verdict | Reconciling items |");
    expect(iSummary).toBeGreaterThanOrEqual(0);
    expect(iSummary).toBeLessThan(iLedger);
    expect(iLedger).toBeLessThan(iCount);
    expect(iCount).toBeLessThan(iTable);
  });
});

describe("[SCN-RPT-008] the markdown report outcomes the excluded non-tag @SCN occurrences", () => {
  const simple: Ledger = reconcile(
    [{ scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }] }],
    [{ qualityCheck: "unit", scnId: "SCN-A", status: "passed" }]
  );
  const evidenceObligations = { rawScnOccurrences: 10, scenarioCount: 7, excludedOccurrences: 3, untaggedScenarios: [] };

  it("appends a '- M @SCN ids seen in non-tag context, excluded' bullet to the ledger summary when a corpus is threaded", () => {
    const md = renderMarkdown(__er(simple, false, false), ctx, evidenceObligations);
    expect(md).toContain("## Scenario Reconciliations");
    expect(md).toContain("- 3 @SCN ids seen in non-tag context, excluded");
  });

  it("places the excluded bullet within the ledger summary, after the scenario-count bullet and above the ledger table", () => {
    const md = renderMarkdown(__er(simple, false, false), ctx, evidenceObligations);
    const iCount = md.indexOf("- 1 Scenario Reconciliation(s):");
    const iExcluded = md.indexOf("@SCN ids seen in non-tag context, excluded");
    expect(iCount).toBeGreaterThanOrEqual(0);
    expect(iExcluded).toBeGreaterThan(iCount);
    expect(iExcluded).toBeLessThan(md.indexOf("| Scenario | Verdict | Reconciling items |"));
  });

  it("omits the excluded bullet when no corpus is threaded (the 2-arg call still renders the ledger summary)", () => {
    const md = renderMarkdown(__er(simple), ctx);
    expect(md).toContain("- 1 Scenario Reconciliation(s): 1 balanced, 0 out-of-balance.");
    expect(md).not.toContain("@SCN ids seen in non-tag context, excluded");
    expect(md.split("\n").filter((line) => line.startsWith("## "))).toEqual(["## Run provenance", "## Summary views", "## Scenario Reconciliations"]);
  });

  it("renders no census line and nothing in its place when no corpus is threaded: heading, blank, tally, one blank, then the table", () => {
    const lines = renderMarkdown(__er(simple), ctx).split("\n");
    const heading = CORE_MESSAGES[CoreMessage.ScenarioReconciliationsHeading];
    const section = lines.slice(lines.indexOf(heading));
    const header = `| ${[
      CORE_MESSAGES[CoreMessage.ScenarioColumn],
      CORE_MESSAGES[CoreMessage.VerdictColumn],
      CORE_MESSAGES[CoreMessage.ReconcilingItemsColumn],
    ].join(" | ")} |`;
    expect(section.slice(0, 6)).toEqual([
      heading,
      "",
      `- ${CORE_MESSAGES[CoreMessage.ScenarioReconciliationTally](1, 1, 0)}`,
      "",
      header,
      "| --- | --- | --- |",
    ]);
    expect(section.slice(6)).toEqual([expect.stringMatching(/^\| SCN-A \| .+ \|$/), ""]);
  });
});

describe("[SCN-RPT-009] the markdown report renders summary-first, ledger-last", () => {
  const reformatted: Ledger = reconcile(
    [
      { scnId: "SCN-LDG-001", evidenceObligations: [{ qualityCheck: "unit" }] },
      { scnId: "SCN-LDG-002", evidenceObligations: [{ qualityCheck: "unit" }] },
      { scnId: "SCN-LNT-001", evidenceObligations: [{ qualityCheck: "fitness" }] },
    ],
    [
      { qualityCheck: "unit", scnId: "SCN-LDG-001", status: "passed" },
      { qualityCheck: "fitness", staticCheck: "lint:guard-lint", scnId: "SCN-LNT-001", exists: true, enforcedOverRealSource: false },
    ]
  );

  it("titles the report '# Evidence Reconciliation', not '# Ledger' or '# Spec reconciliation'", () => {
    const md = renderMarkdown(__er(reformatted), ctx);
    expect(md.startsWith("# Evidence Reconciliation")).toBe(true);
    const lines = md.split("\n");
    expect(lines).not.toContain("# Ledger");
    expect(lines).not.toContain("# Spec reconciliation");
    expect(lines).toContain("## Scenario Reconciliations");
  });

  it("renders the sections in summary-first / ledger-last order", () => {
    const md = renderMarkdown(__er(reformatted), ctx);
    const order = [
      "# Evidence Reconciliation",
      "## Run provenance",
      "## Summary views",
      "### Evidence reconciliation",
      "### Fitness evidence obligations",
      "### Out-of-balance by feature",
      "## Scenario Reconciliations",
    ].map((h) => md.indexOf(h));
    for (const i of order) expect(i).toBeGreaterThanOrEqual(0);
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1]!).toBeLessThan(order[i]!);
    }
    expect(md).not.toContain("## Warnings");
  });

  it("moves the per-scenario ledger to the end, with its summary lines on top of the table", () => {
    const md = renderMarkdown(__er(reformatted), ctx);
    const iLedger = md.indexOf("## Scenario Reconciliations");
    const iSummaryLine = md.indexOf("- 3 Scenario Reconciliation(s): 1 balanced, 2 out-of-balance.");
    const iTable = md.indexOf("| Scenario | Verdict | Reconciling items |");
    expect(iLedger).toBeLessThan(iSummaryLine);
    expect(iSummaryLine).toBeLessThan(iTable);
    expect(iTable).toBeGreaterThan(md.indexOf("### Out-of-balance by feature"));
  });

  it("labels the ledger's reconciling items by tag (unit / fitness), never by the internal kind (runtime / static)", () => {
    const md = renderMarkdown(__er(reformatted), ctx);
    expect(md).toContain("| SCN-LDG-002 | ✗ out-of-balance | unit ∅ Evidence Observation is missing |");
    expect(md).toContain(
      "| SCN-LNT-001 | ✗ out-of-balance | fitness 🍉 Evidence Observation is passing but fabricated |"
    );
    expect(md).not.toContain("runtime/");
    expect(md).not.toContain("static 🍉");
  });

  it("ends the report with the scenario reconciliations: heading, blank, tally, blank, table, then one closing blank", () => {
    const observed: Ledger = reconcile(
      [
        { scnId: "SCN-LDG-001", evidenceObligations: [{ qualityCheck: "unit" }] },
        { scnId: "SCN-LDG-002", evidenceObligations: [{ qualityCheck: "unit" }] },
      ],
      [{ qualityCheck: "unit", scnId: "SCN-LDG-001", status: "passed" }]
    );
    const lines = renderMarkdown(__er(observed, true), ctx).split("\n");
    const heading = CORE_MESSAGES[CoreMessage.ScenarioReconciliationsHeading];
    const start = lines.indexOf(heading);
    expect(start).toBeGreaterThan(0);
    expect(lines.filter((line) => line.startsWith("## ")).at(-1)).toBe(heading);

    const header = `| ${[
      CORE_MESSAGES[CoreMessage.ScenarioColumn],
      "Unit",
      CORE_MESSAGES[CoreMessage.VerdictColumn],
      CORE_MESSAGES[CoreMessage.ReconcilingItemsColumn],
    ].join(" | ")} |`;
    const section = lines.slice(start);
    expect(section.slice(0, 6)).toEqual([
      heading,
      "",
      `- ${CORE_MESSAGES[CoreMessage.ScenarioReconciliationTally](2, 1, 1)}`,
      "",
      header,
      "| --- | --- | --- | --- |",
    ]);
    expect(section.slice(6, 8)).toEqual([
      expect.stringMatching(/^\| SCN-LDG-001 \| .+ \|$/),
      expect.stringMatching(/^\| SCN-LDG-002 \| .+ \|$/),
    ]);
    expect(section.slice(8)).toEqual([""]);
  });
});

describe("[SCN-RPT-010] the markdown report renders the Test volume evidenceObservations reconciliation", () => {
  const scenarios: Scenario[] = [
    { scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }] },
  ];
  const observations: EvidenceObservation[] = [
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-PHX-001", status: "passed" },
    { qualityCheck: "integration", scnId: null, status: "passed" },
    { qualityCheck: "integration", scnId: null, status: "passed" },
    { qualityCheck: "integration", scnId: null, status: "passed" },
  ];
  const balance: Ledger = reconcile(scenarios, observations);

  it("[SCN-RPT-010] renders a '### Test volume' section with the three-way balancing identity line", () => {
    const md = renderMarkdown(__er(balance, true, false), ctx);
    expect(md).toContain("### Test volume");
    expect(md).toContain("8 evidence observations = 4 on scenarios + 1 on phantom scenarios + 3 on the suspense scenario.");
  });

  it("renders a by-level evidenceObservation table with all four levels, zeros shown, levels as lowercase tag words", () => {
    const md = renderMarkdown(__er(balance, true, false), ctx);
    expect(md).toContain("| Quality-check | Evidence observations |");
    expect(md).toContain("| unit | 5 |");
    expect(md).toContain("| integration | 3 |");
    expect(md).toContain("| e2e | 0 |");
    expect(md).toContain("| performance | 0 |");
  });

  it("slots Test volume under Summary views, after Evidence reconciliation and before the ledger", () => {
    const md = renderMarkdown(__er(balance, true, false), ctx);
    const iSummary = md.indexOf("## Summary views");
    const iHeadline = md.indexOf("### Evidence reconciliation");
    const iVolume = md.indexOf("### Test volume");
    const iLedger = md.indexOf("## Scenario Reconciliations");
    expect(iSummary).toBeLessThan(iHeadline);
    expect(iHeadline).toBeLessThan(iVolume);
    expect(iVolume).toBeLessThan(iLedger);
  });

  it("omits the cut entirely when no evidenceObservations aggregate is threaded (the 3-arg back-compat path)", () => {
    const md = renderMarkdown(__er(balance), ctx);
    expect(md).not.toContain("### Test volume");
  });
});
