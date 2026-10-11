import type {
  ScenarioReconciliation,
  Outcome,
  ScenarioVerdict,
  Ledger,
  PendingItem,
} from "../model.js";
import { OUTCOME_DESCRIPTION, OUT_OF_BALANCE_OUTCOMES } from "../model.js";
import { isObservationOnly } from "../domain/qualityCheckReconciliation.js";
import type { RunContext } from "../provenance/provenance.js";
import {
  untaggedScenarioId,
  scenariosBehindAccountsOf,
  type EvidenceObligations,
  type SharedScnCode,
  type UntaggedScenario,
} from "../census/evidenceObligations.js";
import { brokenItemsOf, fitnessReconciliationsOf } from "../domain/ledger.js";
import {
  isScenario,
  isPhantomScenario,
  isSuspenseScenario,
  isOutOfBalance,
  outOfBalanceCountOf,
  carriesNoScnCode,
} from "../domain/scenarioReconciliation.js";
import { assembleRenderInput, type RenderInput } from "../assemble/renderInput.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
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
import { evidenceColumns, columnHeader, evidenceCell } from "./evidenceGrid.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";

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

const VERDICT_GLYPH: Record<ScenarioVerdict, string> = {
  balanced: "✓",
  "out-of-balance": "✗",
};

function renderItem(item: ScenarioReconciliation["reconcilingItems"][number]): string {
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

function observationSuffix(item: ScenarioReconciliation["reconcilingItems"][number]): string | undefined {
  const observationOnly = isObservationOnly(item.outcome);
  if (item.outcome === "broken") {
    const where = [item.locator, item.message === undefined ? undefined : headlineOf(item.message)]
      .filter((part): part is string => part !== undefined && part.length > 0)
      .join(": ");
    return where.length > 0 ? ` (${cellSafe(where)})` : undefined;
  }
  if (observationOnly && item.fitnessFunction) return ` (${item.fitnessFunction})`;
  if (observationOnly && item.locator !== undefined) return ` (${item.locator})`;
  return undefined;
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

function renderRowExceptions(s: ScenarioReconciliation): string {
  const reconciling = s.reconcilingItems.map(renderItem).join("; ");
  const pending = s.pendingItems.map(renderPendingItem).join("; ");
  const groups = [reconciling, pending].filter((g) => g.length > 0);
  return groups.length === 0 ? "—" : groups.join("; ");
}

type SectionEmitter = (report: RenderInput) => readonly string[];

export type FeatureNames = ReadonlyMap<string, string>;

const titleSection: SectionEmitter = () => [CORE_MESSAGES[CoreMessage.ReportTitle], ""];

const runIntegritySection: SectionEmitter = (report) => {
  if (!hasBrokenEvidence({ scenarioReconciliations: report.ledger.scenarioReconciliations })) return [];
  const brokenItems = brokenItemsOf({
    scenarioReconciliations: report.ledger.scenarioReconciliations,
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
    lines.push(...(item.message ?? CORE_MESSAGES[CoreMessage.BrokenEvidenceNoMessage]).split("\n"));
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
  const scenarioReconciliations = report.summary.scenarioReconciliations;
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
      CORE_MESSAGES[CoreMessage.ScenarioReconciliationSubject],
      String(scenarioReconciliations.total),
      String(scenarioReconciliations.balanced),
      String(scenarioReconciliations.outOfBalance),
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
    scenarioReconciliations: report.ledger.scenarioReconciliations,
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
  const rows = report.ledger.scenarioReconciliations;
  const scenarios = rows.filter(isScenario);
  const groups = outOfBalanceByFeature(
    scenarios,
    report.evidenceObligations?.untaggedScenarios ?? [],
    report.metadata?.featureNames ?? {},
  );
  const ungrouped = ungroupedOutOfBalance(report.summary.scenarioReconciliations);
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

type ScenarioRows = RenderInput["ledger"]["scenarioReconciliations"];

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

function ungroupedOutOfBalance(totals: RenderInput["summary"]["scenarioReconciliations"]): string[] {
  return [
    ...(totals.phantom > 0 ? [CORE_MESSAGES[CoreMessage.PhantomScenarioRows](totals.phantom)] : []),
    ...(totals.suspense > 0 ? [CORE_MESSAGES[CoreMessage.SuspenseScenarioRows](totals.suspense)] : []),
  ];
}

function ungroupedTail(ungrouped: readonly string[]): string {
  return ungrouped.length > 0
    ? `; ${CORE_MESSAGES[CoreMessage.NotGroupedByFeature](ungrouped.join(CORE_MESSAGES[CoreMessage.AndJoiner]))}`
    : "";
}

const ledgerSection: SectionEmitter = (report) => {
  const scenarioRows = report.ledger.scenarioReconciliations.filter(
    isScenario
  );
  const phantomRows = report.ledger.scenarioReconciliations.filter(isPhantomScenario);
  const suspenseRows = report.ledger.scenarioReconciliations.filter(isSuspenseScenario);
  const scenarios = [...scenarioRows, ...phantomRows, ...suspenseRows];
  const withObservations = report.summary.testVolume !== undefined;
  return [
    CORE_MESSAGES[CoreMessage.ScenarioReconciliationsHeading],
    "",
    ...ledgerTallyLines(report.summary.scenarioReconciliations),
    ...(report.evidenceObligations ? censusLines(report.evidenceObligations, scenarioRows.length) : []),
    "",
    ...ledgerTableLines(scenarios, withObservations),
    "",
  ];
};

function ledgerTallyLines(totals: RenderInput["summary"]["scenarioReconciliations"]): string[] {
  const lines = [
    `- ${CORE_MESSAGES[CoreMessage.ScenarioReconciliationTally](totals.total, totals.balanced, totals.outOfBalance)}`,
  ];
  if (totals.phantom > 0) {
    lines.push(`- ${CORE_MESSAGES[CoreMessage.PhantomScenarioTally](totals.phantom)}`);
  }
  if (totals.suspense > 0) {
    lines.push(`- ${CORE_MESSAGES[CoreMessage.SuspenseScenarioTally](totals.suspense)}`);
  }
  return lines;
}

function censusLines(census: NonNullable<RenderInput["evidenceObligations"]>, accounts: number): string[] {
  const lines = [`- ${CORE_MESSAGES[CoreMessage.ExcludedScnOccurrences](census.excludedOccurrences)}`];
  const untagged = census.untaggedScenarios;
  if (untagged.length > 0) {
    const sorted = [...untagged].sort(
      (a, b) => a.feature.localeCompare(b.feature) || a.scenario.localeCompare(b.scenario)
    );
    lines.push(`- ${CORE_MESSAGES[CoreMessage.UntaggedScenarios](untagged.length)}`);
    for (const { feature, scenario } of sorted) {
      lines.push(`  - ${feature} : ${scenario}`);
    }
  }
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
  scenarios: readonly ScenarioReconciliation[],
  withObservations: boolean
): string[] {
  const columns = withObservations ? evidenceColumns(scenarios) : [];
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

export function renderMarkdown(
  evidenceReconciliation: EvidenceReconciliation,
  ctx: RunContext,
  evidenceObligations?: EvidenceObligations,
  featureNames?: FeatureNames
): string {
  return renderReport(assembleRenderInput(evidenceReconciliation, ctx, evidenceObligations, featureNames));
}
