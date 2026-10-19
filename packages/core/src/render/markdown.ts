import type {
  ClaimReconciliation,
  Outcome,
  Verdict,
  PendingItem,
  EvidenceStatus,
} from "../model.js";
import { OUT_OF_BALANCE_OUTCOMES } from "../model.js";
import { OUTCOME_DESCRIPTION } from "./outcomeDescription.js";
import { isObservationOnly } from "../domain/qualityCheckReconciliation.js";
import {
  untaggedScenarioId,
  scenariosBehindAccountsOf,
  type SharedScnCode,
  type UntaggedScenario,
} from "../domain/corpusCounts.js";
import { brokenItemsOf, fitnessReconciliationsOf } from "../domain/ledger.js";
import {
  isScenario,
  isPhantomClaim,
  isUnnamedClaim,
  isOutOfBalance,
  outOfBalanceCountOf,
  carriesNoScnCode,
} from "../domain/claimReconciliation.js";
import type { RenderInput } from "../domain/renderInput.js";
import { hasBrokenEvidence } from "../domain/ledger.js";
import { runVerdictSection } from "./runVerdict.js";
import { scenarioCodeErrorsSection } from "./scenarioCodeErrorsSection.js";
import { provenanceSection } from "./provenanceSection.js";
import { configurationNotReadSection } from "./configurationNotRead.js";
import { discoveryScopeSection } from "./discoveryScope.js";
import { fitnessFunctionsSection } from "./fitnessFunctions.js";
import { behaviouralRunnersSection } from "./behaviouralRunners.js";
import { excludedStepsSection } from "./excludedSteps.js";
import { reconcilerSection } from "./reconcilerSteps.js";
import { stepAccountingSection } from "./stepAccounting.js";
import { testVolumeSection } from "./testVolume.js";
import { featureCodeOf } from "../domain/featureCode.js";
import { evidenceColumns, columnHeader, evidenceCell, type EvidenceColumn } from "./evidenceGrid.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { remarkWordsOf } from "./remarkWords.js";
import { unnamedClaimGroupsOf, type UnnamedClaimGroup, type UnnamedClaimFileGroup } from "../domain/unnamedClaimGroups.js";

const ITEM_GLYPH: Record<Outcome, string> = {
  satisfied: "✓",
  "failing": "✗",
  "watermelon": "🍉",
  "missing": "∅",
  "no-scn-code": "🔗",
  "duplicate-scn-code": "⧉",
  "cites-unknown-scenario": "👻",
  "cites-no-scenario": "❓",
  "broken": "💥",
  "no-evidence-obligation": "◇",
  "both-missing": "⊘",
};

const VERDICT_GLYPH: Record<Verdict, string> = {
  balanced: "✓",
  "out-of-balance": "✗",
};

function renderItem(item: ClaimReconciliation["reconcilingItems"][number]): string {
  if (item.outcome === "both-missing") {
    return `${ITEM_GLYPH["both-missing"]} ${OUTCOME_DESCRIPTION["both-missing"]}`;
  }
  if (item.outcome === "no-scn-code") {
    return `${ITEM_GLYPH["no-scn-code"]} ${OUTCOME_DESCRIPTION["no-scn-code"]}`;
  }
  if (item.qualityCheck === undefined) {
    return `${ITEM_GLYPH[item.outcome]} ${OUTCOME_DESCRIPTION[item.outcome]}`;
  }
  const subject = item.qualityCheck;
  const suffix = observationSuffix(item) ?? "";
  return `${subject} ${ITEM_GLYPH[item.outcome]} ${OUTCOME_DESCRIPTION[item.outcome]}${suffix}`;
}

function observationSuffix(item: ClaimReconciliation["reconcilingItems"][number]): string | undefined {
  const observationOnly = isObservationOnly(item.outcome);
  const remark = remarkWordsOf(item);
  if (item.outcome === "broken") {
    const where = [item.locator, remark === undefined ? undefined : headlineOf(remark)]
      .filter((part): part is string => part !== undefined && part.length > 0)
      .join(": ");
    return where.length > 0 ? ` (${cellSafe(where)})` : undefined;
  }
  if (!observationOnly) return undefined;
  const where = item.fitnessFunction || item.locator;
  const said = item.fitnessFunction || remark === undefined ? "" : `: ${cellSafe(headlineOf(remark))}`;
  return `${where === undefined ? "" : ` (${where}${said})`}${resultOf(item)}`;
}

const RESULT_MESSAGE: Record<EvidenceStatus, CoreMessage> = {
  passed: CoreMessage.ObservationPassed,
  failed: CoreMessage.ObservationFailed,
};

function resultOf(item: ClaimReconciliation["reconcilingItems"][number]): string {
  const status = item.evidenceObservation?.status;
  return status === undefined ? "" : ` — ${CORE_MESSAGES[RESULT_MESSAGE[status]]}`;
}

function headlineOf(message: string): string {
  return message.split("\n").map((line) => line.trim()).find((line) => line.length > 0) ?? "";
}

function cellSafe(text: string): string {
  return text.replace(/\s+/g, " ").replace(/\|/g, "\\|").trim();
}

function renderPendingItem(item: PendingItem): string {
  return item.qualityCheck === undefined
    ? CORE_MESSAGES[CoreMessage.PendingItem]
    : CORE_MESSAGES[CoreMessage.PendingItemFor](item.qualityCheck);
}

function renderFileGroup(group: UnnamedClaimFileGroup): string {
  const remarks = group.remarks.flatMap((remark) => remarkWordsOf(remark) ?? []);
  const said = [...new Set(remarks.map((remark) => cellSafe(headlineOf(remark))))].join(" / ");
  const where = group.locator === undefined ? "" : ` (${group.locator}${said === "" ? "" : `: ${said}`})`;
  const counts = CORE_MESSAGES[CoreMessage.UnnamedClaimGroupCounts](group.ran, group.passed, group.failed);
  const names = group.failedNames.map(cellSafe).filter((name) => name !== "");
  const failed = names.length === 0 ? "" : ` ${CORE_MESSAGES[CoreMessage.UnnamedClaimFailedNames](names)}`;
  return `${group.qualityCheck} ${ITEM_GLYPH["cites-no-scenario"]} ${OUTCOME_DESCRIPTION["cites-no-scenario"]}${where} — ${counts}${failed}`;
}

function renderUnnamedClaimGroup(group: UnnamedClaimGroup): string {
  if (!("names" in group)) return renderFileGroup(group);
  const steps = CORE_MESSAGES[CoreMessage.UnnamedClaimCiSteps](group.names);
  return `fitness ${ITEM_GLYPH["cites-no-scenario"]} ${OUTCOME_DESCRIPTION["cites-no-scenario"]} — ${steps}`;
}

function renderUnnamedClaimItems(items: ClaimReconciliation["reconcilingItems"]): string[] {
  const broken = items.filter((item) => item.outcome === "broken");
  return [...broken.map(renderItem), ...unnamedClaimGroupsOf(items).map(renderUnnamedClaimGroup)];
}

function renderRowExceptions(s: ClaimReconciliation): string {
  const items = isUnnamedClaim(s) ? renderUnnamedClaimItems(s.reconcilingItems) : s.reconcilingItems.map(renderItem);
  const reconciling = items.join("; ");
  const pending = s.pendingItems.map(renderPendingItem).join("; ");
  const groups = [reconciling, pending].filter((g) => g.length > 0);
  return groups.length === 0 ? "—" : groups.join("; ");
}

type SectionEmitter = (report: RenderInput) => readonly string[];

const titleSection: SectionEmitter = () => [CORE_MESSAGES[CoreMessage.ReportTitle], ""];

const runIntegritySection: SectionEmitter = (report) => {
  if (!hasBrokenEvidence({ claimReconciliations: report.ledger.claimReconciliations })) return [];
  const brokenItems = brokenItemsOf({
    claimReconciliations: report.ledger.claimReconciliations,
  });
  const count = brokenItems.length;
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
  for (const item of brokenItems) {
    const locator = item.locator ?? CORE_MESSAGES[CoreMessage.BrokenEvidenceNotNamed];
    lines.push(`- ${CORE_MESSAGES[CoreMessage.BrokenEvidenceWhatBroke](`\`${locator}\``)}`);
    lines.push("");
    lines.push("```text");
    lines.push(...(remarkWordsOf(item) ?? CORE_MESSAGES[CoreMessage.BrokenEvidenceNoMessage]).split("\n"));
    lines.push("```");
    lines.push("");
  }
  return lines;
};

const summaryViewsSection: SectionEmitter = () => [CORE_MESSAGES[CoreMessage.SummaryViewsHeading], ""];

const EVIDENCE_RECONCILIATION_COLUMNS: readonly string[] = [
  CORE_MESSAGES[CoreMessage.SubjectColumn],
  CORE_MESSAGES[CoreMessage.TotalColumn],
  CORE_MESSAGES[CoreMessage.BalancedColumn],
  CORE_MESSAGES[CoreMessage.OutOfBalanceColumn],
  CORE_MESSAGES[CoreMessage.DetailColumn],
];

const evidenceReconciliationSection: SectionEmitter = (report) => {
  const claimReconciliations = report.summary.claimReconciliations;
  const qualityCheckReconciliations = report.summary.qualityCheckReconciliations;
  const row = (cells: readonly string[]): string => `| ${cells.join(" | ")} |`;
  const missingSplit = qualityCheckReconciliations.missingByQualityCheck
    .map(({ subject, count }) => `${count} ${subject}`)
    .join(" + ");
  const lines = [
    CORE_MESSAGES[CoreMessage.EvidenceReconciliationHeading],
    "",
    row(EVIDENCE_RECONCILIATION_COLUMNS),
    row(["---", "---", "---", "---", "---"]),
    row([
      CORE_MESSAGES[CoreMessage.ClaimReconciliationSubject],
      String(claimReconciliations.total),
      String(claimReconciliations.balanced),
      String(claimReconciliations.outOfBalance),
      "",
    ]),
    row([
      CORE_MESSAGES[CoreMessage.QualityCheckReconciliationSubject],
      String(qualityCheckReconciliations.total),
      String(qualityCheckReconciliations.byOutcome.satisfied),
      String(qualityCheckReconciliations.outOfBalance),
      "",
    ]),
  ];
  for (const outcome of OUT_OF_BALANCE_OUTCOMES) {
    const detail = outcome === "missing" ? missingSplit : "";
    lines.push(row([`↳ ${OUTCOME_DESCRIPTION[outcome]}`, "", "", String(qualityCheckReconciliations.byOutcome[outcome]), detail]));
  }
  lines.push(...pendingTally(report.summary.pending));
  lines.push("");
  return lines;
};

function pendingTally(pending: number): string[] {
  return pending > 0
    ? ["", CORE_MESSAGES[CoreMessage.PendingTally](pending)]
    : [];
}

const fitnessSection: SectionEmitter = (report) => {
  const rows = fitnessReconciliationsOf({
    claimReconciliations: report.ledger.claimReconciliations,
  }).map(
    ({ scnId, reconciliation: r }) =>
      `| ${scnId} | ${ITEM_GLYPH[r.outcome]} ${OUTCOME_DESCRIPTION[r.outcome]} |`
  );
  if (rows.length === 0) return [];
  const { satisfied, total } = report.summary.fitness;
  return [
    CORE_MESSAGES[CoreMessage.FitnessHeading],
    "",
    CORE_MESSAGES[CoreMessage.FitnessSatisfiedOf](satisfied, total),
    "",
    CORE_MESSAGES[CoreMessage.FitnessTableHeader],
    "| --- | --- |",
    ...rows,
    "",
  ];
};

const byFeatureSection: SectionEmitter = (report) => {
  const rows = report.ledger.claimReconciliations;
  const scenarios = rows.filter(isScenario);
  const groups = outOfBalanceByFeature(
    scenarios,
    report.evidenceObligations?.untaggedScenarios ?? [],
    report.metadata?.featureNames ?? {},
  );
  const ungrouped = ungroupedOutOfBalance(report.summary.claimReconciliations);
  if (groups.size === 0 && ungrouped.length === 0) return [];
  const head = CORE_MESSAGES[CoreMessage.ScenarioRowsOutOfBalance](outOfBalanceCountOf(scenarios), scenarios.length);
  return [
    CORE_MESSAGES[CoreMessage.OutOfBalanceByFeatureHeading],
    "",
    `${head}${groups.size > 0 ? CORE_MESSAGES[CoreMessage.GroupedByFeature] : ""}${ungroupedTail(ungrouped)}.`,
    "",
    ...byFeatureTableLines(groups, report.metadata?.featureNames),
  ];
};

interface FeatureGroup {
  readonly ids: readonly string[];
  readonly noScnCode: number;
}

type ScenarioRows = RenderInput["ledger"]["claimReconciliations"];

function outOfBalanceByFeature(
  scenarios: ScenarioRows,
  untagged: readonly UntaggedScenario[],
  featureNames: Readonly<Record<string, string>>,
): Map<string, FeatureGroup> {
  const codeOfFile = new Map(Object.entries(featureNames).map(([code, slug]) => [`${slug}.feature`, code]));
  const featureOf = new Map(untagged.map((u) => [untaggedScenarioId(u), codeOfFile.get(u.feature) ?? u.feature]));
  const groups = new Map<string, FeatureGroup>();
  for (const s of scenarios) {
    if (!isOutOfBalance(s)) continue;
    const noScnCode = carriesNoScnCode(s);
    const key = (noScnCode ? featureOf.get(s.scnId) : featureCodeOf(s.scnId)) ?? s.scnId;
    const group = groups.get(key) ?? { ids: [], noScnCode: 0 };
    groups.set(key, noScnCode ? { ...group, noScnCode: group.noScnCode + 1 } : { ...group, ids: [...group.ids, s.scnId] });
  }
  return groups;
}

function byFeatureTableLines(
  groups: ReadonlyMap<string, FeatureGroup>,
  featureNames: Readonly<Record<string, string>> | undefined,
): string[] {
  if (groups.size === 0) return [];
  const lines = [CORE_MESSAGES[CoreMessage.ByFeatureTableHeader], "| --- | --- | --- |"];
  for (const [key, group] of groups) {
    const slug = featureNames?.[key];
    const label = slug ? `${slug} (${key})` : key;
    lines.push(`| ${label} | ${group.ids.length + group.noScnCode} | ${idsCell(group)} |`);
  }
  lines.push("");
  return lines;
}

function idsCell(group: FeatureGroup): string {
  const ids = group.ids.join(", ");
  if (group.noScnCode === 0) return ids;
  const noScnCode = CORE_MESSAGES[CoreMessage.NoScnCodeScenarios](group.noScnCode);
  return ids === "" ? noScnCode : `${ids}${CORE_MESSAGES[CoreMessage.AndJoiner]}${noScnCode}`;
}

function ungroupedOutOfBalance(totals: RenderInput["summary"]["claimReconciliations"]): string[] {
  return [
    ...(totals.phantomClaim > 0 ? [CORE_MESSAGES[CoreMessage.PhantomClaimRows](totals.phantomClaim)] : []),
    ...(totals.unnamedClaim > 0 ? [CORE_MESSAGES[CoreMessage.UnnamedClaimRows](totals.unnamedClaim)] : []),
  ];
}

function ungroupedTail(ungrouped: readonly string[]): string {
  return ungrouped.length > 0
    ? `; ${CORE_MESSAGES[CoreMessage.NotGroupedByFeature](ungrouped.join(CORE_MESSAGES[CoreMessage.AndJoiner]))}`
    : "";
}

const ledgerSection: SectionEmitter = (report) => {
  const scenarioRows = report.ledger.claimReconciliations.filter(
    isScenario
  );
  const phantomClaimRows = report.ledger.claimReconciliations.filter(isPhantomClaim);
  const unnamedClaimRows = report.ledger.claimReconciliations.filter(isUnnamedClaim);
  const scenarios = [...scenarioRows, ...phantomClaimRows, ...unnamedClaimRows];
  const columns = report.summary.testVolume !== undefined ? evidenceColumns(scenarios) : [];
  return [
    CORE_MESSAGES[CoreMessage.ClaimReconciliationsHeading],
    "",
    ...ledgerTallyLines(report.summary.claimReconciliations),
    ...(report.evidenceObligations ? censusLines(report.evidenceObligations, scenarioRows.length) : []),
    "",
    ...evidenceKeyLines(columns),
    ...ledgerTableLines(scenarios, columns),
    "",
  ];
};

function evidenceKeyLines(columns: readonly EvidenceColumn[]): string[] {
  if (columns.length === 0) return [];
  return [...CORE_MESSAGES[CoreMessage.EvidenceCellKey].split("\n"), ""];
}

function ledgerTallyLines(totals: RenderInput["summary"]["claimReconciliations"]): string[] {
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

function censusLines(census: NonNullable<RenderInput["evidenceObligations"]>, accounts: number): string[] {
  const lines = [`- ${CORE_MESSAGES[CoreMessage.ExcludedScnOccurrences](census.excludedOccurrences)}`];
  const untagged = census.untaggedScenarios.length;
  if (untagged > 0) lines.push(`- ${CORE_MESSAGES[CoreMessage.UntaggedScenarios](untagged)}`);
  lines.push(...sharedScnCodeLines(census.sharedScnCodes ?? [], accounts));
  return lines;
}

function sharedScnCodeLines(shared: readonly SharedScnCode[], accounts: number): string[] {
  if (shared.length === 0) return [];
  return [
    `- ${CORE_MESSAGES[CoreMessage.SharedScnCodes](scenariosBehindAccountsOf(accounts, shared), accounts, shared.length)}`,
    ...shared.map(
      (code) => `  - ${code.scnId}: ${code.scenarios.map((s) => `${s.feature} : ${s.scenario}`).join("; ")}`
    ),
  ];
}

function ledgerTableLines(
  scenarios: readonly ClaimReconciliation[],
  columns: readonly EvidenceColumn[]
): string[] {
  const headers = [
    CORE_MESSAGES[CoreMessage.ScenarioColumn],
    ...columns.map(columnHeader),
    CORE_MESSAGES[CoreMessage.VerdictColumn],
    CORE_MESSAGES[CoreMessage.ReconcilingItemsColumn],
  ];
  const lines = [`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`];
  for (const s of scenarios) {
    const cells = columns.map((col) => evidenceCell(s, col));
    const items = renderRowExceptions(s);
    lines.push(
      `| ${[s.scnId, ...cells, `${VERDICT_GLYPH[s.verdict]} ${s.verdict}`, items].join(" | ")} |`
    );
  }
  return lines;
}

const SECTIONS: readonly SectionEmitter[] = [
  titleSection,
  provenanceSection,
  configurationNotReadSection,
  runIntegritySection,
  scenarioCodeErrorsSection,
  summaryViewsSection,
  runVerdictSection,
  evidenceReconciliationSection,
  testVolumeSection,
  discoveryScopeSection,
  fitnessFunctionsSection,
  behaviouralRunnersSection,
  reconcilerSection,
  excludedStepsSection,
  stepAccountingSection,
  fitnessSection,
  byFeatureSection,
  ledgerSection,
];

export function renderReport(report: RenderInput): string {
  return SECTIONS.flatMap((section) => section(report)).join("\n");
}

export function renderReportFromJson(json: string): string {
  return renderReport(JSON.parse(json) as RenderInput);
}
