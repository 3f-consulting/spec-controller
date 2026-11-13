import type { Outcome } from "../domain/claimReconciliation.js";
import type { QualityCheckCounts, RunVerdict, Totals } from "../domain/evidenceReconciliation.js";
import { coreText } from "../messages/catalogue.js";
import { inCell } from "./quoted.js";
import { tableOf } from "./table.js";

const verdictWords = (runVerdict: RunVerdict): string => coreText(`verdict-${runVerdict.verdict === "not-reconciled" ? runVerdict.why : runVerdict.verdict}`);

const group = (heading: string, lines: readonly string[]): string[] => ["", `### ${coreText(heading)}`, "", ...lines];

function claimReconciliationsGroup({ claimReconciliations: { total, balanced, outOfBalance }, excludedClaimCodeOccurrences }: Totals): string[] {
  return group("summary-claim-reconciliations", [
    ...tableOf(["summary-total", "summary-balanced", "summary-out-of-balance"], [[total, balanced, outOfBalance]]),
    ...(excludedClaimCodeOccurrences === 0 ? [] : ["", coreText("summary-excluded").replace("{count}", String(excludedClaimCodeOccurrences))]),
  ]);
}

const counted = ({ evidenceObligations, evidenceObservations, byOutcome }: QualityCheckCounts): boolean =>
  evidenceObligations + evidenceObservations + Object.values(byOutcome).reduce((sum, count) => sum + count, 0) > 0;

// A kind no claim raises or answers, an outcome nothing has, and the row with no kind when it is empty are left out.
function byKindGroup({ qualityCheckReconciliations: { byKind, noKind, all } }: Totals): string[] {
  const outcomes = (Object.keys(all.byOutcome) as Outcome[]).filter((outcome) => all.byOutcome[outcome] > 0);
  const rowOf = (name: string, counts: QualityCheckCounts): (string | number)[] => [name, counts.evidenceObligations, counts.evidenceObservations, ...outcomes.map((outcome) => counts.byOutcome[outcome])];
  return group(
    "summary-by-kind",
    tableOf(
      ["summary-kind", "summary-evidence-obligations", "summary-evidence-observations", ...outcomes.map((outcome) => `outcome-${outcome}`)],
      [
        ...byKind.filter(counted).map((row) => rowOf(row.kind, row)),
        ...(counted(noKind) ? [rowOf(coreText("summary-no-kind"), noKind)] : []),
        rowOf(coreText("summary-all"), all),
      ],
      ["summary-across-a-row"],
    ),
  );
}

const WHERE_FILED = ["onExecutableClaim", "onPhantomClaim", "onUnnamedClaim"] as const;

function whereFiledGroup({ evidenceObservations }: Totals): string[] {
  return group(
    "summary-where-filed",
    tableOf(
      ["summary-where-filed-column", "summary-where-filed-observations"],
      [...WHERE_FILED.filter((place) => evidenceObservations[place] > 0).map((place) => [coreText(`summary-${place}`), evidenceObservations[place]]), [coreText("summary-total"), evidenceObservations.total]],
    ),
  );
}

function byFeatureGroup({ outOfBalanceByFeature }: Totals): string[] {
  if (outOfBalanceByFeature === undefined) return [];
  return group(
    "summary-by-feature",
    tableOf(
      ["summary-feature-file", "summary-feature-out-of-balance"],
      outOfBalanceByFeature.map(({ file, count }) => [inCell(file), count]),
    ),
  );
}

export function summarySection(totals: Totals, runVerdict: RunVerdict): string[] {
  return [
    `## ${coreText("summary-heading")}`,
    "",
    `- ${coreText("summary-run-verdict")}: ${verdictWords(runVerdict)}`,
    ...claimReconciliationsGroup(totals),
    ...byKindGroup(totals),
    ...whereFiledGroup(totals),
    ...byFeatureGroup(totals),
  ];
}
