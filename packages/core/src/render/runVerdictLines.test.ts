import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import type { EvidenceObservation, Ledger, Scenario } from "../model.js";
import type { RunContext } from "../domain/runProvenance.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { FEATURES, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS } from "../runInputs.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";

const ctx: RunContext = {
  target: "run-verdict-target",
  inputs: [{ ...FEATURES, path: "specs/features" }, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS],
  corpus: "specs/features",
  runStart: new Date("2026-10-05T09:00:00.000Z"),
  sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
  toolSha: "13ee47f271ace511efdb2511276284b4cb50c247",
  toolVersion: "0.1.0",
};

const strictCtx: RunContext = { ...ctx, strict: true };

const HEADING = CORE_MESSAGES[CoreMessage.RunVerdictHeading];
const NEXT_HEADING = CORE_MESSAGES[CoreMessage.EvidenceReconciliationHeading];

function verdictSectionOf(md: string): string[] {
  const lines = md.split("\n");
  const start = lines.indexOf(HEADING);
  const end = lines.indexOf(NEXT_HEADING);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return lines.slice(start, end);
}

function verdictLine(headline: CoreMessage, gloss: string, exitCode: number): string {
  return `${CORE_MESSAGES[headline] as string} — ${gloss} (${CORE_MESSAGES[CoreMessage.VerdictExit](exitCode)})`;
}

const evidenceReconciliation = (ledger: Ledger): EvidenceReconciliation => ({
  summary: summaryOf(ledger, false, false),
  ledger,
});

const scenario: Scenario = { scnId: "SCN-VRD-001", evidenceObligations: [{ qualityCheck: "unit" }] };
const pendingScenario: Scenario = {
  scnId: "SCN-VRD-001",
  evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration", pending: true }],
};
const passed: EvidenceObservation = { qualityCheck: "unit", scnId: "SCN-VRD-001", status: "passed" };

let BALANCED_LINE: string;
beforeEach(() => {
  BALANCED_LINE = verdictLine(CoreMessage.BalancedHeadline, CORE_MESSAGES[CoreMessage.BalancedGloss], 0);
});

describe("[SCN-RPT-022] the summary opens with the run verdict and the exit code it maps to", () => {
  it("a balanced ledger: the heading, a blank line, the verdict naming exit 0, and one blank line", () => {
    const md = renderMarkdown(evidenceReconciliation(reconcile([scenario], [passed])), ctx, publishedExitCodeOf);
    expect(verdictSectionOf(md)).toEqual([HEADING, "", BALANCED_LINE, ""]);
  });

  it("a balanced ledger with Pending Items: the verdict still names exit 0, then a blank line and the outstanding note, then one blank line", () => {
    const md = renderMarkdown(evidenceReconciliation(reconcile([pendingScenario], [passed])), ctx, publishedExitCodeOf);
    expect(verdictSectionOf(md)).toEqual([
      HEADING,
      "",
      BALANCED_LINE,
      "",
      "Pending Items are outstanding — deferred, not out-of-balance, so the verdict stands. " +
        "A run that treats a deferral as a failure gives exit 3 under `--strict`.",
      "",
    ]);
  });

  it("the same Pending Items under --strict: the verdict names exit 3 and carries no outstanding note", () => {
    const md = renderMarkdown(evidenceReconciliation(reconcile([pendingScenario], [passed])), strictCtx, publishedExitCodeOf);
    expect(verdictSectionOf(md)).toEqual([
      HEADING,
      "",
      verdictLine(CoreMessage.PendingHeadline, CORE_MESSAGES[CoreMessage.PendingGloss], 3),
      "",
    ]);
  });

  it("an empty corpus: the verdict names exit 5 and the corpus directory the run examined", () => {
    const md = renderMarkdown(evidenceReconciliation(reconcile([], [])), ctx, publishedExitCodeOf);
    expect(verdictSectionOf(md)).toEqual([
      HEADING,
      "",
      verdictLine(
        CoreMessage.NothingToReconcileHeadline,
        CORE_MESSAGES[CoreMessage.NothingToReconcileGloss]("specs/features"),
        5
      ),
      "",
    ]);
  });

  describe("a corpus whose file headed @TWO holds a scenario coded @SCN-ONE-002", () => {
    const sources = [
      "@ONE\nFeature: one\n\n  @unit @SCN-ONE-001\n  Scenario: one\n    Given a thing\n",
      "@TWO\nFeature: two\n\n  @unit @SCN-ONE-002\n  Scenario: two\n    Given a thing\n",
    ];
    const reconciled = (behaviouralObservations: readonly EvidenceObservation[]): EvidenceReconciliation =>
      evidenceReconciliationFromSources({
        features: parsedFeatures(sources, ["one.feature", "two.feature"]),
        packageJson: {},
        ciWorkflows: [],
        behaviouralObservations,
        deferralTags: [],
      });
    const bothPassed: EvidenceObservation[] = [
      { qualityCheck: "unit", scnId: "SCN-ONE-001", status: "passed" },
      { qualityCheck: "unit", scnId: "SCN-ONE-002", status: "passed" },
    ];

    it("with every account balanced: the scenario-code-error verdict names exit 1 and adds nothing about the accounts", () => {
      const md = renderMarkdown(reconciled(bothPassed), ctx, publishedExitCodeOf);
      expect(verdictSectionOf(md)).toEqual([
        HEADING,
        "",
        verdictLine(CoreMessage.ScenarioCodeErrorsHeadline, CORE_MESSAGES[CoreMessage.ScenarioCodeErrorsGloss](""), 1),
        "",
      ]);
    });
  });
});
