import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import type { Ledger } from "../model.js";
import { CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { markdownHeading } from "./heading.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { EvidenceObservation, Scenario, Layer } from "../model.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";

describe("[CLM-RPT-021] the markdown names the broken evidence and its error, stamped unsound", () => {
  const VITEST_LOCATOR = "tests/harness/cucumber.trigger.test.ts";
  const VITEST_MESSAGE =
    "Error: Cannot find package '@cucumber/tag-expressions' imported from " +
    `${VITEST_LOCATOR}\n    at packageResolve (node:internal/modules/esm/resolve:catch)\n    at moduleResolve (node:internal/modules/esm/resolve)`;

  const CUCUMBER_LOCATOR = "features/handover.feature";
  const cucumberMessage = (): string => coreMessage(CoreMessage.AmbiguousNamedStep, { step: "When the handover is accepted" });

  const rowFor = (md: string, claimCode: string): string => {
    const row = md.split("\n").find((line) => line.startsWith(`| ${claimCode} `));
    expect(row, `expected a rendered row for ${claimCode}`).toBeTruthy();
    return row!;
  };

  const brokenObservation = (
    layer: Layer,
    locator: string,
    message: string
  ): EvidenceObservation => ({ qualityCheckKind: layer, claimCode: null, status: "passed", broken: true, locator, message });

  const balanceWithBroken = (observation: EvidenceObservation): Ledger => {
    const scenarios: Scenario[] = [
      { claimCode: "CLM-HNS-002", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    ];
    return reconcile(scenarios, [observation]);
  };

  let vitestBroken: Ledger;
  let cucumberBroken: Ledger;
  beforeEach(() => {
    vitestBroken = balanceWithBroken(brokenObservation("unit", VITEST_LOCATOR, VITEST_MESSAGE));
    cucumberBroken = balanceWithBroken(brokenObservation("integration", CUCUMBER_LOCATOR, cucumberMessage()));
  });

  it("stamps each run unsound, above the Summary", () => {
    for (const balance of [vitestBroken, cucumberBroken]) {
      const md = renderMarkdown(__er(balance), ctx, publishedExitCodeOf);
      expect(md).toContain(markdownHeading(2, coreMessage(CoreMessage.RunIntegrityHeading)));
      const iProvenance = md.indexOf("## Run provenance");
      const iStamp = md.indexOf(markdownHeading(2, coreMessage(CoreMessage.RunIntegrityHeading)));
      const iSummary = md.indexOf(markdownHeading(2, coreMessage(CoreMessage.SummaryHeading)));
      expect(iProvenance).toBeLessThan(iStamp);
      expect(iStamp).toBeLessThan(iSummary);
      expect(md).toMatch(/unsound[\s\S]{0,400}missing/i);
    }
  });

  it("carries the locator on the unnamed claim's broken item — a broken proof, not an absent one", () => {
    const vitestMd = renderMarkdown(__er(vitestBroken), ctx, publishedExitCodeOf);
    const unnamedClaimRow = rowFor(vitestMd, "(unnamed claim)");
    expect(unnamedClaimRow).toContain(`unit: ${coreMessage(CoreMessage.OutcomeBroken)}`);
    expect(unnamedClaimRow).toContain(VITEST_LOCATOR);
    expect(unnamedClaimRow).toContain("Cannot find package '@cucumber/tag-expressions'");
    expect(unnamedClaimRow).not.toContain("at packageResolve");
    const namedRow = rowFor(vitestMd, "CLM-HNS-002");
    expect(namedRow).toContain(`unit: ${coreMessage(CoreMessage.OutcomeMissing)}`);
    expect(namedRow).not.toContain(coreMessage(CoreMessage.OutcomeBroken));

    const cucumberUnnamedClaimRow = rowFor(renderMarkdown(__er(cucumberBroken), ctx, publishedExitCodeOf), "(unnamed claim)");
    expect(cucumberUnnamedClaimRow).toContain(`integration: ${coreMessage(CoreMessage.OutcomeBroken)}`);
    expect(cucumberUnnamedClaimRow).toContain(CUCUMBER_LOCATOR);
    expect(cucumberUnnamedClaimRow).toContain("is ambiguous");
  });
});

describe("[CLM-RPT-022] the summary opens with the run verdict and the exit code it maps to", () => {
  const summaryOpening = (md: string): string =>
    md.slice(md.indexOf(markdownHeading(2, coreMessage(CoreMessage.SummaryHeading))), md.indexOf(markdownHeading(3, coreMessage(CoreMessage.ReconciliationTotalsHeading))));

  const balancedScenario: Scenario = {
    claimCode: "CLM-VRD-001",
    evidenceObligations: [{ qualityCheckKind: "unit" }],
  };
  const balancedObs: EvidenceObservation = {
    qualityCheckKind: "unit",
    claimCode: "CLM-VRD-001",
    status: "passed",
  };

  let balanced: Ledger;
  let balancedWithPending: Ledger;
  beforeEach(() => {
    balanced = reconcile([balancedScenario], [balancedObs]);
    balancedWithPending = reconcile(
      [
        {
          claimCode: "CLM-VRD-001",
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

describe('[CLM-RPT-024] the reconciliation collection is named "Claim Reconciliation(s)" on every surface, never "Scenario Reconciliation(s)" or "scenario(s)"', () => {
  let scenarioPhantomClaimAndUnnamedClaimRows: Ledger;
  beforeEach(() => {
    scenarioPhantomClaimAndUnnamedClaimRows = reconcile(
      [{ claimCode: "CLM-A", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
      [
        { qualityCheckKind: "unit", claimCode: "CLM-A", status: "passed" },
        { qualityCheckKind: "unit", claimCode: "CLM-PHM-999", status: "passed" },
        { qualityCheckKind: "fitness", fitnessFunction: "guard:static", exists: true, enforcedOverRealSource: true },
      ],
    );
  });

  it('names the collection "Claim Reconciliation" in the Evidence-reconciliation table Subject cell', () => {
    const md = renderMarkdown(__er(scenarioPhantomClaimAndUnnamedClaimRows), ctx, publishedExitCodeOf);
    expect(md).toContain(`| ${coreMessage(CoreMessage.ClaimReconciliationSubject)} |`);
  });

  it('names no row "Scenario Reconciliation" anywhere in a report holding a scenario, a phantom claim and the unnamed claim', () => {
    const md = renderMarkdown(__er(scenarioPhantomClaimAndUnnamedClaimRows), ctx, publishedExitCodeOf);
    expect(md).toContain(`- ${coreMessage(CoreMessage.ClaimReconciliationTally, { total: 3, balanced: 1, outOfBalance: 2 })}`);
    expect(md.split(`${coreMessage(CoreMessage.ClaimReconciliationSubject)}(s) for `)).toHaveLength(5);
    expect(md).not.toMatch(/scenario reconciliation/i);
  });
});
