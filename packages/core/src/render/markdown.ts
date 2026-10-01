import type {
  ScenarioReconciliation,
  Outcome,
  ScenarioVerdict,
  Ledger,
  PendingItem,
} from "../model.js";
import { OUTCOME_DESCRIPTION, OUT_OF_BALANCE_OUTCOMES, OUTCOME_SIDE_PROFILE } from "../model.js";
import type { RunContext } from "../provenance/provenance.js";
import type { EvidenceObligations, SharedScnCode, UntaggedScenario } from "../census/evidenceObligations.js";
import { brokenItemsOf, fitnessReconciliationsOf } from "../domain/ledger.js";
import { isScenario } from "../domain/scenarioReconciliation.js";
import { assembleRenderInput, type RenderInput } from "../assemble/renderInput.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { hasBrokenEvidence } from "../domain/ledger.js";
import { runVerdictSection } from "./runVerdict.js";
import { scenarioCodeErrorsSection } from "./scenarioCodeErrorsSection.js";
import { provenanceSection } from "./provenanceSection.js";
import { configurationNotReadSection } from "./configurationNotRead.js";
import { discoveryScopeSection } from "./discoveryScope.js";
import { staticChecksSection } from "./staticChecks.js";
import { behaviouralRunnersSection } from "./behaviouralRunners.js";
import { excludedStepsSection } from "./excludedSteps.js";
import { reconcilerSection } from "./reconcilerSteps.js";
import { stepAccountingSection } from "./stepAccounting.js";
import { testVolumeSection } from "./testVolume.js";
import { featureCodeOf } from "../domain/featureCode.js";
import { evidenceColumns, columnHeader, evidenceCell } from "./evidenceGrid.js";

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
  const suffix = creditSuffix(item) ?? "";
  return `${subject} ${ITEM_GLYPH[item.outcome]} ${OUTCOME_DESCRIPTION[item.outcome]}${suffix}`;
}

function creditSuffix(item: ScenarioReconciliation["reconcilingItems"][number]): string | undefined {
  const profile = OUTCOME_SIDE_PROFILE[item.outcome];
  const isCredit = profile.obligation === "None" && profile.observation === "Exists";
  if (item.outcome === "broken") {
    const where = [item.locator, item.message === undefined ? undefined : headlineOf(item.message)]
      .filter((part): part is string => part !== undefined && part.length > 0)
      .join(": ");
    return where.length > 0 ? ` (${cellSafe(where)})` : undefined;
  }
  if (isCredit && item.staticCheck) return ` (${item.staticCheck})`;
  if (isCredit && item.locator !== undefined) return ` (${item.locator})`;
  return undefined;
}

function headlineOf(message: string): string {
  return message.split("\n").map((line) => line.trim()).find((line) => line.length > 0) ?? "";
}

function cellSafe(text: string): string {
  return text.replace(/\s+/g, " ").replace(/\|/g, "\\|").trim();
}

function renderPendingItem(item: PendingItem): string {
  return item.qualityCheck === undefined ? "⏳ pending" : `⏳ pending: ${item.qualityCheck}`;
}

function renderRowExceptions(s: ScenarioReconciliation): string {
  const reconciling = s.reconcilingItems.map(renderItem).join("; ");
  const pending = (s.pendingItems ?? []).map(renderPendingItem).join("; ");
  const groups = [reconciling, pending].filter((g) => g.length > 0);
  return groups.length === 0 ? "—" : groups.join("; ");
}

function renderScenario(s: ScenarioReconciliation): string {
  return `| ${s.scnId} | ${VERDICT_GLYPH[s.verdict]} ${s.verdict} | ${renderRowExceptions(s)} |`;
}

type SectionEmitter = (report: RenderInput) => string[];

export type FeatureNames = ReadonlyMap<string, string>;

const titleSection: SectionEmitter = () => ["# Evidence Reconciliation", ""];

const runIntegritySection: SectionEmitter = (report) => {
  if (!hasBrokenEvidence({ scenarioReconciliations: report.ledger.scenarioReconciliations })) return [];
  const brokenItems = brokenItemsOf({
    scenarioReconciliations: report.ledger.scenarioReconciliations,
  });
  const count = brokenItems.length;
  const proofs =
    count === 1
      ? "1 proof never ran, so the behaviour it proves was never exercised."
      : `${count} proofs never ran, so the behaviours they prove were never exercised.`;
  const lines = [
    "## Run integrity: unsound",
    "",
    `⚠ **This run is unsound.** ${proofs} A \`missing\` outcome ` +
      "below may therefore be a BROKEN proof rather than an absent one — it cannot be read as " +
      `"write the test", because the test may already be there. Fix the harness and regenerate.`,
    "",
  ];
  for (const item of brokenItems) {
    lines.push(`- \`${item.locator ?? "(evidence not named by the runner)"}\` — what broke:`);
    lines.push("");
    lines.push("```text");
    lines.push(...(item.message ?? "(no message reported by the runner)").split("\n"));
    lines.push("```");
    lines.push("");
  }
  return lines;
};

const summaryViewsSection: SectionEmitter = () => ["## Summary views", ""];

const evidenceReconciliationSection: SectionEmitter = (report) => {
  const scenarioReconciliations = report.summary.scenarioReconciliations;
  const evidenceObligations = report.summary.evidenceObligations;
  const totalEvidenceObligations = evidenceObligations.total;
  const evidenceObligationsOutOfBalance = evidenceObligations.outOfBalance;
  const row = (cells: readonly string[]): string => `| ${cells.join(" | ")} |`;
  const missingSplit = evidenceObligations.missingByQualityCheck
    .map(({ subject, count }) => `${count} ${subject}`)
    .join(" + ");
  const lines = [
    "### Evidence reconciliation",
    "",
    row(["Subject", "Total", "Balanced", "Out-of-balance", "Detail"]),
    row(["---", "---", "---", "---", "---"]),
    row([
      "Scenario Reconciliation",
      String(scenarioReconciliations.total),
      String(scenarioReconciliations.balanced),
      String(scenarioReconciliations.outOfBalance),
      "",
    ]),
    row([
      "Evidence obligation",
      String(totalEvidenceObligations),
      String(evidenceObligations.byOutcome.satisfied),
      String(evidenceObligationsOutOfBalance),
      "",
    ]),
  ];
  for (const outcome of OUT_OF_BALANCE_OUTCOMES) {
    const detail = outcome === "missing" ? missingSplit : "";
    lines.push(row([`↳ ${OUTCOME_DESCRIPTION[outcome]}`, "", "", String(evidenceObligations.byOutcome[outcome]), detail]));
  }
  lines.push(...pendingTally(report.summary.pending));
  lines.push("");
  return lines;
};

function pendingTally(pending: number): string[] {
  return pending > 0
    ? ["", `⏳ ${pending} Pending Item(s) — deferred, tallied apart from balanced and out-of-balance.`]
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
    "### Fitness evidence obligations",
    "",
    `${satisfied} of ${total} fitness evidence obligations reconcile satisfied.`,
    "",
    "| Scenario | Outcome |",
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
  const outOfBalance = scenarios.filter(
    (s) => s.verdict === "out-of-balance"
  ).length;
  const head = `${outOfBalance} of ${scenarios.length} scenario rows out of balance`;
  return [
    "### Out-of-balance by feature",
    "",
    `${head}${groups.size > 0 ? ", grouped by feature" : ""}${ungroupedTail(ungrouped)}.`,
    "",
    ...byFeatureTableLines(groups, report.metadata?.featureNames),
  ];
};

interface FeatureGroup {
  ids: string[];
  uncoded: number;
}

type ScenarioRows = RenderInput["ledger"]["scenarioReconciliations"];

function outOfBalanceByFeature(
  scenarios: ScenarioRows,
  untagged: readonly UntaggedScenario[],
  featureNames: Readonly<Record<string, string>>,
): Map<string, FeatureGroup> {
  const codeOfFile = new Map(Object.entries(featureNames).map(([code, slug]) => [`${slug}.feature`, code]));
  const featureOf = new Map(untagged.map((u) => [`${u.feature} : ${u.scenario}`, codeOfFile.get(u.feature) ?? u.feature]));
  const groups = new Map<string, FeatureGroup>();
  for (const s of scenarios) {
    if (s.verdict !== "out-of-balance") continue;
    const uncoded = carriesNoScnCode(s);
    const key = (uncoded ? featureOf.get(s.scnId) : featureCodeOf(s.scnId)) ?? s.scnId;
    const group = groups.get(key) ?? { ids: [], uncoded: 0 };
    if (uncoded) group.uncoded += 1;
    else group.ids.push(s.scnId);
    groups.set(key, group);
  }
  return groups;
}

function carriesNoScnCode(row: ScenarioRows[number]): boolean {
  return row.reconcilingItems.some((item) => item.outcome === "no-scn-code");
}

function byFeatureTableLines(
  groups: ReadonlyMap<string, FeatureGroup>,
  featureNames: Readonly<Record<string, string>> | undefined,
): string[] {
  if (groups.size === 0) return [];
  const lines = ["| Feature | Count | Out-of-balance `@SCN` ids |", "| --- | --- | --- |"];
  for (const [key, group] of groups) {
    const slug = featureNames?.[key];
    const label = slug ? `${slug} (${key})` : key;
    lines.push(`| ${label} | ${group.ids.length + group.uncoded} | ${idsCell(group)} |`);
  }
  lines.push("");
  return lines;
}

function idsCell(group: FeatureGroup): string {
  const ids = group.ids.join(", ");
  if (group.uncoded === 0) return ids;
  const uncoded = `${group.uncoded} with no \`@SCN\` code`;
  return ids === "" ? uncoded : `${ids} and ${uncoded}`;
}

function ungroupedOutOfBalance(totals: RenderInput["summary"]["scenarioReconciliations"]): string[] {
  return [
    ...(totals.phantom > 0 ? [`${totals.phantom} phantom-scenario row(s)`] : []),
    ...(totals.suspense > 0 ? [`${totals.suspense} suspense-scenario row(s)`] : []),
  ];
}

function ungroupedTail(ungrouped: readonly string[]): string {
  return ungrouped.length > 0
    ? `; ${ungrouped.join(" and ")} out of balance, not grouped by feature (no feature file names them)`
    : "";
}

const ledgerSection: SectionEmitter = (report) => {
  const scenarioRows = report.ledger.scenarioReconciliations.filter(
    isScenario
  );
  const phantomRows = report.ledger.scenarioReconciliations.filter((s) => s.kind === "phantom-scenario");
  const suspenseRows = report.ledger.scenarioReconciliations.filter((s) => s.kind === "suspense-scenario");
  const scenarios = [...scenarioRows, ...phantomRows, ...suspenseRows];
  const withObservations = report.summary.testVolume !== undefined;
  return [
    "## Scenario Reconciliations",
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
    `- ${totals.total} Scenario Reconciliation(s): ${totals.balanced} balanced, ` +
      `${totals.outOfBalance} out-of-balance.`,
  ];
  if (totals.phantom > 0) {
    lines.push(
      `- ${totals.phantom} phantom-scenario(s): cited by an evidence observation, named by no feature.`
    );
  }
  if (totals.suspense > 0) {
    lines.push(
      `- ${totals.suspense} suspense-scenario(s): credits citing no scenario, aggregated into "(no scenario)".`
    );
  }
  return lines;
}

function censusLines(census: NonNullable<RenderInput["evidenceObligations"]>, accounts: number): string[] {
  const lines = [`- ${census.excludedOccurrences} @SCN ids seen in non-tag context, excluded`];
  const untagged = census.untaggedScenarios;
  if (untagged.length > 0) {
    const sorted = [...untagged].sort(
      (a, b) => a.feature.localeCompare(b.feature) || a.scenario.localeCompare(b.scenario)
    );
    lines.push(`- ${untagged.length} scenario(s) carry no @SCN tag:`);
    for (const { feature, scenario } of sorted) {
      lines.push(`  - ${feature} : ${scenario}`);
    }
  }
  lines.push(...sharedScnCodeLines(census.sharedScnCodes ?? [], accounts));
  return lines;
}

function sharedScnCodeLines(shared: readonly SharedScnCode[], accounts: number): string[] {
  if (shared.length === 0) return [];
  const scenarios = accounts + shared.reduce((extra, code) => extra + code.scenarios.length - 1, 0);
  return [
    `- The corpus holds ${scenarios} scenarios in ${accounts} accounts — ${shared.length} @SCN code(s) carried by more than one scenario:`,
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
  if (!(withObservations && columns.length > 0)) {
    return [
      "| Scenario | Verdict | Reconciling items |",
      "| --- | --- | --- |",
      ...scenarios.map(renderScenario),
    ];
  }
  const headers = [
    "Scenario",
    ...columns.map(columnHeader),
    "Verdict",
    "Reconciling items",
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
  staticChecksSection,
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
