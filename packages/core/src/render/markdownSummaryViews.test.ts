import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { type Ledger } from "../model.js";
import { OUTCOME_DESCRIPTION } from "./outcomeDescription.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { EvidenceObservation, Scenario } from "../model.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";

describe("[SCN-RPT-006] the markdown report groups out-of-balance scenarios by feature", () => {
  let spanning: Ledger;
  beforeEach(() => {
    spanning = reconcile(
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
          fitnessFunction: "lint:guard-lint",
          scnId: "SCN-LNT-002",
          exists: true,
          enforcedOverRealSource: false,
        },
        {
          qualityCheck: "fitness",
          fitnessFunction: "lint:guard-lint",
          scnId: "SCN-LNT-009",
          exists: true,
          enforcedOverRealSource: true,
        },
      ]
    );
  });

  it("renders an '### Out-of-balance by feature' table grouping the out-of-balance scenarios under their feature code", () => {
    const md = renderMarkdown(__er(spanning), ctx);

    expect(md).toContain("### Out-of-balance by feature");
    expect(md).toContain("3 of 5 scenario rows out of balance, grouped by feature.");
    expect(md).toContain("| Feature | Count | Out-of-balance `@SCN` ids |");
    expect(md).toContain("| LDG | 2 | SCN-LDG-003, SCN-LDG-007 |");
    expect(md).toContain("| LNT | 1 | SCN-LNT-002 |");
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
      [{ qualityCheck: "fitness", fitnessFunction: "guard-lint", exists: true, enforcedOverRealSource: false }]
    );
    const md = renderMarkdown(__er(withAll), ctx);
    const iFitness = md.indexOf("### Fitness evidence obligations");
    const iByFeature = md.indexOf("### Out-of-balance by feature");
    const iLedger = md.indexOf("## Claim Reconciliations");
    expect(iFitness).toBeGreaterThanOrEqual(0);
    expect(iByFeature).toBeGreaterThanOrEqual(0);
    expect(iLedger).toBeGreaterThanOrEqual(0);
    expect(iFitness).toBeLessThan(iByFeature);
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

  const ledgerHeading = CORE_MESSAGES[CoreMessage.ClaimReconciliationsHeading];

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
  const provenObservation = { qualityCheck: "unit" as const, scnId: "SCN-BFP-001", status: "passed" as const };
  const strandedObservation = { qualityCheck: "unit" as const, scnId: "SCN-GONE-001", status: "passed" as const };
  const uncitedObservation = { qualityCheck: "unit" as const, scnId: null, status: "passed" as const };
  const byFeature = (ledger: Ledger): string => {
    const md = renderMarkdown(__er(ledger), ctx);
    const at = md.indexOf("### Out-of-balance by feature");
    return at < 0 ? "" : md.slice(at, md.indexOf("\n## ", at));
  };
  const phantomAndSuspense = (): string =>
    [CORE_MESSAGES[CoreMessage.PhantomClaimRows](1), CORE_MESSAGES[CoreMessage.UnnamedClaimRows](1)].join(
      CORE_MESSAGES[CoreMessage.AndJoiner]
    );

  it("names the out-of-balance phantom-claim row beside the grouped scenario rows, and never groups it", () => {
    const section = byFeature(reconcile([proven, unproven], [provenObservation, strandedObservation]));
    expect(section).toContain(
      `${CORE_MESSAGES[CoreMessage.ScenarioRowsOutOfBalance](1, 2)}${CORE_MESSAGES[CoreMessage.GroupedByFeature]}; ` +
        `${CORE_MESSAGES[CoreMessage.NotGroupedByFeature](CORE_MESSAGES[CoreMessage.PhantomClaimRows](1))}.`
    );
    expect(section).toContain("| BFP | 1 | SCN-BFP-002 |");
    expect(section).not.toContain("SCN-GONE-001");
  });

  it("names both ungrouped kinds when a phantom-claim and the unnamed-claim row are out of balance", () => {
    const section = byFeature(reconcile([proven, unproven], [provenObservation, strandedObservation, uncitedObservation]));
    expect(section).toContain(
      `${CORE_MESSAGES[CoreMessage.ScenarioRowsOutOfBalance](1, 2)}${CORE_MESSAGES[CoreMessage.GroupedByFeature]}; ` +
        `${CORE_MESSAGES[CoreMessage.NotGroupedByFeature](phantomAndSuspense())}.`
    );
  });

  it("renders the section with no table when the ungrouped rows are the only ones out of balance", () => {
    const section = byFeature(reconcile([proven], [provenObservation, strandedObservation, uncitedObservation]));
    expect(section).toContain(
      `${CORE_MESSAGES[CoreMessage.ScenarioRowsOutOfBalance](0, 1)}; ${CORE_MESSAGES[CoreMessage.NotGroupedByFeature](phantomAndSuspense())}.`
    );
    expect(section).not.toContain("| Feature | Count |");
  });

  it("renders only the heading and the total line, with no table and no stray line, when the ungrouped rows are the only ones out of balance", () => {
    const section = byFeature(reconcile([proven], [provenObservation, strandedObservation, uncitedObservation]));
    expect(section.split("\n")).toEqual([
      CORE_MESSAGES[CoreMessage.OutOfBalanceByFeatureHeading],
      "",
      `${CORE_MESSAGES[CoreMessage.ScenarioRowsOutOfBalance](0, 1)}; ${CORE_MESSAGES[CoreMessage.NotGroupedByFeature](phantomAndSuspense())}.`,
      "",
    ]);
  });
});

describe("[SCN-RPT-007] the corpus census is recoverable from the ledger scenario-count", () => {
  let reconciliationFixture: Ledger;
  beforeEach(() => {
    reconciliationFixture = reconcile(
      [
        { scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }] },
        { scnId: "SCN-B", evidenceObligations: [{ qualityCheck: "integration" }] },
        { scnId: "SCN-C", evidenceObligations: [] },
      ],
      [{ qualityCheck: "unit", scnId: "SCN-A", status: "passed" }]
    );
  });

  it("emits exactly its known top-level sections, so a dissolved census section cannot return unnamed", () => {
    const md = renderMarkdown({ ...__er(reconciliationFixture), scenarioCodeErrors: [] }, ctx);
    const sections = md.split("\n").filter((line) => line.startsWith("## "));
    expect(sections).toEqual([
      "## Run provenance",
      "## Scenario code errors",
      "## Summary views",
      "## Claim Reconciliations",
    ]);
  });

  it("recovers the census from the ledger scenario-count alone — the zero-obligation scenario is a both-missing row, not a second axis", () => {
    const md = renderMarkdown(__er(reconciliationFixture), ctx);
    expect(md).toContain("- 3 Claim Reconciliation(s): 1 balanced, 2 out-of-balance.");
    expect(md).toContain("SCN-C");
    expect(md).toContain(`⊘ ${OUTCOME_DESCRIPTION["both-missing"]}`);
  });
});

describe("[SCN-RPT-008] the markdown report outcomes the excluded non-tag @SCN occurrences", () => {
  let simple: Ledger;
  beforeEach(() => {
    simple = reconcile(
      [{ scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [{ qualityCheck: "unit", scnId: "SCN-A", status: "passed" }]
    );
  });
  const evidenceObligations = { rawScnOccurrences: 10, scenarioCount: 7, excludedOccurrences: 3, untaggedScenarios: [] };

  it("appends a '- M @SCN ids seen in non-tag context, excluded' bullet to the ledger summary when a corpus is threaded", () => {
    const md = renderMarkdown(__er(simple, false, false), ctx, evidenceObligations);
    expect(md).toContain("## Claim Reconciliations");
    expect(md).toContain("- 3 @SCN ids seen in non-tag context, excluded");
  });

  it("renders no census line and nothing in its place when no corpus is threaded: heading, blank, tally, one blank, then the table", () => {
    const lines = renderMarkdown(__er(simple), ctx).split("\n");
    const heading = CORE_MESSAGES[CoreMessage.ClaimReconciliationsHeading];
    const section = lines.slice(lines.indexOf(heading));
    const header = `| ${[
      CORE_MESSAGES[CoreMessage.ScenarioColumn],
      CORE_MESSAGES[CoreMessage.VerdictColumn],
      CORE_MESSAGES[CoreMessage.ReconcilingItemsColumn],
    ].join(" | ")} |`;
    expect(section.slice(0, 6)).toEqual([
      heading,
      "",
      `- ${CORE_MESSAGES[CoreMessage.ClaimReconciliationTally](1, 1, 0)}`,
      "",
      header,
      "| --- | --- | --- |",
    ]);
    expect(section.slice(6)).toEqual([expect.stringMatching(/^\| SCN-A \| .+ \|$/), ""]);
  });
});

describe("[SCN-RPT-009] the markdown report renders summary-first, ledger-last", () => {
  let reformatted: Ledger;
  beforeEach(() => {
    reformatted = reconcile(
      [
        { scnId: "SCN-LDG-001", evidenceObligations: [{ qualityCheck: "unit" }] },
        { scnId: "SCN-LDG-002", evidenceObligations: [{ qualityCheck: "unit" }] },
        { scnId: "SCN-LNT-001", evidenceObligations: [{ qualityCheck: "fitness" }] },
      ],
      [
        { qualityCheck: "unit", scnId: "SCN-LDG-001", status: "passed" },
        { qualityCheck: "fitness", fitnessFunction: "lint:guard-lint", scnId: "SCN-LNT-001", exists: true, enforcedOverRealSource: false },
      ]
    );
  });

  it("labels the ledger's reconciling items by tag (unit / fitness), never by the internal kind (runtime / static)", () => {
    const md = renderMarkdown(__er(reformatted), ctx);
    expect(md).toContain(`| SCN-LDG-002 | ✗ out-of-balance | unit ∅ ${OUTCOME_DESCRIPTION.missing} |`);
    expect(md).toContain(
      `| SCN-LNT-001 | ✗ out-of-balance | fitness 🍉 ${OUTCOME_DESCRIPTION.watermelon} |`
    );
    expect(md).not.toContain("runtime/");
    expect(md).not.toContain("static 🍉");
  });

  it("ends the report with the Claim Reconciliations: heading, blank, tally and its blank first, the table then one closing blank last", () => {
    const observed: Ledger = reconcile(
      [
        { scnId: "SCN-LDG-001", evidenceObligations: [{ qualityCheck: "unit" }] },
        { scnId: "SCN-LDG-002", evidenceObligations: [{ qualityCheck: "unit" }] },
      ],
      [{ qualityCheck: "unit", scnId: "SCN-LDG-001", status: "passed" }]
    );
    const lines = renderMarkdown(__er(observed, true), ctx).split("\n");
    const heading = CORE_MESSAGES[CoreMessage.ClaimReconciliationsHeading];
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
    expect(section.slice(0, 4)).toEqual([
      heading,
      "",
      `- ${CORE_MESSAGES[CoreMessage.ClaimReconciliationTally](2, 1, 1)}`,
      "",
    ]);
    const table = section.indexOf(header);
    expect(table).toBeGreaterThanOrEqual(4);
    expect(section.slice(table)).toEqual([
      header,
      "| --- | --- | --- | --- |",
      expect.stringMatching(/^\| SCN-LDG-001 \| .+ \|$/),
      expect.stringMatching(/^\| SCN-LDG-002 \| .+ \|$/),
      "",
    ]);
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
  let balance: Ledger;
  beforeEach(() => {
    balance = reconcile(scenarios, observations);
  });

  it("[SCN-RPT-010] renders a '### Test volume' section with the three-way balancing identity line", () => {
    const md = renderMarkdown(__er(balance, true, false), ctx);
    expect(md).toContain("### Test volume");
    expect(md).toContain(CORE_MESSAGES[CoreMessage.TestVolumeSum](8, 4, 1, 3));
  });
});
