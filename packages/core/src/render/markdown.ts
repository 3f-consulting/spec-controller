import type {
  ClaimReconciliation,
  ReconciliationLine,
  PendingItem,
  EvidenceStatus,
  EvidenceObservation,
} from "../model.js";
import { OUT_OF_BALANCE_OUTCOMES } from "../model.js";
import { OUTCOME_DESCRIPTION } from "./outcomeDescription.js";
import { cellSafeKeepingCodeSpans } from "./cellSafe.js";
import { reportedName } from "./reportedName.js";
import { isObservationOnly } from "../domain/qualityCheckReconciliation.js";
import { isFitnessObservation } from "../domain/journal.js";
import { type SharedScnCode } from "../domain/corpusCounts.js";
import { brokenItemsOf, type QualityCheckKindObservations } from "../domain/ledger.js";
import {
  isScenario,
  ciStepsOf,
  isPhantomClaim,
  isUnnamedClaim,
  outOfBalanceCountOf,
  reconcilingItemsOf,
} from "../domain/claimReconciliation.js";
import type { ExitCodeOf, RenderInput } from "../domain/renderInput.js";
import type { RunInputName } from "../domain/runProvenance.js";
import { hasBrokenEvidence } from "../domain/ledger.js";
import { runVerdictSection } from "./runVerdict.js";
import { scenarioCodesCleanStatement } from "./scenarioCodeErrorsSection.js";
import { provenanceSection } from "./provenanceSection.js";
import { errorsInTheInputsSection } from "./errorsInTheInputs.js";
import { stepAccountingSection } from "./stepAccounting.js";
import { evidenceObservationsSection } from "./evidenceObservations.js";
import type { FeatureOutOfBalance } from "../domain/outOfBalanceByFeature.js";
import { evidenceColumns, columnHeader, evidenceCell, type EvidenceColumn } from "./evidenceGrid.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { remarkHeadlineOf, remarkWordsOf } from "./remarkWords.js";
import { fencedBlockLines } from "./codeSpan.js";
import { unnamedClaimGroupsOf, type UnnamedClaimGroup, type UnnamedClaimFileGroup } from "../domain/unnamedClaimGroups.js";

function renderLine(line: ReconciliationLine): string {
  const sentence = `${OUTCOME_DESCRIPTION[line.outcome]}${scenarioClauseOf(line)}`;
  if (line.outcome === "both-missing" || line.outcome === "no-scn-code" || line.qualityCheckKind === undefined) {
    return sentence;
  }
  const head = `${line.qualityCheckKind}: ${sentence}`;
  const observation = line.evidenceObservation;
  if (observation === undefined) return head;
  if (!isObservationOnly(line.outcome)) return `${head}${namedSuffix(observation)}`;
  return `${head}${line.outcome === "broken" ? brokenSuffix(observation) : observationSuffix(observation)}`;
}

function quotedSuffix(parts: readonly (string | undefined)[]): string {
  const where = parts.flatMap((part) => part?.trim() || []).join(": ");
  return where === "" ? "" : ` (${where})`;
}

const reported = (part: string | undefined): string | undefined => (part === undefined ? undefined : reportedName(part));

function namedSuffix(o: EvidenceObservation): string {
  return quotedSuffix((isFitnessObservation(o) ? [o.fitnessFunction] : [o.locator, o.testName]).map(reported));
}

function scenarioClauseOf({ scenario }: ReconciliationLine): string {
  return scenario === undefined ? "" : ` — ${CORE_MESSAGES[CoreMessage.SharedScnCodeScenario](reportedName(scenario.feature), reportedName(scenario.title))}`;
}

function brokenSuffix(o: EvidenceObservation): string {
  return quotedSuffix([reported(o.locator), remarkHeadlineOf(o, reportedName)]);
}

function observationSuffix(o: EvidenceObservation): string {
  return `${namedSuffix(o)}${resultOf(o)}`;
}

const RESULT_MESSAGE = {
  passed: CoreMessage.ObservationPassed,
  failed: CoreMessage.ObservationFailed,
} as const satisfies Record<EvidenceStatus, CoreMessage>;

function resultOf(o: EvidenceObservation): string {
  return o.status === undefined ? "" : ` — ${CORE_MESSAGES[RESULT_MESSAGE[o.status]]}`;
}

function renderPendingItem(item: PendingItem): string {
  return item.qualityCheckKind === undefined
    ? CORE_MESSAGES[CoreMessage.PendingItem]
    : CORE_MESSAGES[CoreMessage.PendingItemFor](item.qualityCheckKind);
}

function renderFileGroup(group: UnnamedClaimFileGroup): string {
  const remarks = group.remarks.flatMap((remark) => remarkHeadlineOf(remark, reportedName) ?? []);
  const code = group.sharedScnCode === undefined ? [] : [CORE_MESSAGES[CoreMessage.SharedScnCode](group.sharedScnCode)];
  const said = [...new Set([...code, ...remarks])].filter((part) => part !== "").join(" / ");
  const counts = CORE_MESSAGES[CoreMessage.UnnamedClaimGroupCounts](group.ran, group.passed, group.failed);
  const names = group.failedNames.map(reportedName).filter((name) => name !== "");
  const failed = names.length === 0 ? "" : ` ${CORE_MESSAGES[CoreMessage.UnnamedClaimFailedNames](names)}`;
  return `${group.qualityCheckKind}: ${OUTCOME_DESCRIPTION["cites-no-scenario"]}${quotedSuffix([reported(group.locator), said])} — ${counts}${failed}`;
}

function renderUnnamedClaimGroup(group: UnnamedClaimGroup): string {
  if (!("names" in group)) return renderFileGroup(group);
  const steps = CORE_MESSAGES[CoreMessage.UnnamedClaimCiSteps](group.names.map(reportedName));
  const remark =
    group.sharedScnCode === undefined ? "" : ` (${CORE_MESSAGES[CoreMessage.SharedScnCode](group.sharedScnCode)})`;
  return `fitness: ${OUTCOME_DESCRIPTION["cites-no-scenario"]}${remark} — ${steps}`;
}

function renderUnnamedClaimItems(lines: readonly ReconciliationLine[]): string[] {
  const broken = lines.filter((line) => line.outcome === "broken");
  return [...broken.map(renderLine), ...unnamedClaimGroupsOf(lines).map(renderUnnamedClaimGroup)];
}

function renderRowExceptions(s: ClaimReconciliation): string {
  const items = isUnnamedClaim(s) ? renderUnnamedClaimItems(reconcilingItemsOf(s)) : reconcilingItemsOf(s).map(renderLine);
  const reconciling = items.map(cellSafeKeepingCodeSpans).join("; ");
  const pending = s.pendingItems.map(renderPendingItem).join("; ");
  const groups = [reconciling, pending].filter((g) => g.length > 0);
  return groups.length === 0 ? "—" : groups.join("; ");
}

type SectionEmitter = (report: RenderInput, inputNames: readonly RunInputName[], exitCodeOf: ExitCodeOf) => readonly string[];

const titleSection: SectionEmitter = () => [CORE_MESSAGES[CoreMessage.ReportTitle], ""];

const runIntegritySection: SectionEmitter = (report) => {
  if (!hasBrokenEvidence(report)) return [];
  const brokenObservations = brokenItemsOf(report).flatMap((line) => line.evidenceObservation ?? []);
  const count = brokenObservations.length;
  const proofs =
    count === 1
      ? CORE_MESSAGES[CoreMessage.OneProofNeverRan]
      : CORE_MESSAGES[CoreMessage.ProofsNeverRan](count);
  const lines = [
    CORE_MESSAGES[CoreMessage.RunIntegrityHeading],
    "",
    CORE_MESSAGES[CoreMessage.RunUnsound](proofs),
    "",
  ];
  for (const item of brokenObservations) {
    const locator = item.locator?.trim() ? item.locator : CORE_MESSAGES[CoreMessage.BrokenEvidenceNotNamed];
    lines.push(`- ${CORE_MESSAGES[CoreMessage.BrokenEvidenceWhatBroke](`\`${locator}\``)}`);
    lines.push("");
    lines.push(...fencedBlockLines("text", remarkWordsOf(item) ?? CORE_MESSAGES[CoreMessage.BrokenEvidenceNoMessage]));
    lines.push("");
  }
  return lines;
};

const summarySection: SectionEmitter = () => [CORE_MESSAGES[CoreMessage.SummaryHeading], ""];

const RECONCILIATION_TOTALS_COLUMNS: readonly string[] = [
  CORE_MESSAGES[CoreMessage.SubjectColumn],
  CORE_MESSAGES[CoreMessage.TotalColumn],
  CORE_MESSAGES[CoreMessage.BalancedColumn],
  CORE_MESSAGES[CoreMessage.OutOfBalanceColumn],
  CORE_MESSAGES[CoreMessage.DetailColumn],
];

const RECONCILIATION_TOTALS_TERMS = [
  CoreMessage.ReconciliationTotalsClaimReconciliationTerm,
  CoreMessage.ReconciliationTotalsReconciliationLineTerm,
  CoreMessage.ReconciliationTotalsEvidenceObligationTerm,
  CoreMessage.ReconciliationTotalsEvidenceObservationTerm,
] as const;

const reconciliationTotalsSection: SectionEmitter = (report) => {
  const { claimReconciliations, reconciliationLines, pending } = report.summary.reconciliationTotals;
  const row = (cells: readonly string[]): string => `| ${cells.join(" | ")} |`;
  const missingSplit = reconciliationLines.missingByQualityCheckKind
    .map(({ qualityCheckKind, count }) => `${count} ${qualityCheckKind}`)
    .join(" + ");
  const lines = [
    CORE_MESSAGES[CoreMessage.ReconciliationTotalsHeading],
    "",
    ...RECONCILIATION_TOTALS_TERMS.map((term) => `- ${CORE_MESSAGES[term]}`),
    "",
    row(RECONCILIATION_TOTALS_COLUMNS),
    row(["---", "---", "---", "---", "---"]),
    row([
      CORE_MESSAGES[CoreMessage.ClaimReconciliationSubject],
      String(claimReconciliations.total),
      String(claimReconciliations.balanced),
      String(claimReconciliations.outOfBalance),
      "",
    ]),
    row([
      CORE_MESSAGES[CoreMessage.ReconciliationLineSubject],
      String(reconciliationLines.total),
      String(reconciliationLines.byOutcome.satisfied),
      String(reconciliationLines.outOfBalance),
      "",
    ]),
  ];
  for (const outcome of OUT_OF_BALANCE_OUTCOMES) {
    const detail = outcome === "missing" ? missingSplit : "";
    lines.push(row([OUTCOME_DESCRIPTION[outcome], "", "", String(reconciliationLines.byOutcome[outcome]), detail]));
  }
  lines.push(...pendingTally(pending));
  lines.push("");
  return lines;
};

function pendingTally(pending: number): string[] {
  return pending > 0
    ? ["", CORE_MESSAGES[CoreMessage.PendingTally](pending)]
    : [];
}

const byFeatureSection: SectionEmitter = (report) => {
  const rows = report.claimReconciliations;
  const scenarios = rows.filter(isScenario);
  const groups = report.summary.outOfBalanceByFeature ?? [];
  const ungrouped = ungroupedOutOfBalance(report.summary.reconciliationTotals.claimReconciliations);
  if (groups.length === 0 && ungrouped.length === 0) return [];
  const head = CORE_MESSAGES[CoreMessage.ScenarioClaimReconciliationsOutOfBalance](outOfBalanceCountOf(scenarios), scenarios.length);
  return [
    CORE_MESSAGES[CoreMessage.OutOfBalanceByFeatureHeading],
    "",
    `${head}${groups.length > 0 ? CORE_MESSAGES[CoreMessage.GroupedByFeature] : ""}${ungroupedTail(ungrouped)}.`,
    "",
    ...byFeatureTableLines(groups),
  ];
};

function byFeatureTableLines(groups: readonly FeatureOutOfBalance[]): string[] {
  if (groups.length === 0) return [];
  const lines = [CORE_MESSAGES[CoreMessage.ByFeatureTableHeader], "| --- | --- | --- |"];
  for (const group of groups) {
    const label = group.featureFile ? `${group.featureFile} (${group.feature})` : group.feature;
    lines.push(`| ${label} | ${group.count} | ${idsCell(group)} |`);
  }
  lines.push("");
  return lines;
}

function idsCell(group: FeatureOutOfBalance): string {
  const ids = group.claims.join(", ");
  const noScnCodeCount = group.scenariosWithNoScnCode ?? 0;
  if (noScnCodeCount === 0) return ids;
  const noScnCode = CORE_MESSAGES[CoreMessage.NoScnCodeScenarios](noScnCodeCount);
  return ids === "" ? noScnCode : `${ids}${CORE_MESSAGES[CoreMessage.AndJoiner]}${noScnCode}`;
}

type ClaimReconciliationTotals = RenderInput["summary"]["reconciliationTotals"]["claimReconciliations"];

function ungroupedOutOfBalance(totals: ClaimReconciliationTotals): string[] {
  return [
    ...(totals.phantomClaim > 0 ? [CORE_MESSAGES[CoreMessage.PhantomClaimReconciliations](totals.phantomClaim)] : []),
    ...(totals.unnamedClaim > 0 ? [CORE_MESSAGES[CoreMessage.UnnamedClaimReconciliations](totals.unnamedClaim)] : []),
  ];
}

function ungroupedTail(ungrouped: readonly string[]): string {
  return ungrouped.length > 0
    ? `; ${CORE_MESSAGES[CoreMessage.NotGroupedByFeature](ungrouped.join(CORE_MESSAGES[CoreMessage.AndJoiner]))}`
    : "";
}

const ledgerSection: SectionEmitter = (report) => {
  const scenarioRows = report.claimReconciliations.filter(isScenario);
  const phantomClaimRows = report.claimReconciliations.filter(isPhantomClaim);
  const unnamedClaimRows = report.claimReconciliations.filter(isUnnamedClaim);
  const claims = [...scenarioRows, ...phantomClaimRows, ...unnamedClaimRows];
  const columns = report.summary.evidenceObservations !== undefined ? evidenceColumns(claims) : [];
  return [
    CORE_MESSAGES[CoreMessage.ClaimReconciliationsHeading],
    "",
    ...ledgerTallyLines(report.summary.reconciliationTotals.claimReconciliations),
    "",
    ...evidenceKeyLines(columns),
    ...ledgerTableLines(claims, columns, report.summary.evidenceObservations?.byQualityCheckKind ?? []),
    "",
  ];
};

function evidenceKeyLines(columns: readonly EvidenceColumn[]): string[] {
  if (columns.length === 0) return [];
  return [...CORE_MESSAGES[CoreMessage.EvidenceCellKey].split("\n"), CORE_MESSAGES[CoreMessage.WatermelonItemKey], ""];
}

function ledgerTallyLines(totals: ClaimReconciliationTotals): string[] {
  const lines = [
    `- ${CORE_MESSAGES[CoreMessage.ClaimReconciliationTally](totals.total, totals.balanced, totals.outOfBalance)}`,
  ];
  if (totals.phantomClaim > 0) {
    lines.push(`- ${CORE_MESSAGES[CoreMessage.PhantomClaimTally](totals.phantomClaim)}`);
  }
  if (totals.unnamedClaim > 0) {
    lines.push(`- ${CORE_MESSAGES[CoreMessage.UnnamedClaimTally](totals.unnamedClaim)}`);
  }
  return lines;
}

const scenarioCodeFactsSection: SectionEmitter = (report) => {
  const codes = report.summary.scenarioCodes;
  if (codes?.excludedOccurrences === undefined) return [];
  const lines = [`- ${CORE_MESSAGES[CoreMessage.ExcludedScnOccurrences](codes.excludedOccurrences)}`];
  const untagged = (codes.untaggedScenarios ?? []).length;
  if (untagged > 0) lines.push(`- ${CORE_MESSAGES[CoreMessage.UntaggedScenarios](untagged)}`);
  lines.push(...sharedScnCodeLines(codes.sharedScnCodes ?? [], report.claimReconciliations.filter(isScenario).length));
  return [...lines, ""];
};

function sharedScnCodeLines(shared: readonly SharedScnCode[], scenarios: number): string[] {
  if (shared.length === 0) return [];
  return [
    `- ${CORE_MESSAGES[CoreMessage.SharedScnCodes](scenarios, shared.length)}`,
    ...shared.map(
      (code) => `  - ${code.scnId}: ${code.scenarios.map((s) => `${s.feature} : ${s.title}`).join("; ")}`
    ),
  ];
}

function ledgerTableLines(
  claims: readonly ClaimReconciliation[],
  columns: readonly EvidenceColumn[],
  stepsByQualityCheckKind: readonly QualityCheckKindObservations[]
): string[] {
  const withSteps = columns.length > 0;
  const headers = [
    CORE_MESSAGES[CoreMessage.ClaimColumn],
    ...columns.map(columnHeader),
    CORE_MESSAGES[CoreMessage.VerdictColumn],
    CORE_MESSAGES[CoreMessage.ReconcilingItemsColumn],
    ...(withSteps ? [CORE_MESSAGES[CoreMessage.CiStepsColumn]] : []),
  ];
  const lines = [`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`];
  for (const s of claims) {
    const cells = columns.map((col) => evidenceCell(s, col));
    const items = renderRowExceptions(s);
    const steps = withSteps ? [cellSafeKeepingCodeSpans(ciStepsOf(s, stepsByQualityCheckKind).map(reportedName).join(", "))] : [];
    lines.push(
      `| ${[s.claim, ...cells, s.verdict, items, ...steps].join(" | ")} |`
    );
  }
  return lines;
}

const SECTIONS: readonly SectionEmitter[] = [
  titleSection,
  provenanceSection,
  errorsInTheInputsSection,
  runIntegritySection,
  summarySection,
  (report, _inputNames, exitCodeOf) => runVerdictSection(report, exitCodeOf),
  scenarioCodesCleanStatement,
  scenarioCodeFactsSection,
  reconciliationTotalsSection,
  evidenceObservationsSection,
  stepAccountingSection,
  byFeatureSection,
  ledgerSection,
];

export function renderReport(report: RenderInput, inputNames: readonly RunInputName[], exitCodeOf: ExitCodeOf): string {
  return SECTIONS.flatMap((section) => section(report, inputNames, exitCodeOf)).join("\n");
}
