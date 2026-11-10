import type { EvidenceReconciliation, RunVerdict, StepAccount, Totals } from "../domain/evidenceReconciliation.js";
import { coreText, type CoreTextCode } from "./coreText.js";
import { heading } from "./heading.js";
import { labelled } from "./labelled.js";
import { inCell } from "./quoted.js";
import { table } from "./table.js";

const verdictOf = (runVerdict: RunVerdict): string => ("why" in runVerdict ? `${runVerdict.verdict} (${runVerdict.why})` : runVerdict.verdict);

const counted = (code: CoreTextCode, count: number): string[] => [coreText(code), String(count)];

function totalsTable({ claimReconciliations, qualityCheckReconciliations, evidenceObservations, excludedClaimCodeOccurrences }: Totals): string {
  return table(
    [coreText("counted-column"), coreText("count-column")],
    [
      counted("claim-reconciliations-total", claimReconciliations.total),
      counted("balanced-label", claimReconciliations.balanced),
      counted("out-of-balance-label", claimReconciliations.outOfBalance),
      counted("quality-check-reconciliations-total", qualityCheckReconciliations.total),
      counted("out-of-balance-label", qualityCheckReconciliations.outOfBalance),
      ...qualityCheckReconciliations.byOutcome.map(({ outcome, count }) => [outcome, String(count)]),
      ...qualityCheckReconciliations.missingByKind.map(({ kind, count }) => [`${coreText("missing-label")} ${kind}`, String(count)]),
      counted("evidence-observations-total", evidenceObservations.total),
      ...evidenceObservations.byKind.map(({ kind, count }) => [kind, String(count)]),
      counted("on-executable-claim-label", evidenceObservations.onExecutableClaim),
      counted("on-phantom-claim-label", evidenceObservations.onPhantomClaim),
      counted("on-unnamed-claim-label", evidenceObservations.onUnnamedClaim),
      counted("fitness-functions-ran-label", evidenceObservations.fitnessFunctionsRan),
      counted("excluded-claim-code-occurrences-label", excludedClaimCodeOccurrences),
    ],
  );
}

function stepAccountLines({ jobs, total }: StepAccount): string[] {
  const counts = ({ stepsRead, runners, reconcilerSteps, nonChecks, plumbing, candidates }: StepAccount["total"]): string[] =>
    [stepsRead, runners, reconcilerSteps, nonChecks, plumbing, candidates].map(String);
  const header = ["workflow-column", "job-column", "steps-read-column", "runners-column", "reconciler-steps-column", "non-checks-column", "plumbing-column", "candidates-column"] as const;
  return [
    heading(3, "step-account-heading"),
    coreText("step-account-key"),
    table(header.map(coreText), [
      ...jobs.map((job) => [inCell(job.workflow), inCell(job.job), ...counts({ ...job, accountedFor: 0 })]),
      [coreText("step-account-total"), "", ...counts(total)],
    ]),
    labelled("accounted-for-label", String(total.accountedFor)),
  ];
}

export function summarySection({ runVerdict, totals, stepAccount }: EvidenceReconciliation): string[] {
  const { outOfBalanceByFeature } = totals;
  return [
    heading(2, "summary-heading"),
    labelled("run-verdict-label", verdictOf(runVerdict)),
    coreText("totals-key"),
    totalsTable(totals),
    ...(outOfBalanceByFeature === undefined
      ? []
      : [
          heading(3, "out-of-balance-by-feature-heading"),
          coreText("out-of-balance-by-feature-key"),
          table([coreText("file-column"), coreText("count-column")], outOfBalanceByFeature.map(({ file, count }) => [inCell(file), String(count)])),
        ]),
    ...(stepAccount === undefined ? [] : stepAccountLines(stepAccount)),
  ];
}
