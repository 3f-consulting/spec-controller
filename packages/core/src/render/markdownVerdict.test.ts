import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import type { Ledger } from "../model.js";
import { OUTCOME_DESCRIPTION } from "./outcomeDescription.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { EvidenceObservation, Scenario, Layer } from "../model.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";

describe("[SCN-RPT-021] the markdown names the broken evidence and its error, stamped unsound", () => {
  const VITEST_LOCATOR = "tests/harness/cucumber.trigger.test.ts";
  const VITEST_MESSAGE =
    "Error: Cannot find package '@cucumber/tag-expressions' imported from " +
    `${VITEST_LOCATOR}\n    at packageResolve (node:internal/modules/esm/resolve:catch)\n    at moduleResolve (node:internal/modules/esm/resolve)`;

  const CUCUMBER_LOCATOR = "features/handover.feature";
  const CUCUMBER_MESSAGE =
    'The step "When the handover is accepted" is ambiguous — two or more step definitions match ' +
    "it, so the step never ran.";

  const rowFor = (md: string, scnId: string): string => {
    const row = md.split("\n").find((line) => line.startsWith(`| ${scnId} `));
    expect(row, `expected a rendered row for ${scnId}`).toBeTruthy();
    return row!;
  };

  const brokenObservation = (
    layer: Layer,
    locator: string,
    message: string
  ): EvidenceObservation => ({ qualityCheckKind: layer, scnId: null, status: "passed", broken: true, locator, message });

  const balanceWithBroken = (observation: EvidenceObservation): Ledger => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-HNS-002", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    ];
    return reconcile(scenarios, [observation]);
  };

  let vitestBroken: Ledger;
  let cucumberBroken: Ledger;
  beforeEach(() => {
    vitestBroken = balanceWithBroken(brokenObservation("unit", VITEST_LOCATOR, VITEST_MESSAGE));
    cucumberBroken = balanceWithBroken(brokenObservation("integration", CUCUMBER_LOCATOR, CUCUMBER_MESSAGE));
  });

  it("stamps each run unsound, above the summary views", () => {
    for (const balance of [vitestBroken, cucumberBroken]) {
      const md = renderMarkdown(__er(balance), ctx, publishedExitCodeOf);
      expect(md).toContain("## Run integrity: unsound");
      const iProvenance = md.indexOf("## Run provenance");
      const iStamp = md.indexOf("## Run integrity: unsound");
      const iSummary = md.indexOf("## Summary views");
      expect(iProvenance).toBeLessThan(iStamp);
      expect(iStamp).toBeLessThan(iSummary);
      expect(md).toMatch(/unsound[\s\S]{0,400}missing/i);
    }
  });

  it("carries the locator on the unnamed claim's broken item — a broken proof, not an absent one", () => {
    const vitestMd = renderMarkdown(__er(vitestBroken), ctx, publishedExitCodeOf);
    const unnamedClaimRow = rowFor(vitestMd, "(unnamed claim)");
    expect(unnamedClaimRow).toContain(`unit: ${OUTCOME_DESCRIPTION.broken}`);
    expect(unnamedClaimRow).toContain(VITEST_LOCATOR);
    expect(unnamedClaimRow).toContain("Cannot find package '@cucumber/tag-expressions'");
    expect(unnamedClaimRow).not.toContain("at packageResolve");
    const namedRow = rowFor(vitestMd, "SCN-HNS-002");
    expect(namedRow).toContain(`unit: ${OUTCOME_DESCRIPTION.missing}`);
    expect(namedRow).not.toContain(OUTCOME_DESCRIPTION.broken);

    const cucumberUnnamedClaimRow = rowFor(renderMarkdown(__er(cucumberBroken), ctx, publishedExitCodeOf), "(unnamed claim)");
    expect(cucumberUnnamedClaimRow).toContain(`integration: ${OUTCOME_DESCRIPTION.broken}`);
    expect(cucumberUnnamedClaimRow).toContain(CUCUMBER_LOCATOR);
    expect(cucumberUnnamedClaimRow).toContain("is ambiguous");
  });
});

describe("[SCN-RPT-022] the summary opens with the run verdict and the exit code it maps to", () => {
  const summaryOpening = (md: string): string =>
    md.slice(md.indexOf("## Summary views"), md.indexOf("### Evidence reconciliation"));

  const balancedScenario: Scenario = {
    scnId: "SCN-VRD-001",
    evidenceObligations: [{ qualityCheckKind: "unit" }],
  };
  const balancedObs: EvidenceObservation = {
    qualityCheckKind: "unit",
    scnId: "SCN-VRD-001",
    status: "passed",
  };

  let balanced: Ledger;
  let balancedWithPending: Ledger;
  beforeEach(() => {
    balanced = reconcile([balancedScenario], [balancedObs]);
    balancedWithPending = reconcile(
      [
        {
          scnId: "SCN-VRD-001",
          evidenceObligations: [{ qualityCheckKind: "unit" }, { qualityCheckKind: "integration", pending: true }],
        },
      ],
      [balancedObs]
    );
  });

  it("notes exit 3 under --strict conditionally when a balanced run carries Pending Items — and never asserts it", () => {
    const opening = summaryOpening(renderMarkdown(__er(balancedWithPending), ctx, publishedExitCodeOf));
    expect(opening).toContain("**BALANCED**");
    expect(opening).toContain("exit 0");
    expect(opening).toMatch(/exit 3 under `--strict`/);
    expect(summaryOpening(renderMarkdown(__er(balanced), ctx, publishedExitCodeOf))).not.toContain("exit 3");
  });
});

describe('[SCN-RPT-024] the reconciliation collection is named "Claim Reconciliation(s)" on every surface, never "Scenario Reconciliation(s)" or "scenario(s)"', () => {
  let scenarioPhantomClaimAndUnnamedClaimRows: Ledger;
  beforeEach(() => {
    scenarioPhantomClaimAndUnnamedClaimRows = reconcile(
      [{ scnId: "SCN-A", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
      [
        { qualityCheckKind: "unit", scnId: "SCN-A", status: "passed" },
        { qualityCheckKind: "unit", scnId: "SCN-PHM-999", status: "passed" },
        { qualityCheckKind: "fitness", fitnessFunction: "guard:static", exists: true, enforcedOverRealSource: true },
      ],
    );
  });

  it('names the collection "Claim Reconciliation" in the Evidence-reconciliation table Subject cell', () => {
    const md = renderMarkdown(__er(scenarioPhantomClaimAndUnnamedClaimRows), ctx, publishedExitCodeOf);
    expect(md).toContain("| Claim Reconciliation |");
  });

  it('names no row "Scenario Reconciliation" anywhere in a report holding a scenario, a phantom claim and the unnamed claim', () => {
    const md = renderMarkdown(__er(scenarioPhantomClaimAndUnnamedClaimRows), ctx, publishedExitCodeOf);
    expect(md).toContain("- 3 Claim Reconciliation(s): 1 balanced, 2 out-of-balance.");
    expect(md.match(/Claim Reconciliation\(s\) for /g)).toHaveLength(4);
    expect(md).not.toMatch(/scenario reconciliation/i);
  });
});
