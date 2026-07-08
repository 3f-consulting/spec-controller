/**
 * The markdown renderer — the human-readable spec reconciliation: summary views up
 * top (the derived cuts OF the reconciliation), the per-scenario Scenario Reconciliations last.
 * Each Scenario Reconciliation row carries its binary VERDICT (balanced | out-of-balance) and the
 * LIST of EVERY reconciling item that holds it out of balance (no single
 * picked winner; an out-of-balance scenario lists all its non-balanced items, typed).
 *
 * A PURE PRESENTATION of the shared whole-document `Report` model: the JSON
 * renderer serialises that model, and this renderer projects the SAME model to markdown,
 * so the two outputs are one model in two renderings and cannot diverge. `renderMarkdown`
 * keeps its `(balance, ctx, …)` signature — it builds `assembleReport(...)` internally
 * (mirroring `json.ts`) then delegates to `renderReport(report, featureNames)`, the
 * from-model pipeline (exposed for slice 3's render-from-saved-JSON path). Every section
 * emitter reads MATERIALISED fields off the report rather than recomputing them.
 *
 * The report IS the reconciliation; the per-scenario Evidence reconciliation is its core, and the
 * summary views — the Evidence reconciliation aggregate (the balance-check that verifies the accounts
 * agree), lint evidence obligations, out-of-balance by feature — are cuts OF it. Layout
 * reorganised summary-first / ledger-last.
 *
 * Parent: (@SCN-LDG-001).
 */

import type {
  ScenarioReconciliation,
  Outcome,
  ScenarioVerdict,
  RuntimeQualityCheck,
  EvidenceReconciliation,
} from "../model.js";
import {
  projectProvenanceObject,
  type RunContext,
} from "../provenance/provenance.js";
import type { EvidenceObligations } from "../census/evidenceObligations.js";
import { RUNTIME_QUALITY_CHECKS, type AttributedCount, type RuntimeEvidenceObservationKindCounts } from "../census/evidenceObservations.js";
import type { StaticEvidenceObservationKindCounts } from "../census/staticEvidenceObservations.js";
import { assembleReport, type Report } from "../assemble/report.js";
import { featureCodeOf } from "../lib/featureCode.js";

/** A short status glyph per reconciling-item outcome — a visual cue alongside the word. */
const ITEM_GLYPH: Record<Outcome, string> = {
  satisfied: "✓",
  "failing": "✗",
  // The watermelon: green on the surface (a guard exists), red within (not wired
  // into CI over the real source).
  "watermelon": "🍉",
  "missing": "∅",
  // CREDIT-SIDE: a credit citing an @SCN no declared scenario matches — the
  // reconciling item on a phantom scenario (@SCN-LDG-006).
  "cites-unknown-scenario": "👻",
  // CREDIT-SIDE: a credit citing NO @SCN at all — the reconciling item on the
  // suspense scenario (@SCN-LDG-007).
  "cites-no-scenario": "❓",
  // CREDIT-SIDE: a credit citing a REAL declared scenario at a quality-check it never
  // declared — the undemanded reconciling item on the real scenario's row (@SCN-LDG-008).
  "undemanded": "◇",
  // NEITHER-SIDE: a declared scenario reconciling to zero rows on both sides — the
  // degenerate both-missing reconciling item, blank on both sides (@SCN-LDG-009).
  "both-missing": "⊘",
};

/** A short glyph per scenario verdict. */
const VERDICT_GLYPH: Record<ScenarioVerdict, string> = {
  balanced: "✓",
  "out-of-balance": "✗",
};

/**
 * Render one reconciling item, labelled by its flat quality-check (the
 * label-=-tag rule): the `qualityCheck` value IS the tag word — a runtime item
 * is its bare level (`unit ✗ failing`, `integration ∅ missing`,
 * …); a lint item is `lint 🍉 watermelon`. Byte-identical to the prior `(kind, level)`
 * derivation, which already resolved to the same tag word.
 */
function renderItem(item: ScenarioReconciliation["reconcilingItems"][number]): string {
  // The NEITHER-side both-missing item is blank on both sides — it names no
  // quality-check (neither a debit evidence obligation nor a credit evidence observation), so it renders with
  // its glyph + outcome alone, no leading subject.
  if (item.outcome === "both-missing") {
    return `${ITEM_GLYPH["both-missing"]} both-missing`;
  }
  const subject = item.qualityCheck;
  // A CREDIT-SIDE item surfaces its WHERE-TO-FIX in the reconciliation cell (ruling
  // Q5): a lint credit (the unattributed static-guard folded onto the suspense row, ruling
  // Q4) shows its guard handle; a runtime credit (phantom `cites-unknown-scenario` or
  // suspense `cites-no-scenario`) shows its evidence observation locator. A DEBIT-side evidence obligation
  // (satisfied / missing / failing / watermelon) carries neither and renders bare, as before.
  const isCredit =
    item.outcome === "cites-no-scenario" ||
    item.outcome === "cites-unknown-scenario" ||
    // The undemanded credit also posts to a real scenario's row carrying its
    // evidence observation locator (ruling Q5) — surface the where-to-fix in the reconciliation cell.
    item.outcome === "undemanded";
  let suffix = "";
  if (isCredit && item.guard) suffix = ` (${item.guard})`;
  else if (isCredit && item.locator !== undefined) suffix = ` (${item.locator})`;
  return `${subject} ${ITEM_GLYPH[item.outcome]} ${item.outcome}${suffix}`;
}

/**
 * Render one scenario row: its id, its binary verdict, and EVERY reconciling item.
 * A balanced scenario has none — rendered as an em-dash placeholder.
 */
function renderScenario(s: ScenarioReconciliation): string {
  const items =
    s.reconcilingItems.length === 0
      ? "—"
      : s.reconcilingItems.map(renderItem).join("; ");
  return `| ${s.scnId} | ${VERDICT_GLYPH[s.verdict]} ${s.verdict} | ${items} |`;
}

/**
 * A section-emitter — one ordered slab of the report over the shared `Report` model (+ the
 * markdown-only `featureNames` label lookup). An empty array OMITS the section (so a cut
 * vanishes when its data is empty). Each emitter opens with its heading and ends with a
 * trailing blank line; `renderReport` flat-maps the ordered list and joins, so the blanks
 * separate the sections cleanly.
 */
type SectionEmitter = (report: Report) => string[];

/**
 * The target-derived `feature-code → slug` map — a markdown-only render arg (NOT
 * serialised by `renderJson`, NOT part of the shared `Report` model). Built by
 * `readFeatureNames` over `discoverFeatures`: each coded feature file's `@<FFF>` header maps
 * to its filename slug. Display enrichment for the by-feature cut (keyed on the `FFF` already
 * in every `scnId`), not a non-derivable machine fact — so it stays off the JSON surface.
 */
export type FeatureNames = ReadonlyMap<string, string>;

/** The report title — the report IS the reconciliation (the Evidence reconciliation is its core). */
// The report IS the reconciliation. "Ledger" names only the INPUT in canon (evidence
// entries by scenario); the rendered document is the reconciled OUTPUT, never "Ledger"
// (double-entry-manifesto). Renamed from "# Ledger" → "# Spec reconciliation" → here.
const titleSection: SectionEmitter = () => ["# Evidence Reconciliation", ""];

/**
 * The Run-provenance header (@SCN-RPT-001) — stays first after the title.
 * Facts only (project design §5): the resolved target repo, the input paths/flags
 * actually used, the run-start timestamp in UTC, and the target's source SHA (a null
 * SHA rendered as an explicit "unknown (non-git target)"). Projected off the shared
 * report model's `runProvenance` object via `projectProvenanceObject`, so this
 * header and the JSON `runProvenance` object never drift and the render needs no `ctx`.
 */
const provenanceSection: SectionEmitter = (report) => {
  const p = projectProvenanceObject(report.runProvenance);
  const lines = ["## Run provenance", ""];
  lines.push(`- Target repo: ${p.target}`);
  if (p.inputs.length === 0) {
    lines.push("- Inputs: none specified");
  } else {
    lines.push("- Inputs:");
    for (const { flag, value } of p.inputs) {
      lines.push(`  - \`${flag} ${value}\``);
    }
  }
  lines.push(`- Run timestamp (UTC): ${p.runStartUtc}`);
  lines.push(`- Source SHA: ${p.sourceSha ?? "unknown (non-git target)"}`);
  lines.push("");
  return lines;
};

/**
 * The Summary-views parent heading — the derived cuts OF the reconciliation
 * (Evidence reconciliation, lint evidence obligations, out-of-balance by feature)
 * read as cuts of the reconciliation, not a separate reconciliation. Always rendered (the
 * Evidence reconciliation beneath it are always present).
 */
const summaryViewsSection: SectionEmitter = () => ["## Summary views", ""];

/**
 * Evidence reconciliation (@SCN-RPT-004 Update — supersedes the `Axis |
 * Count` shape) — a SUBJECTS-AS-ROWS table: each subject (Scenario, Evidence obligation)
 * on its own row with its own Total, and balanced / out-of-balance as COLUMNS (both
 * subjects report into the same binary, so the "Verdict"/"outcome"/"Axis" words retire).
 * The evidence-obligation out-of-balance is decomposed IN PLACE into its reconciling-item
 * causes — three nested (`↳`) rows in canonical order (missing,
 * failing, the watermelon),
 * populating the out-of-balance column only and ALWAYS shown (a zero cause is itself a
 * fact). The missing row carries the bare-level split as Detail — missing
 * evidenceObligations grouped by subject, counting evidence obligations not scenarios.
 *
 * The scenario-verdict and evidence-obligation out-of-balance counts diverge ON PURPOSE:
 * one out-of-balance scenario can carry several missing evidenceObligations (SCN-PST-035's double
 * arm — the live 43 scenarios vs 44 evidenceObligations). The reshape presents that as a
 * granularity fact, not a contradiction. The nested causes reconcile to the evidenceObligation
 * out-of-balance. No bold. A pure presentation of the report's materialised
 * `summary.scenarios` / `summary.evidenceObligations` totals; markdown-only.
 */
const evidenceReconciliationSection: SectionEmitter = (report) => {
  const scenarios = report.summary.scenarios;
  const evidenceObligations = report.summary.evidenceObligations;
  const totalEvidenceObligations = evidenceObligations.total;
  // The evidenceObligation out-of-balance is the sum of the three non-balanced outcomes — the
  // total the nested causes reconcile to.
  const evidenceObligationsOutOfBalance = evidenceObligations.outOfBalance;
  // A five-cell row; an empty string renders as an empty cell (the Total/Balanced cells
  // of a nested cause row, and the Detail cell of a subject row).
  const row = (cells: readonly string[]): string => `| ${cells.join(" | ")} |`;
  // The bare-level split of the missing evidenceObligations, materialised on
  // the report as `{ subject, count }[]` in canonical order — rendered `43 unit + 1 integration`.
  const missingSplit = evidenceObligations.missingByQualityCheck
    .map(({ subject, count }) => `${count} ${subject}`)
    .join(" + ");
  const lines = [
    "### Evidence reconciliation",
    "",
    row(["Subject", "Total", "Balanced", "Out-of-balance", "Detail"]),
    row(["---", "---", "---", "---", "---"]),
    row([
      "Scenario",
      String(scenarios.total),
      String(scenarios.balanced),
      String(scenarios.outOfBalance),
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
  // Decompose the evidence-obligation out-of-balance into its causes, GROUPED by debit /
  // credit / neither (ruling Q2) — NOT a flat list. Each group
  // opens with a `↳ <group>-side` sub-total row, then its member outcomes as nested `↳ <outcome>`
  // rows (only the out-of-balance column populated). `missing` carries the bare-level split.
  // Every outcome is ALWAYS rendered, including a zero count (a zero cause is itself a fact).
  for (const { group, outcomes } of OUTCOME_GROUPS) {
    const groupTotal = outcomes.reduce((n, o) => n + evidenceObligations.byOutcome[o], 0);
    lines.push(row([`↳ ${group}-side`, "", "", String(groupTotal), ""]));
    for (const outcome of outcomes) {
      const detail = outcome === "missing" ? missingSplit : "";
      lines.push(row([`↳ ${outcome}`, "", "", String(evidenceObligations.byOutcome[outcome]), detail]));
    }
  }
  lines.push("");
  return lines;
};

/**
 * The reconciling-item outcomes grouped by SIDE (ruling Q2), in canonical
 * reading order — `satisfied` (the balanced outcome) excluded, since the decomposition is of the
 * OUT-of-balance total. Three groups:
 *   - `debit`   — an evidence obligation with no good evidence observation: missing / failing / watermelon.
 *   - `credit`  — an evidence observation with no evidence obligation: cites-unknown-scenario / cites-no-scenario /
 *                 undemanded.
 *   - `neither` — zero rows on both sides: both-missing (the degenerate shape, @SCN-LDG-009).
 * Every outcome is ALWAYS rendered (a zero count is a fact).
 */
const OUTCOME_GROUPS: readonly { group: "debit" | "credit" | "neither"; outcomes: readonly Outcome[] }[] = [
  { group: "debit", outcomes: ["missing", "failing", "watermelon"] },
  { group: "credit", outcomes: ["cites-unknown-scenario", "cites-no-scenario", "undemanded"] },
  { group: "neither", outcomes: ["both-missing"] },
];

/**
 * Test volume (@SCN-RPT-010) — the evidence-observation side under Summary views, the
 * counterpart to the Evidence reconciliation' demand side. Renders the balancing identity
 * (`N evidence observations = M attributed + C cites-unknown-scenario + K cites-no-scenario`, a
 * DERIVED view of the retained aggregate) then the per-quality-check evidence observation table
 * (all four runtime quality-checks, zeros shown — a fixed tally like Evidence reconciliation).
 * Omitted only when no evidence-observation read is threaded (the 3-arg back-compat path). The
 * identity holds BY CONSTRUCTION (one shared pass in src/evidenceObservations.ts); the renderer
 * only sums what the aggregate already counted by kind. Quality-checks read as their tag words,
 * lowercase (the label-=-tag rule). The numbers read off the report's materialised
 * `summary.testVolume` + `evidenceObservations.rawByRuntimeQualityCheck`.
 */
const testVolumeSection: SectionEmitter = (report) => {
  const evidenceObservations = report.evidenceObservations;
  const volume = report.summary.testVolume;
  if (!evidenceObservations || !volume) return [];
  const total = volume.totalEvidenceObservations;
  // Three DIRECT reads off the materialised kind-counts — the renderer does no
  // arithmetic on this line. The two credit-side terms are surfaced as their OWN outcomes (a
  // defect signal): cites-unknown-scenario (an evidence observation citing an undeclared @SCN, on a
  // phantom scenario) and cites-no-scenario (an evidence observation citing no @SCN, on the suspense
  // scenario), not folded into attributed. The identity total = attributed +
  // cites-unknown-scenario + cites-no-scenario holds BY CONSTRUCTION (one shared
  // countRuntimeEvidenceObservationKinds pass), so the three printed terms cannot drift from the total.
  const lines = [
    "### Test volume",
    "",
    `${total} evidence observations = ${volume.attributed} attributed + ${volume.citesUnknownScenario} cites-unknown-scenario + ${volume.citesNoScenario} cites-no-scenario.`,
    "",
    "| Quality-check | Evidence observations |",
    "| --- | --- |",
  ];
  for (const qualityCheck of RUNTIME_QUALITY_CHECKS) {
    lines.push(`| ${qualityCheck} | ${evidenceObservations.rawByRuntimeQualityCheck[qualityCheck]} |`);
  }
  lines.push("");
  return lines;
};

/**
 * Static guards (@SCN-USG-001) — the STATIC-guard evidence observation side under
 * Summary views, the mirror of `### Test volume` on the runtime axis. Renders the counts line
 * (`N guard(s) run, K unattributed static-guard(s)`) alone — a pure counts summary, symmetric with
 * `### Test volume` (2.4). The demanded count is implicit (`running − unattributed`), so it
 * is no longer printed. The per-guard member detail lives in the rows (demanded → each
 * scenario's `@lint` sub-row; undemanded → the suspense row's `cites-no-scenario` credit items), so
 * no list renders here. Omitted only when no static-guard census is threaded (the back-compat path).
 * The counts read off the report's materialised `summary.staticGuards`.
 */
const staticGuardsSection: SectionEmitter = (report) => {
  const counts = report.summary.staticGuards;
  if (!counts) return [];
  // A pure counts summary off `summary.staticGuards` (2.4) — symmetric with the
  // runtime `### Test volume` line. There is no census section: the per-guard DETAIL lives in
  // the rows (demanded → each scenario's `@lint` sub-row; the undemanded static-guards surface
  // as `cites-no-scenario` credit items on the `(no scenario)` suspense row). Only the running
  // volume + the unattributed count render here; the demanded count is implicit.
  return [
    "### Static guards",
    "",
    `${counts.runningGuardCount} guard(s) run, ${counts.unattributedStaticGuardCount} unattributed static-guard(s).`,
    "",
  ];
};

/**
 * Lint evidence obligations (@SCN-RPT-005; re-cut under Summary views with a
 * total line; labelled by the @lint TAG, not the kind) — lifts
 * every `kind === "static"` (`@lint`) evidence obligation out of the per-scenario trial
 * balance into its OWN `### Lint evidence obligations` table `| Scenario | Guard | Outcome |`,
 * one row per evidenceObligation in document order, each `outcome` carrying its `ITEM_GLYPH` glyph (so a
 * 🍉 watermelon reads at a glance). The total line outcomes how many of them reconcile
 * balanced — read off the report's materialised `summary.lint` tally. The
 * heading/total label is the tag word "lint" (the internal kind "static" is never rendered).
 * Omitted entirely (returns `[]`) when no scenario declares a lint evidenceObligation.
 * The rows are a pure derive over `report.evidenceReconciliation[].evidenceObligations[]`; markdown-only.
 */
const lintSection: SectionEmitter = (report) => {
  // DECLARED rows only — a lint evidence obligation is a declared-side thing. The suspense row's
  // lint credit (an unattributed static-guard, cites-no-scenario) is NOT an evidence obligation, so
  // it stays out of this table + tally; it surfaces on the suspense row's reconciling items.
  const rows = report.evidenceReconciliation
    .filter((s) => s.kind !== "phantom-scenario" && s.kind !== "suspense-scenario")
    .flatMap((s) =>
      s.evidenceObligations
        .filter((r) => r.qualityCheck === "lint")
        .map((r) => `| ${s.scnId} | ${r.guard!} | ${ITEM_GLYPH[r.outcome]} ${r.outcome} |`)
    );
  if (rows.length === 0) return [];
  const { satisfied, total } = report.summary.lint;
  return [
    "### Lint evidence obligations",
    "",
    `${satisfied} of ${total} lint evidence obligations reconcile satisfied.`,
    "",
    "| Scenario | Guard | Outcome |",
    "| --- | --- | --- |",
    ...rows,
    "",
  ];
};

/**
 * Out-of-balance by feature (@SCN-RPT-006; re-cut under Summary views with a
 * total line, rendered as a TABLE) — re-cuts the `verdict === "out-of-balance"`
 * scenarios by their feature code (the `<FFF>` parsed from each `scnId` via the shared
 * `featureCodeOf` helper), so a reader sees the discrepancy CONCENTRATION by feature.
 * One row per feature in first-appearance (document) order, with a per-feature count and
 * the out-of-balance ids. The `FFF` prefix only — the full feature names are added separately.
 * A malformed/unparseable scnId (`featureCodeOf` → null) falls back to its raw id as the
 * group key, so no discrepancy is dropped. The Feature cell reads `<slug> (<FFF>)` when a
 * `featureNames` map provides the slug for the code, else the bare `FFF` — the
 * fallback for an uncoded id (no file declares the code) or the no-map back-compat path.
 * Omitted entirely when no scenario is out of balance. A pure derive over
 * `report.evidenceReconciliation` (+ the model's `metadata.featureNames` title lookup);
 * markdown-only.
 */
const byFeatureSection: SectionEmitter = (report) => {
  // DECLARED scenarios only (ruling Q3) — phantom/suspense rows are grouped at
  // the end of the Ledger, not folded into the declared out-of-balance-by-feature cut.
  const scenarios = report.evidenceReconciliation.filter(
    (s) => s.kind !== "phantom-scenario" && s.kind !== "suspense-scenario"
  );
  const groups = new Map<string, string[]>();
  for (const s of scenarios) {
    if (s.verdict !== "out-of-balance") continue;
    const code = featureCodeOf(s.scnId) ?? s.scnId;
    const ids = groups.get(code) ?? [];
    ids.push(s.scnId);
    groups.set(code, ids);
  }
  if (groups.size === 0) return [];
  const outOfBalance = scenarios.filter(
    (s) => s.verdict === "out-of-balance"
  ).length;
  const lines = [
    "### Out-of-balance by feature",
    "",
    `The ${outOfBalance} of ${scenarios.length} out-of-balance scenarios, grouped by feature:`,
    "",
    "| Feature | Count | Out-of-balance `@SCN` ids |",
    "| --- | --- | --- |",
  ];
  for (const [code, ids] of groups) {
    const slug = report.metadata?.featureNames?.[code];
    const label = slug ? `${slug} (${code})` : code;
    lines.push(`| ${label} | ${ids.length} | ${ids.join(", ")} |`);
  }
  lines.push("");
  return lines;
};

/**
 * One corpus-driven evidence column in the ledger: the lint (static) column,
 * or a runtime quality-check column. The column SET is corpus-driven — only the quality-checks
 * the run declares or observes appear, so e2e / performance show up only when present.
 */
type EvidenceColumn = { kind: "lint" } | { kind: "runtime"; qualityCheck: RuntimeQualityCheck };

/**
 * The corpus-driven evidence columns: lint first (when any scenario declares a
 * static evidenceObligation), then each runtime quality-check present in DEMAND (a declared evidenceObligation)
 * or evidence-observation (an attributed evidenceObservation), in canonical quality-check order. Reads the report's
 * `evidenceReconciliation` scenarios + `evidenceObservations.attributed` counts.
 */
function evidenceColumns(
  scenarios: readonly ScenarioReconciliation[],
  attributed: readonly AttributedCount[]
): EvidenceColumn[] {
  // Only DECLARED rows carry evidence obligations that drive columns — a phantom / suspense
  // row's credit-side items are not evidence obligations, so they never add a column.
  const scenarioRows = scenarios.filter(
    (s) => s.kind !== "phantom-scenario" && s.kind !== "suspense-scenario"
  );
  const hasStatic = scenarioRows.some((s) =>
    s.evidenceObligations.some((o) => o.qualityCheck === "lint")
  );
  const qualityChecksPresent = new Set<RuntimeQualityCheck>();
  for (const s of scenarioRows) {
    for (const o of s.evidenceObligations) {
      // A both-missing item carries no quality-check — it drives no column.
      if (o.qualityCheck && o.qualityCheck !== "lint") qualityChecksPresent.add(o.qualityCheck);
    }
  }
  for (const a of attributed) qualityChecksPresent.add(a.qualityCheck);
  const columns: EvidenceColumn[] = [];
  if (hasStatic) columns.push({ kind: "lint" });
  for (const qualityCheck of RUNTIME_QUALITY_CHECKS) {
    if (qualityChecksPresent.has(qualityCheck)) columns.push({ kind: "runtime", qualityCheck });
  }
  return columns;
}

/** The column's header — the tag word, title-cased (Lint / Unit / Integration / …). */
function columnHeader(col: EvidenceColumn): string {
  const word = col.kind === "lint" ? "lint" : col.qualityCheck;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * One evidence cell — the four-way demand×evidence observation encoding. It counts BACKING
 * (presence), NOT quality: a failing runtime evidenceObligation shows its count (the
 * failing-ness lives in the Verdict + Reconciling-items columns), so `∅` is
 * unambiguously missing (zero evidenceObservations). The lint cell reads the
 * scenario's static evidenceObligation outcomes (lint is not a counted evidence observation): the count of
 * guards PRESENT — `balanced` or the watermelon (the script exists; its inadequacy is
 * quality, in Reconciling-items 🍉). No `(N)` for lint (guards are observed only for
 * declared `@lint`). The count exposes backing, not quality — never rank by it.
 */
function evidenceCell(
  s: ScenarioReconciliation,
  col: EvidenceColumn,
  attributed: readonly AttributedCount[]
): string {
  // A PHANTOM / suspense row has no evidence-obligation demand of its own — its
  // whole story is the credit-side reconciling item. Every evidence cell is neither-declared-
  // nor-a-matched-evidence obligation, so it reads `—`; the citation shows in Reconciling items.
  if (s.kind === "phantom-scenario" || s.kind === "suspense-scenario") return "—";
  if (col.kind === "lint") {
    const statics = s.evidenceObligations.filter((o) => o.qualityCheck === "lint");
    if (statics.length === 0) return "—"; // not declared
    const present = statics.filter(
      (o) =>
        o.outcome === "satisfied" ||
        o.outcome === "watermelon"
    ).length;
    return present > 0 ? String(present) : "∅"; // ∅ = declared, all missing
  }
  const demanded = s.evidenceObligations.some(
    (o) => o.qualityCheck === col.qualityCheck
  );
  const count =
    attributed.find((a) => a.scnId === s.scnId && a.qualityCheck === col.qualityCheck)?.count ?? 0;
  if (demanded) return count > 0 ? String(count) : "∅";
  return count > 0 ? `(${count})` : "—";
}

/**
 * The fixed cell key — the same every run, so it is NOTATION, not data
 * (facts-only). Row 1 says "attributed to", not "satisfy/balanced": the cell counts
 * backing (pass+fail), and a failing test is attributed but not balanced.
 */
const CELL_KEY: readonly string[] = [
  "| Cell | Meaning |",
  "| --- | --- |",
  "| `N` | N evidence observations attributed to a declared evidence obligation |",
  "| `∅` | evidence obligation declared, no evidence observation — missing |",
  "| `(N)` | N evidence observations present, no evidence obligation declared |",
  "| `—` | neither declared nor present |",
];

/**
 * The ledger (moved to the END) — the per-scenario
 * table, with its summary lines on top: the verdict tally bullet, and (when a
 * declared-evidence-obligations census is threaded) the excluded-occurrence bullet relocated
 * here from the dissolved `## Declared corpus` section (Q1a). When the
 * evidence-observation aggregate is threaded, the row gains corpus-driven evidence
 * columns between Scenario and Verdict, each a four-way demand×evidence observation cell, preceded by the
 * fixed cell key; without it the original three-column ledger is preserved (the 2-/3-arg callers
 * stay green). Markdown-only (the JSON carries the raw scenario facts + the declared / observed
 * objects); the verdict-tally bullet keeps the `scenario(s):` phrasing other surfaces guard on.
 * Reads the report's materialised `summary.scenarios`, `evidenceObligations`, and
 * `evidenceObservations.attributed`.
 */
const ledgerSection: SectionEmitter = (report) => {
  // Group DECLARED scenario rows first, then the PHANTOM rows, then the SUSPENSE row as
  // distinct blocks at the END (ruling Q3) — a phantom/suspense is not a
  // scenario, so it never mingles with the declared verdict rows.
  const scenarioRows = report.evidenceReconciliation.filter(
    (s) => s.kind !== "phantom-scenario" && s.kind !== "suspense-scenario"
  );
  const phantomRows = report.evidenceReconciliation.filter((s) => s.kind === "phantom-scenario");
  const suspenseRows = report.evidenceReconciliation.filter((s) => s.kind === "suspense-scenario");
  const scenarios = [...scenarioRows, ...phantomRows, ...suspenseRows];
  const evidenceObservations = report.evidenceObservations;
  const totals = report.summary.scenarios;
  const lines = [
    // The reconciled per-scenario OUTPUT table — "Scenario Reconciliations", not "Ledger"
    // ("Ledger" is the INPUT concept in canon; double-entry-manifesto).
    "## Scenario Reconciliations",
    "",
    // The headline verdict tally counts DECLARED scenarios only (ruling Q3).
    `- ${totals.total} scenario(s): ${totals.balanced} balanced, ` +
      `${totals.outOfBalance} out-of-balance.`,
  ];
  // The phantom (P) count is shown SEPARATELY, never folded into out-of-balance (ruling Q3).
  if (totals.phantom > 0) {
    lines.push(
      `- ${totals.phantom} phantom-scenario(s): cited by an evidence observation, declared by no feature.`
    );
  }
  // The suspense (S) count is shown SEPARATELY too — credits citing no scenario at all
  // (uncited evidence observations + unattributed static-guards), aggregated into one row (ruling Q3).
  if (totals.suspense > 0) {
    lines.push(
      `- ${totals.suspense} suspense-scenario(s): credits citing no scenario, aggregated into "(no scenario)".`
    );
  }
  if (report.evidenceObligations) {
    // The declared-corpus CENSUS — declared-side facts on report.evidenceObligations.
    // These re-homed here from the dissolved `## Warnings` section: they are census
    // facts, NOT warnings and NOT reconciling items, so they ride in the ledger summary co-located
    // with the excluded-occurrence bullet (the evidenceObligations census view). Facts only —
    // count + locator.
    lines.push(
      `- ${report.evidenceObligations.excludedOccurrences} @SCN ids seen in non-tag context, excluded`
    );
    // Untagged scenarios (@SCN-RPT-014) — Gherkin scenarios with no @SCN tag, located by
    // `feature : scenario`. Sorted defensively (a hand-built corpus fixture may be unsorted).
    const untagged = report.evidenceObligations.untaggedScenarios;
    if (untagged.length > 0) {
      const sorted = [...untagged].sort(
        (a, b) => a.feature.localeCompare(b.feature) || a.scenario.localeCompare(b.scenario)
      );
      lines.push(`- ${untagged.length} scenario(s) carry no @SCN tag:`);
      for (const { feature, scenario } of sorted) {
        lines.push(`  - ${feature} : ${scenario}`);
      }
    }
    // Prose-only codes (@SCN-RPT-015) — @SCN ids mentioned in prose but never tagged anywhere
    // (the dangling references). The bare code is its own locator. Sorted, after untagged.
    const proseOnly = report.evidenceObligations.proseOnlyCodes;
    if (proseOnly.length > 0) {
      lines.push(`- ${proseOnly.length} @SCN code(s) appear only in prose, never as a tag:`);
      for (const code of [...proseOnly].sort()) {
        lines.push(`  - ${code}`);
      }
    }
  }
  lines.push("");

  const columns = evidenceObservations
    ? evidenceColumns(scenarios, evidenceObservations.attributed)
    : [];
  if (evidenceObservations && columns.length > 0) {
    // The cell key precedes the table (notation, not data).
    lines.push(...CELL_KEY, "");
    const headers = [
      "Scenario",
      ...columns.map(columnHeader),
      "Verdict",
      "Reconciling items",
    ];
    lines.push(`| ${headers.join(" | ")} |`);
    lines.push(`| ${headers.map(() => "---").join(" | ")} |`);
    for (const s of scenarios) {
      const cells = columns.map((col) => evidenceCell(s, col, evidenceObservations.attributed));
      const items =
        s.reconcilingItems.length === 0
          ? "—"
          : s.reconcilingItems.map(renderItem).join("; ");
      lines.push(
        `| ${[s.scnId, ...cells, `${VERDICT_GLYPH[s.verdict]} ${s.verdict}`, items].join(" | ")} |`
      );
    }
  } else {
    lines.push("| Scenario | Verdict | Reconciling items |");
    lines.push("| --- | --- | --- |");
    for (const s of scenarios) {
      lines.push(renderScenario(s));
    }
  }
  lines.push("");
  return lines;
};

/**
 * The ordered section list (project design §2; reorganised summary-first / ledger-last,
 * test volume added): title → provenance → Summary views
 * (Evidence reconciliation, test volume, lint evidence obligations, out-of-balance by feature)
 * → the ledger. The `## Warnings` section was RETIRED entirely: the
 * no-evidence-declared scenario is now a `both-missing` ledger row, and the declared-corpus
 * census facts (untagged scenarios / prose-only codes) re-homed into the ledger summary.
 */
const SECTIONS: readonly SectionEmitter[] = [
  titleSection,
  provenanceSection,
  summaryViewsSection,
  evidenceReconciliationSection,
  testVolumeSection,
  staticGuardsSection,
  lintSection,
  byFeatureSection,
  ledgerSection,
];

/**
 * Render the whole-document report model to markdown — the from-model pipeline,
 * a PURE PRESENTATION over the same `Report` the JSON serialises. Exposed for slice 3's
 * render-from-saved-JSON path: a consumer rebuilds a `Report` from banked JSON and
 * renders the human view off it, with no `RunContext` in hand. Needs NO external map — the
 * feature titles are read off `report.metadata.featureNames` (@SCN-RMD-006; nested under
 * `metadata`), so the by-feature cut names each feature in full from the model alone.
 */
export function renderReport(report: Report): string {
  return SECTIONS.flatMap((section) => section(report)).join("\n");
}

/**
 * Regenerate the markdown from a banked `spec-reconciliation.json` ALONE (@SCN-RMD-007)
 * — the render-from-saved-JSON seam. `JSON.parse` the stored whole-document report back into a
 * `Report` and render it via `renderReport`: no `RunContext`, no live inputs, the JSON is the
 * whole document. Drift-equality is the acceptance — the markdown from the saved JSON equals the
 * markdown rendered directly from the same run (the by-feature titles included, which is why the
 * feature-title model-completion @SCN-RMD-006 is the enabling dependency). The load-bearing proof
 * that the JSON is the model, not a lossy projection.
 */
export function renderReportFromJson(json: string): string {
  return renderReport(JSON.parse(json) as Report);
}

/**
 * Render the reconciliation to markdown. Keeps its `(balance, ctx, …)` signature (mirroring
 * `json.ts`): it assembles the shared whole-document report from the reconcile pieces —
 * threading the live `featureNames` title source INTO `assembleReport`, so the titles
 * land on the model — then delegates to `renderReport`. So `writer.ts` and the unit tests are
 * untouched, the markdown stays byte-identical (same slugs, now model-sourced), and it is
 * provably a presentation of the same model the JSON serialises.
 */
export function renderMarkdown(
  balance: EvidenceReconciliation,
  ctx: RunContext,
  evidenceObligations?: EvidenceObligations,
  evidenceObservations?: RuntimeEvidenceObservationKindCounts,
  featureNames?: FeatureNames,
  guards?: StaticEvidenceObservationKindCounts
): string {
  const report = assembleReport(balance, ctx, evidenceObligations, evidenceObservations, guards, featureNames);
  return renderReport(report);
}
