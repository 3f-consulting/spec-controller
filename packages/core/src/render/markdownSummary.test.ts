import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { assembleRenderInput } from "../assemble/renderInput.js";
import { type Ledger } from "../model.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { EvidenceObservation, Scenario } from "../model.js";
import { CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { markdownHeading } from "./heading.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { RECONCILING_ITEMS_COLUMN, VERDICT_COLUMN, claimReconciliationsTable } from "./claimReconciliationsTable.test-utils.js";

describe("[SCN-RPT-006] the by-feature cut names each out-of-balance feature by its feature file and code, falling back to the bare code for a foreign-claim-code", () => {
  let spanning: Ledger;
  beforeEach(() => {
    spanning = reconcile(
      [
        { claimCode: "SCN-LDG-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        { claimCode: "SCN-LDG-003", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        { claimCode: "SCN-LNT-002", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
        { claimCode: "SCN-LDG-007", evidenceObligations: [{ qualityCheckKind: "integration" }] },
        { claimCode: "SCN-LNT-009", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
      ],
      [
        { qualityCheckKind: "unit", claimCode: "SCN-LDG-001", status: "passed" },
        { qualityCheckKind: "integration", claimCode: "SCN-LDG-007", status: "failed" },
        {
          qualityCheckKind: "fitness",
          fitnessFunction: "lint:guard-lint",
          claimCode: "SCN-LNT-002",
          exists: true,
          enforcedOverRealSource: false,
        },
        {
          qualityCheckKind: "fitness",
          fitnessFunction: "lint:guard-lint",
          claimCode: "SCN-LNT-009",
          exists: true,
          enforcedOverRealSource: true,
        },
      ]
    );
  });

  it("renders an '### Out-of-balance by feature' table grouping the out-of-balance scenarios under their feature code", () => {
    const md = renderMarkdown(__er(spanning), ctx, publishedExitCodeOf);

    expect(md).toContain(markdownHeading(3, coreMessage(CoreMessage.OutOfBalanceByFeatureHeading)));
    expect(md).toContain(
      `${coreMessage(CoreMessage.ScenarioClaimReconciliationsOutOfBalance, { outOfBalance: 3, claimReconciliations: 5 })}${coreMessage(CoreMessage.GroupedByFeature)}.`
    );
    expect(md).toContain(coreMessage(CoreMessage.ByFeatureTableHeader));
    expect(md).toContain("| LDG | 2 | SCN-LDG-003, SCN-LDG-007 |");
    expect(md).toContain("| LNT | 1 | SCN-LNT-002 |");
  });

  it("omits the section entirely (total line and all) when no scenario is out of balance", () => {
    const allBalanced: Ledger = reconcile(
      [{ claimCode: "SCN-LDG-001", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
      [{ qualityCheckKind: "unit", claimCode: "SCN-LDG-001", status: "passed" }]
    );
    const md = renderMarkdown(__er(allBalanced), ctx, publishedExitCodeOf);
    expect(md).not.toContain(markdownHeading(3, coreMessage(CoreMessage.OutOfBalanceByFeatureHeading)));
    const wordsAfterTheCounts = coreMessage(CoreMessage.ScenarioClaimReconciliationsOutOfBalance, { outOfBalance: NaN, claimReconciliations: NaN }).split("NaN").at(-1)?.trim();
    expect(md).not.toContain(wordsAfterTheCounts);
  });

  it("slots the by-feature section after the Evidence observations and before the Claim Reconciliations (no warnings section)", () => {
    const withAll: Ledger = reconcile(
      [{ claimCode: "SCN-LNT-002", evidenceObligations: [{ qualityCheckKind: "fitness" }] }],
      [{ qualityCheckKind: "fitness", fitnessFunction: "guard-lint", exists: true, enforcedOverRealSource: false }]
    );
    const md = renderMarkdown(__er(withAll, true), ctx, publishedExitCodeOf);
    const iObservations = md.indexOf(markdownHeading(3, coreMessage(CoreMessage.EvidenceObservationsHeading)));
    const iByFeature = md.indexOf(markdownHeading(3, coreMessage(CoreMessage.OutOfBalanceByFeatureHeading)));
    const iLedger = md.indexOf(markdownHeading(2, coreMessage(CoreMessage.ClaimReconciliationsHeading)));
    expect(iObservations).toBeGreaterThanOrEqual(0);
    expect(iByFeature).toBeGreaterThanOrEqual(0);
    expect(iLedger).toBeGreaterThanOrEqual(0);
    expect(iObservations).toBeLessThan(iByFeature);
    expect(iByFeature).toBeLessThan(iLedger);
    expect(md).not.toContain("## Warnings");
  });

  it("names each feature as '<file> (<FFF>)', the file read from the summary's by-feature entry, when feature files are threaded", () => {
    const featureNames = new Map([
      ["LDG", "ledger"],
      ["LNT", "fitness-evidence"],
    ]);
    const md = renderMarkdown(__er(spanning, false), ctx, publishedExitCodeOf, undefined, featureNames);
    const files = featureFilesOf(__er(spanning, false), featureNames);
    expect(md).toContain(`| ${files.get("LDG")} (LDG) | 2 | SCN-LDG-003, SCN-LDG-007 |`);
    expect(md).toContain(`| ${files.get("LNT")} (LNT) | 1 | SCN-LNT-002 |`);
  });

  const ledgerHeading = (): string => markdownHeading(2, coreMessage(CoreMessage.ClaimReconciliationsHeading));

  function featureFilesOf(reconciliation: ReturnType<typeof __er>, featureNames: ReadonlyMap<string, string>): Map<string, string | undefined> {
    const byFeature = assembleRenderInput(reconciliation, ctx, undefined, featureNames).summary.outOfBalanceByFeature ?? [];
    return new Map(byFeature.map((entry) => [entry.feature, entry.featureFile]));
  }

  function byFeatureLines(lines: string[]): string[] {
    const start = lines.indexOf(markdownHeading(3, coreMessage(CoreMessage.OutOfBalanceByFeatureHeading)));
    expect(start).toBeGreaterThanOrEqual(0);
    const end = lines.indexOf(ledgerHeading());
    expect(end).toBeGreaterThan(start);
    return lines.slice(start, end);
  }

  it("renders heading, blank, total line, blank, header, separator, one row per out-of-balance feature carrying its ids, then one blank", () => {
    const featureNames = new Map([["LDG", "ledger"]]);
    const lines = renderMarkdown(__er(spanning), ctx, publishedExitCodeOf, undefined, featureNames).split("\n");
    const files = featureFilesOf(__er(spanning), featureNames);

    expect(byFeatureLines(lines)).toEqual([
      markdownHeading(3, coreMessage(CoreMessage.OutOfBalanceByFeatureHeading)),
      "",
      `${coreMessage(CoreMessage.ScenarioClaimReconciliationsOutOfBalance, { outOfBalance: 3, claimReconciliations: 5 })}${coreMessage(CoreMessage.GroupedByFeature)}.`,
      "",
      coreMessage(CoreMessage.ByFeatureTableHeader),
      "| --- | --- | --- |",
      `| ${files.get("LDG")} (LDG) | 2 | SCN-LDG-003, SCN-LDG-007 |`,
      "| LNT | 1 | SCN-LNT-002 |",
      "",
    ]);
  });

  it("emits no line at all when no scenario is out of balance, so the ledger heading follows the previous section's closing blank", () => {
    const allBalanced: Ledger = reconcile(
      [{ claimCode: "SCN-LDG-001", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
      [{ qualityCheckKind: "unit", claimCode: "SCN-LDG-001", status: "passed" }]
    );
    const lines = renderMarkdown(__er(allBalanced), ctx, publishedExitCodeOf).split("\n");
    const ledgerAt = lines.indexOf(ledgerHeading());

    expect(lines).not.toContain(markdownHeading(3, coreMessage(CoreMessage.OutOfBalanceByFeatureHeading)));
    expect(ledgerAt).toBeGreaterThan(1);
    expect(lines[ledgerAt - 1]).toBe("");
    expect(lines[ledgerAt - 2]).not.toBe("");
  });
});

describe("[SCN-RPT-030] the by-feature total line counts the out-of-balance rows no feature can group", () => {
  const proven = { claimCode: "SCN-BFP-001", evidenceObligations: [{ qualityCheckKind: "unit" as const }] };
  const unproven = { claimCode: "SCN-BFP-002", evidenceObligations: [{ qualityCheckKind: "unit" as const }] };
  const provenObservation = { qualityCheckKind: "unit" as const, claimCode: "SCN-BFP-001", status: "passed" as const };
  const strandedObservation = { qualityCheckKind: "unit" as const, claimCode: "SCN-GONE-001", status: "passed" as const };
  const uncitedObservation = { qualityCheckKind: "unit" as const, claimCode: null, status: "passed" as const };
  const byFeature = (ledger: Ledger): string => {
    const md = renderMarkdown(__er(ledger), ctx, publishedExitCodeOf);
    const at = md.indexOf(markdownHeading(3, coreMessage(CoreMessage.OutOfBalanceByFeatureHeading)));
    return at < 0 ? "" : md.slice(at, md.indexOf("\n## ", at));
  };
  const phantomClaimAndUnnamedClaimReconciliations = (): string =>
    [coreMessage(CoreMessage.PhantomClaimReconciliations, { count: 1 }), coreMessage(CoreMessage.UnnamedClaimReconciliations, { count: 1 })].join(
      coreMessage(CoreMessage.AndJoiner)
    );

  it("names the out-of-balance phantom claim's row beside the grouped scenario rows, and never groups it", () => {
    const section = byFeature(reconcile([proven, unproven], [provenObservation, strandedObservation]));
    expect(section).toContain(
      `${coreMessage(CoreMessage.ScenarioClaimReconciliationsOutOfBalance, { outOfBalance: 1, claimReconciliations: 2 })}${coreMessage(CoreMessage.GroupedByFeature)}; ` +
        `${coreMessage(CoreMessage.NotGroupedByFeature, { ungrouped: coreMessage(CoreMessage.PhantomClaimReconciliations, { count: 1 }) })}.`
    );
    expect(section).toContain("| BFP | 1 | SCN-BFP-002 |");
    expect(section).not.toContain("SCN-GONE-001");
  });

  it("names both ungrouped kinds when a phantom claim's row and the unnamed claim's row are out of balance", () => {
    const section = byFeature(reconcile([proven, unproven], [provenObservation, strandedObservation, uncitedObservation]));
    expect(section).toContain(
      `${coreMessage(CoreMessage.ScenarioClaimReconciliationsOutOfBalance, { outOfBalance: 1, claimReconciliations: 2 })}${coreMessage(CoreMessage.GroupedByFeature)}; ` +
        `${coreMessage(CoreMessage.NotGroupedByFeature, { ungrouped: phantomClaimAndUnnamedClaimReconciliations() })}.`
    );
  });

  it("renders the section with no table when the ungrouped rows are the only ones out of balance", () => {
    const section = byFeature(reconcile([proven], [provenObservation, strandedObservation, uncitedObservation]));
    expect(section).toContain(
      `${coreMessage(CoreMessage.ScenarioClaimReconciliationsOutOfBalance, { outOfBalance: 0, claimReconciliations: 1 })}; ${coreMessage(CoreMessage.NotGroupedByFeature, { ungrouped: phantomClaimAndUnnamedClaimReconciliations() })}.`
    );
    expect(section).not.toContain("| Feature | Count |");
  });

  it("renders only the heading and the total line, with no table and no stray line, when the ungrouped rows are the only ones out of balance", () => {
    const section = byFeature(reconcile([proven], [provenObservation, strandedObservation, uncitedObservation]));
    expect(section.split("\n")).toEqual([
      markdownHeading(3, coreMessage(CoreMessage.OutOfBalanceByFeatureHeading)),
      "",
      `${coreMessage(CoreMessage.ScenarioClaimReconciliationsOutOfBalance, { outOfBalance: 0, claimReconciliations: 1 })}; ${coreMessage(CoreMessage.NotGroupedByFeature, { ungrouped: phantomClaimAndUnnamedClaimReconciliations() })}.`,
      "",
    ]);
  });
});

describe("[SCN-RPT-007] the corpus census is recoverable from the ledger scenario-count", () => {
  let reconciliationFixture: Ledger;
  beforeEach(() => {
    reconciliationFixture = reconcile(
      [
        { claimCode: "SCN-A", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        { claimCode: "SCN-B", evidenceObligations: [{ qualityCheckKind: "integration" }] },
        { claimCode: "SCN-C", evidenceObligations: [] },
      ],
      [{ qualityCheckKind: "unit", claimCode: "SCN-A", status: "passed" }]
    );
  });

  it("emits exactly its known top-level sections on a run that judged no corpus, so a dissolved census section cannot return unnamed", () => {
    const md = renderMarkdown(__er(reconciliationFixture), ctx, publishedExitCodeOf);
    const sections = md.split("\n").filter((line) => line.startsWith("## "));
    expect(sections).toEqual([
      markdownHeading(2, coreMessage(CoreMessage.RunProvenanceHeading)),
      markdownHeading(2, coreMessage(CoreMessage.SummaryHeading)),
      markdownHeading(2, coreMessage(CoreMessage.ClaimReconciliationsHeading)),
    ]);
  });

  it("recovers the census from the ledger scenario-count alone — the zero-obligation scenario is a both-missing row, not a second axis", () => {
    const md = renderMarkdown(__er(reconciliationFixture), ctx, publishedExitCodeOf);
    expect(md).toContain(`- ${coreMessage(CoreMessage.ClaimReconciliationTally, { total: 3, balanced: 1, outOfBalance: 2 })}`);
    expect(md).toContain("SCN-C");
    expect(md).toContain(`| out-of-balance | ${coreMessage(CoreMessage.OutcomeBothMissing)} |`);
  });
});

describe("[SCN-RPT-008] the markdown report outcomes the excluded non-tag @SCN occurrences", () => {
  let simple: Ledger;
  beforeEach(() => {
    simple = reconcile(
      [{ claimCode: "SCN-A", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
      [{ qualityCheckKind: "unit", claimCode: "SCN-A", status: "passed" }]
    );
  });
  const evidenceObligations = { rawClaimCodeOccurrences: 10, scenarioCount: 7, excludedOccurrences: 3, untaggedScenarios: [] };

  it("appends a '- M @SCN ids seen in non-tag context, excluded' bullet when a corpus is threaded", () => {
    const md = renderMarkdown(__er(simple, false), ctx, publishedExitCodeOf, evidenceObligations);
    expect(md).toContain(markdownHeading(2, coreMessage(CoreMessage.ClaimReconciliationsHeading)));
    expect(md.split("\n")).toContain(`- ${coreMessage(CoreMessage.ExcludedClaimOccurrences, { count: 3 })}`);
  });

  it("renders no census line and nothing in its place when no corpus is threaded: heading, blank, tally, one blank, then the table", () => {
    const lines = renderMarkdown(__er(simple), ctx, publishedExitCodeOf).split("\n");
    const heading = markdownHeading(2, coreMessage(CoreMessage.ClaimReconciliationsHeading));
    const section = lines.slice(lines.indexOf(heading));
    expect(section.slice(0, 4)).toEqual([
      heading,
      "",
      `- ${coreMessage(CoreMessage.ClaimReconciliationTally, { total: 1, balanced: 1, outOfBalance: 0 })}`,
      "",
    ]);
    const table = claimReconciliationsTable(section);
    expect(table.start).toBe(4);
    expect(table.evidenceColumns).toEqual([]);
    expect(table.rows.map((row) => row.claim)).toEqual(["SCN-A"]);
    expect(section.slice(table.end)).toEqual([""]);
  });
});

describe("[SCN-RPT-009] the markdown report renders summary-first, ledger-last", () => {
  let reformatted: Ledger;
  beforeEach(() => {
    reformatted = reconcile(
      [
        { claimCode: "SCN-LDG-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        { claimCode: "SCN-LDG-002", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        { claimCode: "SCN-LNT-001", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
      ],
      [
        { qualityCheckKind: "unit", claimCode: "SCN-LDG-001", status: "passed" },
        { qualityCheckKind: "fitness", fitnessFunction: "lint:guard-lint", claimCode: "SCN-LNT-001", exists: true, enforcedOverRealSource: false },
      ]
    );
  });

  it("opens on the run provenance, then the Summary under the heading ## Summary, with the Claim Reconciliations last", () => {
    const md = renderMarkdown(__er(reformatted), ctx, publishedExitCodeOf);
    expect(md.split("\n").filter((line) => line.startsWith("## "))).toEqual([
      markdownHeading(2, coreMessage(CoreMessage.RunProvenanceHeading)),
      "## Summary",
      markdownHeading(2, coreMessage(CoreMessage.ClaimReconciliationsHeading)),
    ]);
  });

  it("labels the ledger's reconciling items by tag (unit / fitness), never by the internal kind (runtime / static)", () => {
    const md = renderMarkdown(__er(reformatted), ctx, publishedExitCodeOf);
    const table = claimReconciliationsTable(md);
    expect(table.rowOf("SCN-LDG-002").cell(VERDICT_COLUMN())).toBe("out-of-balance");
    expect(table.rowOf("SCN-LDG-002").cell(RECONCILING_ITEMS_COLUMN())).toBe(`unit: ${coreMessage(CoreMessage.OutcomeMissing)}`);
    expect(table.rowOf("SCN-LNT-001").cell(VERDICT_COLUMN())).toBe("out-of-balance");
    expect(table.rowOf("SCN-LNT-001").cell(RECONCILING_ITEMS_COLUMN()).startsWith(`fitness: ${coreMessage(CoreMessage.OutcomeWatermelon)}`)).toBe(true);
    expect(md).not.toContain("runtime/");
    expect(md).not.toContain("static:");
  });

  it("ends the report with the Claim Reconciliations: heading, blank, tally and its blank first, the table then one closing blank last", () => {
    const observed: Ledger = reconcile(
      [
        { claimCode: "SCN-LDG-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        { claimCode: "SCN-LDG-002", evidenceObligations: [{ qualityCheckKind: "unit" }] },
      ],
      [{ qualityCheckKind: "unit", claimCode: "SCN-LDG-001", status: "passed" }]
    );
    const lines = renderMarkdown(__er(observed, true), ctx, publishedExitCodeOf).split("\n");
    const heading = markdownHeading(2, coreMessage(CoreMessage.ClaimReconciliationsHeading));
    const start = lines.indexOf(heading);
    expect(start).toBeGreaterThan(0);
    expect(lines.filter((line) => line.startsWith("## ")).at(-1)).toBe(heading);

    const section = lines.slice(start);
    expect(section.slice(0, 4)).toEqual([
      heading,
      "",
      `- ${coreMessage(CoreMessage.ClaimReconciliationTally, { total: 2, balanced: 1, outOfBalance: 1 })}`,
      "",
    ]);
    const table = claimReconciliationsTable(section);
    expect(table.start).toBeGreaterThanOrEqual(4);
    expect(table.evidenceColumns).toEqual(["Unit"]);
    expect(table.rows.map((row) => row.claim)).toEqual(["SCN-LDG-001", "SCN-LDG-002"]);
    expect(section.slice(table.end)).toEqual([""]);
  });
});

describe("[SCN-RPT-010] the markdown report renders the Evidence observations reconciliation", () => {
  const scenarios: Scenario[] = [
    { claimCode: "SCN-A", evidenceObligations: [{ qualityCheckKind: "unit" }] },
  ];
  const observations: EvidenceObservation[] = [
    { qualityCheckKind: "unit", claimCode: "SCN-A", status: "passed" },
    { qualityCheckKind: "unit", claimCode: "SCN-A", status: "passed" },
    { qualityCheckKind: "unit", claimCode: "SCN-A", status: "passed" },
    { qualityCheckKind: "unit", claimCode: "SCN-A", status: "passed" },
    { qualityCheckKind: "unit", claimCode: "SCN-PHX-001", status: "passed" },
    { qualityCheckKind: "integration", claimCode: null, status: "passed" },
    { qualityCheckKind: "integration", claimCode: null, status: "passed" },
    { qualityCheckKind: "integration", claimCode: null, status: "passed" },
  ];
  let balance: Ledger;
  beforeEach(() => {
    balance = reconcile(scenarios, observations);
  });

  it("[SCN-RPT-010] renders a '### Evidence observations' section with the three-way balancing identity line", () => {
    const md = renderMarkdown(__er(balance, true), ctx, publishedExitCodeOf);
    expect(md).toContain(markdownHeading(3, coreMessage(CoreMessage.EvidenceObservationsHeading)));
    expect(md).toContain(coreMessage(CoreMessage.EvidenceObservationsSum, { total: 8, onScenario: 4, onPhantomClaim: 1, onUnnamedClaim: 3 }));
  });
});
