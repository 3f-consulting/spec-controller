import type {
  ClaimReconciliation,
  ReconciliationLine,
  PendingItem,
  EvidenceStatus,
  EvidenceObservation,
} from "../model.js";
import { OUT_OF_BALANCE_OUTCOMES } from "../model.js";
import { outcomeDescription } from "./outcomeDescription.js";
import { cellSafeKeepingCodeSpans } from "./cellSafe.js";
import { reportedName } from "./reportedName.js";
import { isObservationOnly } from "../domain/qualityCheckReconciliation.js";
import { isFitnessObservation } from "../domain/journal.js";
import { type SharedClaimCode } from "../domain/corpusCounts.js";
import { brokenItemsOf, type QualityCheckKindObservations } from "../domain/ledger.js";
import {
  isScenario,
  ciStepsOf,
  isPhantomClaim,
  isUnnamedClaim,
  outOfBalanceCountOf,
  reconcilingItemsOf,
  UNNAMED_CLAIM_ID,
} from "../domain/claimReconciliation.js";
import type { ExitCodeOf, RenderInput } from "../domain/renderInput.js";
import type { RunInputName } from "../domain/runProvenance.js";
import { hasBrokenEvidence } from "../domain/ledger.js";
import { runVerdictSection } from "./runVerdict.js";
import { claimCodesCleanStatement } from "./claimCodeErrorsSection.js";
import { provenanceSection } from "./provenanceSection.js";
import { errorsInTheInputsSection } from "./errorsInTheInputs.js";
import { stepAccountingSection } from "./stepAccounting.js";
import { evidenceObservationsSection } from "./evidenceObservations.js";
import type { FeatureOutOfBalance } from "../domain/outOfBalanceByFeature.js";
import { evidenceColumns, columnHeader, evidenceCell, type EvidenceColumn } from "./evidenceGrid.js";
import { CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { markdownHeading } from "./heading.js";
import { remarkHeadlineOf, remarkWordsOf } from "./remarkWords.js";
import { fencedBlockLines } from "./codeSpan.js";
import { unnamedClaimGroupsOf, type UnnamedClaimGroup, type UnnamedClaimFileGroup } from "../domain/unnamedClaimGroups.js";

function renderLine(line: ReconciliationLine): string {
  const sentence = `${outcomeDescription(line.outcome)}${scenarioClauseOf(line)}`;
  if (line.outcome === "no-quality-check" || line.outcome === "no-claim-code" || line.qualityCheckKind === undefined) {
    return sentence;
  }
  const head = `${line.qualityCheckKind}: ${sentence}`;
  const observation = line.evidenceObservation;
  if (observation === undefined) return head;
  if (!isObservationOnly(line.outcome)) return `${head}${namedSuffix(observation)}`;
  return `${head}${line.outcome === "never-ran" ? brokenSuffix(observation) : observationSuffix(observation)}`;
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
  return scenario === undefined ? "" : ` — ${coreMessage(CoreMessage.SharedClaimCodeScenario, { feature: reportedName(scenario.feature), title: reportedName(scenario.title) })}`;
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
  return o.status === undefined ? "" : ` — ${coreMessage(RESULT_MESSAGE[o.status])}`;
}

function renderPendingItem(item: PendingItem): string {
  const kind = item.qualityCheckKind;
  return kind === undefined || kind === null
    ? coreMessage(CoreMessage.PendingItem)
    : coreMessage(CoreMessage.PendingItemFor, { qualityCheckKind: kind });
}

function renderFileGroup(group: UnnamedClaimFileGroup): string {
  const remarks = group.remarks.flatMap((remark) => remarkHeadlineOf(remark, reportedName) ?? []);
  const code = group.sharedClaimCode === undefined ? [] : [coreMessage(CoreMessage.SharedClaimCode, { code: group.sharedClaimCode })];
  const said = [...new Set([...code, ...remarks])].filter((part) => part !== "").join(" / ");
  const counts = coreMessage(CoreMessage.UnnamedClaimGroupCounts, { ran: group.ran, passed: group.passed, failed: group.failed });
  const names = group.failedNames.map(reportedName).filter((name) => name !== "");
  const failed = names.length === 0 ? "" : ` ${coreMessage(CoreMessage.UnnamedClaimFailedNames, { names: names.join(" / ") })}`;
  return `${group.qualityCheckKind}: ${outcomeDescription("cites-no-claim")}${quotedSuffix([reported(group.locator), said])} — ${counts}${failed}`;
}

interface UnnamedClaimCiStepsView {
  readonly count: number;
  readonly named: { readonly kind: "none" } | { readonly kind: "some"; readonly list: string };
}

function unnamedClaimCiStepsViewOf(names: readonly string[]): UnnamedClaimCiStepsView {
  const named = names.filter((name) => name !== "");
  return { count: names.length, named: named.length === 0 ? { kind: "none" } : { kind: "some", list: named.join(", ") } };
}

function unnamedClaimCiSteps({ count, named }: UnnamedClaimCiStepsView): string {
  switch (named.kind) {
    case "none":
      return coreMessage(CoreMessage.UnnamedClaimCiSteps, { count });
    case "some":
      return coreMessage(CoreMessage.UnnamedClaimCiStepsNamed, { count, list: named.list });
  }
}

function renderUnnamedClaimGroup(group: UnnamedClaimGroup): string {
  if (!("names" in group)) return renderFileGroup(group);
  const steps = unnamedClaimCiSteps(unnamedClaimCiStepsViewOf(group.names.map(reportedName)));
  const remark =
    group.sharedClaimCode === undefined ? "" : ` (${coreMessage(CoreMessage.SharedClaimCode, { code: group.sharedClaimCode })})`;
  return `fitness: ${outcomeDescription("cites-no-claim")}${remark} — ${steps}`;
}

function renderUnnamedClaimItems(lines: readonly ReconciliationLine[]): string[] {
  const broken = lines.filter((line) => line.outcome === "never-ran");
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

const titleSection: SectionEmitter = () => [markdownHeading(1, coreMessage(CoreMessage.ReportTitle)), ""];

type BrokenEvidenceName = { readonly kind: "unnamed" } | { readonly kind: "named"; readonly locator: string };

export function brokenEvidenceNameOf({ locator }: EvidenceObservation): BrokenEvidenceName {
  return locator?.trim() ? { kind: "named", locator } : { kind: "unnamed" };
}

function brokenEvidenceNameWords(name: BrokenEvidenceName): string {
  return name.kind === "named" ? name.locator : coreMessage(CoreMessage.BrokenEvidenceNotNamed);
}

const runIntegritySection: SectionEmitter = (report) => {
  if (!hasBrokenEvidence(report)) return [];
  const brokenObservations = brokenItemsOf(report).flatMap((line) => line.evidenceObservation ?? []);
  const proofs = coreMessage(CoreMessage.ProofsNeverRan, { count: brokenObservations.length });
  const lines = [
    markdownHeading(2, coreMessage(CoreMessage.RunIntegrityHeading)),
    "",
    coreMessage(CoreMessage.RunUnsound, { proofs }),
    "",
  ];
  for (const item of brokenObservations) {
    const locator = brokenEvidenceNameWords(brokenEvidenceNameOf(item));
    lines.push(`- ${coreMessage(CoreMessage.BrokenEvidenceWhatBroke, { locator: `\`${locator}\`` })}`);
    lines.push("");
    lines.push(...fencedBlockLines("text", remarkWordsOf(item) ?? coreMessage(CoreMessage.BrokenEvidenceNoMessage)));
    lines.push("");
  }
  return lines;
};

const summarySection: SectionEmitter = () => [markdownHeading(2, coreMessage(CoreMessage.SummaryHeading)), ""];

const RECONCILIATION_TOTALS_COLUMNS = [
  CoreMessage.SubjectColumn,
  CoreMessage.TotalColumn,
  CoreMessage.BalancedColumn,
  CoreMessage.OutOfBalanceColumn,
  CoreMessage.DetailColumn,
] as const;

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
    markdownHeading(3, coreMessage(CoreMessage.ReconciliationTotalsHeading)),
    "",
    ...RECONCILIATION_TOTALS_TERMS.map((term) => `- ${coreMessage(term)}`),
    "",
    row(RECONCILIATION_TOTALS_COLUMNS.map((column) => coreMessage(column))),
    row(["---", "---", "---", "---", "---"]),
    row([
      coreMessage(CoreMessage.ClaimReconciliationSubject),
      String(claimReconciliations.total),
      String(claimReconciliations.balanced),
      String(claimReconciliations.outOfBalance),
      "",
    ]),
    row([
      coreMessage(CoreMessage.ReconciliationLineSubject),
      String(reconciliationLines.total),
      String(reconciliationLines.byOutcome.satisfied),
      String(reconciliationLines.outOfBalance),
      "",
    ]),
  ];
  for (const outcome of OUT_OF_BALANCE_OUTCOMES) {
    const detail = outcome === "missing" ? missingSplit : "";
    lines.push(row([outcomeDescription(outcome), "", "", String(reconciliationLines.byOutcome[outcome]), detail]));
  }
  lines.push(...pendingTally(pending));
  lines.push("");
  return lines;
};

function pendingTally(pending: number): string[] {
  return pending > 0
    ? ["", coreMessage(CoreMessage.PendingTally, { pending })]
    : [];
}

const byFeatureSection: SectionEmitter = (report) => {
  const rows = report.claimReconciliations;
  const scenarios = rows.filter(isScenario);
  const groups = report.summary.outOfBalanceByFeature ?? [];
  const ungrouped = ungroupedOutOfBalance(report.summary.reconciliationTotals.claimReconciliations);
  if (groups.length === 0 && ungrouped.length === 0) return [];
  const head = coreMessage(CoreMessage.ScenarioClaimReconciliationsOutOfBalance, { outOfBalance: outOfBalanceCountOf(scenarios), claimReconciliations: scenarios.length });
  return [
    markdownHeading(3, coreMessage(CoreMessage.OutOfBalanceByFeatureHeading)),
    "",
    `${head}${groups.length > 0 ? coreMessage(CoreMessage.GroupedByFeature) : ""}${ungroupedTail(ungrouped)}.`,
    "",
    ...byFeatureTableLines(groups),
  ];
};

function byFeatureTableLines(groups: readonly FeatureOutOfBalance[]): string[] {
  if (groups.length === 0) return [];
  const lines = [coreMessage(CoreMessage.ByFeatureTableHeader), "| --- | --- | --- |"];
  for (const group of groups) {
    const label = group.featureFile ? `${group.featureFile} (${group.feature})` : group.feature;
    lines.push(`| ${label} | ${group.count} | ${idsCell(group)} |`);
  }
  lines.push("");
  return lines;
}

type OutOfBalanceCodesView = { readonly kind: "none" } | { readonly kind: "some"; readonly codes: readonly [string, ...(readonly string[])] };

const outOfBalanceCodesOf = ({ claims }: FeatureOutOfBalance): OutOfBalanceCodesView => {
  const [first, ...rest] = claims;
  if (first === undefined) return { kind: "none" };
  return { kind: "some", codes: [first, ...rest] };
};

const codeList = (codes: readonly string[]): string => codes.join(", ");

function idsCell(group: FeatureOutOfBalance): string {
  const noClaimCodeCount = group.scenariosWithNoClaimCode ?? 0;
  if (noClaimCodeCount === 0) return codeList(group.claims);
  const view = outOfBalanceCodesOf(group);
  switch (view.kind) {
    case "none":
      return coreMessage(CoreMessage.NoClaimCodeScenarios, { count: noClaimCodeCount });
    case "some":
      return coreMessage(CoreMessage.CodesAndNoClaimCodeScenarios, { codes: codeList(view.codes), count: noClaimCodeCount });
  }
}

type ClaimReconciliationTotals = RenderInput["summary"]["reconciliationTotals"]["claimReconciliations"];

function ungroupedOutOfBalance(totals: ClaimReconciliationTotals): string[] {
  return [
    ...(totals.phantomClaim > 0 ? [coreMessage(CoreMessage.PhantomClaimReconciliations, { count: totals.phantomClaim })] : []),
    ...(totals.unnamedClaim > 0 ? [coreMessage(CoreMessage.UnnamedClaimReconciliations, { count: totals.unnamedClaim })] : []),
  ];
}

function ungroupedTail(ungrouped: readonly string[]): string {
  return ungrouped.length > 0
    ? `; ${coreMessage(CoreMessage.NotGroupedByFeature, { ungrouped: ungrouped.join(coreMessage(CoreMessage.AndJoiner)) })}`
    : "";
}

const ledgerSection: SectionEmitter = (report) => {
  const scenarioRows = report.claimReconciliations.filter(isScenario);
  const phantomClaimRows = report.claimReconciliations.filter(isPhantomClaim);
  const unnamedClaimRows = report.claimReconciliations.filter(isUnnamedClaim);
  const claims = [...scenarioRows, ...phantomClaimRows, ...unnamedClaimRows];
  const columns = report.summary.evidenceObservations !== undefined ? evidenceColumns(claims) : [];
  return [
    markdownHeading(2, coreMessage(CoreMessage.ClaimReconciliationsHeading)),
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
  return [...coreMessage(CoreMessage.EvidenceCellKey).split("\n"), coreMessage(CoreMessage.WatermelonItemKey), ""];
}

function ledgerTallyLines(totals: ClaimReconciliationTotals): string[] {
  const lines = [
    `- ${coreMessage(CoreMessage.ClaimReconciliationTally, { total: totals.total, balanced: totals.balanced, outOfBalance: totals.outOfBalance })}`,
  ];
  if (totals.phantomClaim > 0) {
    lines.push(`- ${coreMessage(CoreMessage.PhantomClaimTally, { count: totals.phantomClaim })}`);
  }
  if (totals.unnamedClaim > 0) {
    lines.push(`- ${coreMessage(CoreMessage.UnnamedClaimTally, { count: totals.unnamedClaim, unnamedClaimId: UNNAMED_CLAIM_ID })}`);
  }
  return lines;
}

const claimCodeFactsSection: SectionEmitter = (report) => {
  const codes = report.summary.claimCodes;
  if (codes?.excludedOccurrences === undefined) return [];
  const lines = [`- ${coreMessage(CoreMessage.ExcludedClaimOccurrences, { count: codes.excludedOccurrences })}`];
  const untagged = (codes.untaggedScenarios ?? []).length;
  if (untagged > 0) lines.push(`- ${coreMessage(CoreMessage.UntaggedScenarios, { count: untagged })}`);
  lines.push(...sharedClaimCodeLines(codes.sharedClaimCodes ?? [], report.claimReconciliations.filter(isScenario).length));
  return [...lines, ""];
};

function sharedClaimCodeLines(shared: readonly SharedClaimCode[], scenarios: number): string[] {
  if (shared.length === 0) return [];
  return [
    `- ${coreMessage(CoreMessage.SharedClaimCodes, { scenarios, codes: shared.length })}`,
    ...shared.map(
      (code) => `  - ${code.claimCode}: ${code.scenarios.map((s) => `${s.feature} : ${s.title}`).join("; ")}`
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
    coreMessage(CoreMessage.ClaimColumn),
    ...columns.map(columnHeader),
    coreMessage(CoreMessage.VerdictColumn),
    coreMessage(CoreMessage.ReconcilingItemsColumn),
    ...(withSteps ? [coreMessage(CoreMessage.CiStepsColumn)] : []),
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
  claimCodesCleanStatement,
  claimCodeFactsSection,
  reconciliationTotalsSection,
  evidenceObservationsSection,
  stepAccountingSection,
  byFeatureSection,
  ledgerSection,
];

export function renderReport(report: RenderInput, inputNames: readonly RunInputName[], exitCodeOf: ExitCodeOf): string {
  return SECTIONS.flatMap((section) => section(report, inputNames, exitCodeOf)).join("\n");
}
