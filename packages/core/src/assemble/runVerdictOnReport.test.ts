import { describe, it, expect } from "vitest";
import { renderJson, renderMarkdown } from "./composers.js";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import type { RenderInput } from "../domain/renderInput.js";
import type { RunContext } from "../domain/runProvenance.js";
import type { RunVerdict } from "../domain/runVerdict.js";
import type { EvidenceObservation, Ledger, Scenario } from "../model.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { CORE_MESSAGES, CoreMessage } from "../render/messages.js";
import { publishedExitCodeOf } from "../render/publishedExitCodes.test-utils.js";
import { sectionCtx as ctx } from "../render/runContext.test-utils.js";

const strictCtx: RunContext = { ...ctx, strict: true };

const HEADLINE: Readonly<Record<RunVerdict, CoreMessage>> = {
  balanced: CoreMessage.BalancedHeadline,
  "out-of-balance": CoreMessage.OutOfBalanceHeadline,
  unsound: CoreMessage.UnsoundHeadline,
  pending: CoreMessage.PendingHeadline,
  "nothing-to-reconcile": CoreMessage.NothingToReconcileHeadline,
  "scenario-code-errors": CoreMessage.ScenarioCodeErrorsHeadline,
};

const scenario: Scenario = { scnId: "SCN-VRD-001", evidenceObligations: [{ qualityCheck: "unit" }] };
const pendingScenario: Scenario = {
  scnId: "SCN-VRD-001",
  evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration", pending: true }],
};
const passed: EvidenceObservation = { qualityCheck: "unit", scnId: "SCN-VRD-001", status: "passed" };
const broken: EvidenceObservation = {
  qualityCheck: "unit",
  scnId: null,
  status: "passed",
  broken: true,
  locator: "tests/harness/broken.test.ts",
  message: "Error: Cannot find package 'missing-package'",
};

const fromLedger = (ledger: Ledger): EvidenceReconciliation => ({ summary: summaryOf(ledger, false), ledger });

const misfiledCorpus = (): EvidenceReconciliation =>
  evidenceReconciliationFromSources({
    features: parsedFeatures(
      [
        "@ONE\nFeature: one\n\n  @unit @SCN-ONE-001\n  Scenario: one\n    Given a thing\n",
        "@TWO\nFeature: two\n\n  @unit @SCN-ONE-002\n  Scenario: two\n    Given a thing\n",
      ],
      ["one.feature", "two.feature"]
    ),
    packageJson: {},
    ciWorkflows: [],
    behaviouralObservations: [
      { qualityCheck: "unit", scnId: "SCN-ONE-001", status: "passed" },
      { qualityCheck: "unit", scnId: "SCN-ONE-002", status: "passed" },
    ],
    deferralTags: [],
  });

interface Row {
  readonly verdict: RunVerdict;
  readonly run: string;
  readonly reconciliation: () => EvidenceReconciliation;
  readonly ctx: RunContext;
}

const ROWS: readonly Row[] = [
  { verdict: "balanced", run: "every account balances", reconciliation: () => fromLedger(reconcile([scenario], [passed])), ctx },
  { verdict: "out-of-balance", run: "a scenario has no evidence", reconciliation: () => fromLedger(reconcile([scenario], [])), ctx },
  { verdict: "unsound", run: "a proof errored before it ran", reconciliation: () => fromLedger(reconcile([scenario], [passed, broken])), ctx },
  {
    verdict: "pending",
    run: "a Pending Item is outstanding under --strict",
    reconciliation: () => fromLedger(reconcile([pendingScenario], [passed])),
    ctx: strictCtx,
  },
  { verdict: "nothing-to-reconcile", run: "the corpus is empty", reconciliation: () => fromLedger(reconcile([], [])), ctx },
  { verdict: "scenario-code-errors", run: "a scenario's code is misfiled", reconciliation: misfiledCorpus, ctx },
];

const verdictHeadlineOf = (md: string): string => {
  const lines = md.split("\n");
  const heading = lines.indexOf(CORE_MESSAGES[CoreMessage.RunVerdictHeading]);
  expect(heading).toBeGreaterThanOrEqual(0);
  return lines[heading + 2]!.split(" — ")[0]!;
};

describe("[SCN-RMD-017] the JSON report's summary names the run verdict, the one the Markdown's verdict headline states", () => {
  for (const row of ROWS) {
    it(`${row.verdict}: ${row.run}`, () => {
      const reconciliation = row.reconciliation();
      const report = JSON.parse(renderJson(reconciliation, row.ctx)) as RenderInput;
      const md = renderMarkdown(reconciliation, row.ctx, publishedExitCodeOf);

      expect(report.summary.runVerdict).toBe(row.verdict);
      expect(verdictHeadlineOf(md)).toBe(CORE_MESSAGES[HEADLINE[report.summary.runVerdict]]);
    });
  }
});
