/**
 * The markdown renderer — the human-readable spec reconciliation: summary views up
 * top (the derived cuts OF the reconciliation), the per-scenario Scenario Reconciliations last.
 * Each Scenario Reconciliation row carries its binary VERDICT (balanced | out-of-balance) and the
 * LIST of EVERY reconciling item that holds it out of balance (no single
 * picked winner; an out-of-balance scenario lists all its non-balanced items, typed).
 *
 * A PURE PRESENTATION of the shared whole-document `EvidenceReconciliation` model: the JSON
 * renderer serialises that model, and this renderer projects the SAME model to markdown,
 * so the two outputs are one model in two renderings and cannot diverge. `renderMarkdown`
 * keeps its `(balance, ctx, …)` signature — it builds `assembleRenderInput(...)` internally
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
  Ledger,
  PendingItem,
} from "../model.js";
// The single source for the human-readable outcome gloss — rendered in place of the bare
// handle wherever an outcome surfaces to a reader (3F-1626) — and the DERIVED leaf list the
// decomposition walks (3F-1806): both live in the model, so the renderer cannot drift from the
// union. Internal core imports (NOT on the frozen v1 barrel).
import { OUTCOME_DESCRIPTION, OUT_OF_BALANCE_OUTCOMES, OUTCOME_SIDE_PROFILE } from "../model.js";
import type { RunContext } from "../provenance/provenance.js";
import type { EvidenceObligations } from "../census/evidenceObligations.js";
// THE MODEL DERIVATIONS THE RENDERER READS (3F-2203) — it projects these; it does not compute them.
import { brokenItemsOf, lintReconciliationsOf } from "../domain/ledger.js";
import { isScenario } from "../domain/scenarioReconciliation.js";
import { assembleRenderInput, type RenderInput } from "../assemble/renderInput.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
// The run-integrity predicate (@SCN-LDG-018) — the existential scan for a `broken` reconciling
// item. The renderer asks the predicate and prints the HEADLINE word: predicate-name ≠
// headline-word (`hasBrokenEvidence` → "unsound"), exactly as `isBalanced` → "balanced".
// The three WHOLE-RUN predicates the verdict headline (@SCN-RPT-022) asks — the SAME three the
// CLI asks to set its exit code, in the SAME dominance order. The renderer never re-scans the
// reconciliation for a verdict of its own, so the headline cannot drift from the code it names.
import { hasBrokenEvidence } from "../domain/ledger.js";
import { runVerdictSection } from "./runVerdict.js";
import { provenanceSection } from "./provenanceSection.js";
import { discoveryScopeSection } from "./discoveryScope.js";
import { staticChecksSection } from "./staticChecks.js";
import { behaviouralRunnersSection } from "./behaviouralRunners.js";
import { excludedStepsSection } from "./excludedSteps.js";
import { reconcilerSection } from "./reconcilerSteps.js";
import { stepAccountingSection } from "./stepAccounting.js";
import { testVolumeSection } from "./testVolume.js";
import { featureCodeOf } from "../lib/featureCode.js";
import { evidenceColumns, columnHeader, evidenceCell } from "./evidenceGrid.js";

/** A short status glyph per reconciling-item outcome — a visual cue alongside the word. */
const ITEM_GLYPH: Record<Outcome, string> = {
  satisfied: "✓",
  "failing": "✗",
  // The watermelon: green on the surface (a static check exists), red within (not wired
  // into CI over the real source).
  "watermelon": "🍉",
  "missing": "∅",
  // DEBIT-SIDE: a real, ordinary scenario carrying no @SCN, so its Evidence Obligation has no code
  // for an Evidence Observation to LINK to (@SCN-LDG-021). Not phantom, not suspense — the scenario
  // exists and cucumber runs it. The debit twin of `cites-no-scenario`: same missing link, opposite
  // side. It can never be proven, so its row is always out-of-balance.
  "no-scn-code": "🔗",
  // CREDIT-SIDE: a credit citing an @SCN no scenario matches — the
  // reconciling item on a phantom scenario (@SCN-LDG-006).
  "cites-unknown-scenario": "👻",
  // CREDIT-SIDE: a credit citing NO @SCN at all — the reconciling item on the
  // suspense scenario (@SCN-LDG-007).
  "cites-no-scenario": "❓",
  // CREDIT-SIDE: evidence that NEVER RAN — a vitest suite that failed to collect before naming a
  // test (@SCN-LDG-017), or a cucumber step two or more step definitions match (@SCN-LDG-019).
  // Either way it posts to the suspense row: the credit can never discharge an obligation.
  "broken": "💥",
  // CREDIT-SIDE: a credit citing a REAL scenario at a quality-check it never
  // named — the no-evidence-obligation reconciling item on the real scenario's row (@SCN-LDG-008).
  "no-evidence-obligation": "◇",
  // NEITHER-SIDE: a scenario reconciling to zero rows on both sides — the
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
 * is its bare level (`unit ✗ Evidence Observation is failing`,
 * `integration ∅ Evidence Observation is missing`, …); a lint item is
 * `lint 🍉 Evidence Observation is passing but fabricated`. The outcome renders as its
 * CANON DESCRIPTION (the single-sourced `OUTCOME_DESCRIPTION`, 3F-1626) — never the bare
 * handle, which is meaningless to a human reading a CI log. The glyph is retained.
 */
function renderItem(item: ScenarioReconciliation["reconcilingItems"][number]): string {
  // The NEITHER-side both-missing item is blank on both sides — it names no
  // quality-check (neither a debit evidence obligation nor a credit evidence observation), so it renders with
  // its glyph + description alone, no leading subject.
  if (item.outcome === "both-missing") {
    return `${ITEM_GLYPH["both-missing"]} ${OUTCOME_DESCRIPTION["both-missing"]}`;
  }
  // The `no-scn-code` item (@SCN-LDG-021) is SCENARIO-scope, like both-missing: without an @SCN
  // code no observation can link at ANY tier, so it names no quality-check and renders with its
  // glyph + description alone. (Debit-side, but subject-less — the missing thing is the LINK.)
  if (item.outcome === "no-scn-code") {
    return `${ITEM_GLYPH["no-scn-code"]} ${OUTCOME_DESCRIPTION["no-scn-code"]}`;
  }
  const subject = item.qualityCheck;
  const suffix = creditSuffix(item) ?? "";
  return `${subject} ${ITEM_GLYPH[item.outcome]} ${OUTCOME_DESCRIPTION[item.outcome]}${suffix}`;
}

/**
 * The credit arms of a reconciling item's where-to-fix, or `undefined` when none applies and the
 * item renders bare.
 */
function creditSuffix(item: ScenarioReconciliation["reconcilingItems"][number]): string | undefined {
  // A CREDIT-SIDE item surfaces its WHERE-TO-FIX in the reconciliation cell (ruling
  // Q5): a lint credit (the uncited static-check folded onto the suspense row, ruling
  // Q4) shows its static check handle; a runtime credit (phantom `cites-unknown-scenario` or
  // suspense `cites-no-scenario`) shows its evidence observation locator. A DEBIT-side evidence obligation
  // (satisfied / missing / failing / watermelon) carries neither and renders bare, as before.
  //
  // READ OFF THE CANON TABLE rather than listed here. A credit-side outcome is exactly one canon
  // calls (Obligation None, Observation Exists) — `cites-no-scenario`, `cites-unknown-scenario`,
  // `no-evidence-obligation` — and a hand-written list of the three would agree with
  // `OUTCOME_SIDE_PROFILE` by copy rather than by construction, free to drift the day a fourth
  // joins. (`broken` and `both-missing` are (None, None), so both terms are read.)
  const profile = OUTCOME_SIDE_PROFILE[item.outcome];
  const isCredit = profile.obligation === "None" && profile.observation === "Exists";
  // The `broken` credit (@SCN-RPT-021) carries BOTH halves of its where-to-fix: the locator of the
  // evidence that never ran (a test file, or a feature file) AND the message it carries. The
  // message's HEADLINE LINE only — a vitest collection message is multi-line (message + stack) and
  // a stack in a table cell would destroy the table; the full message is printed in the
  // `## Run integrity` section above, which is where a reader diagnoses. Here the row stays
  // legible without leaving the table.
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

/**
 * The first non-empty line of a runner message — its HEADLINE (`Error: Cannot find package
 * '@cucumber/tag-expressions' imported from …`), the line that names what broke. The rest is
 * the stack, which belongs in the fenced verbatim print, not in a table cell.
 */
function headlineOf(message: string): string {
  return message.split("\n").map((line) => line.trim()).find((line) => line.length > 0) ?? "";
}

/**
 * Make an arbitrary runner-supplied string safe to sit INSIDE a markdown table cell: collapse
 * every run of whitespace to a single space, and escape the pipe — an unescaped `|` in a cell
 * silently splits it into two columns and corrupts the table from that row on. Defensive: the
 * text comes from the runner, not from us.
 */
function cellSafe(text: string): string {
  return text.replace(/\s+/g, " ").replace(/\|/g, "\\|").trim();
}

/**
 * Render a Pending Item (@SCN-PND-010) — the one-sided IOU a deliberately-deferred
 * `<quality-check>pending` obligation raises (evidence-manifesto §11B). Labelled DISTINCT from
 * a reconciling item: the ⏳ marker + the explicit "pending" word read as neither
 * balanced-clean (the `—` placeholder) nor an error (a reconciling item's ✗/∅/🍉 outcome). It
 * is NEVER run through `renderItem` and never enters the reconciling-item list — a Pending
 * Item is a structurally distinct category, never one of the out-of-balance leaf outcomes.
 */
function renderPendingItem(item: PendingItem): string {
  // A `qualityCheck`-less Pending Item (@SCN-PND-022) is SCENARIO-SCOPE — a whole-scenario
  // deferral (a bare `@wip` raising no obligations) owing NO specific check. Render `⏳ pending`
  // alone; an obligation-scope Pending Item names its owed check (`⏳ pending: <check>`).
  return item.qualityCheck === undefined ? "⏳ pending" : `⏳ pending: ${item.qualityCheck}`;
}

/**
 * The exceptions cell for a Scenario Reconciliation row (@SCN-PND-010) — its reconciling items
 * (the errors an out-of-balance verdict carries) and its Pending Items (the deferred IOUs),
 * each rendered as its OWN distinctly-labelled group and then joined. The two groups are built
 * separately, so a Pending Item is never folded into the reconciling-item list nor mistaken for
 * an error. A row with neither renders the em-dash placeholder; a balanced-with-pending row
 * shows its ⏳ pending group alone (distinct from the clean-balanced `—`). A row with no
 * `pendingItems` renders byte-identically to before (reconciling items only, or `—`).
 */
function renderRowExceptions(s: ScenarioReconciliation): string {
  const reconciling = s.reconcilingItems.map(renderItem).join("; ");
  const pending = (s.pendingItems ?? []).map(renderPendingItem).join("; ");
  const groups = [reconciling, pending].filter((g) => g.length > 0);
  return groups.length === 0 ? "—" : groups.join("; ");
}

/**
 * Render one scenario row: its id, its binary verdict, and its exceptions cell — EVERY
 * reconciling item followed by any Pending Item (labelled distinct). A balanced scenario with
 * neither is rendered as an em-dash placeholder.
 */
function renderScenario(s: ScenarioReconciliation): string {
  return `| ${s.scnId} | ${VERDICT_GLYPH[s.verdict]} ${s.verdict} | ${renderRowExceptions(s)} |`;
}

/**
 * A section-emitter — one ordered slab of the report over the shared `EvidenceReconciliation` model (+ the
 * markdown-only `featureNames` label lookup). An empty array OMITS the section (so a cut
 * vanishes when its data is empty). Each emitter opens with its heading and ends with a
 * trailing blank line; `renderReport` flat-maps the ordered list and joins, so the blanks
 * separate the sections cleanly.
 */
type SectionEmitter = (report: RenderInput) => string[];

/**
 * The target-derived `feature-code → slug` map — a markdown-only render arg (NOT
 * serialised by `renderJson`, NOT part of the shared `EvidenceReconciliation` model). Built by
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
 * The RUN-INTEGRITY stamp (@SCN-RPT-021) — the customer-visible payoff of the `broken`
 * reconciling item (3F-1642), and the ONLY place the word **"unsound"** appears. The renderer
 * asks `hasBrokenEvidence` and prints the headline word: predicate-name ≠ headline-word, the
 * `isBalanced` / "balanced" precedent.
 *
 * WHY IT SITS HERE — after provenance, BEFORE the summary views. The stamp is not one more cut
 * of the reconciliation; it is a caveat ON all of them. A behaviour that was never exercised
 * reconciles `missing` whether its proof is ABSENT or merely BROKEN, so a `missing` row in an
 * unsound run cannot be read as "write the test" — the reader must know that before reading a
 * single count. Every other section keeps its @SCN-RPT-009 summary-first / ledger-last position.
 *
 * WHAT IT PRINTS. The broken evidence's locator (the WHERE) and its message in a fenced block
 * (the WHAT) — multi-line, stack included where there is one, because that is what the reader
 * diagnoses from and a table cell cannot hold it.
 *
 * TWO PRODUCERS, ONE SHAPE, NO BRANCH (3F-1654). `broken` now has two instances — a vitest suite
 * that failed to COLLECT, and a cucumber step two or more step definitions match (@SCN-LDG-019) —
 * so the copy here is GENERIC: an ambiguous step is neither a "suite" nor a "collection error",
 * and a renderer that called it one would be the tool lying about what broke, in the one place the
 * reader will ever see it. The renderer needs no per-reader branch: it prints what the ITEM
 * CARRIES. Where the runner gives its own words (vitest's collection error) the message IS those
 * words, passed through VERBATIM; where the runner gives none (cucumber emits no `error_message`
 * for an ambiguous step) the READER synthesised the diagnosis upstream. The difference is resolved
 * before the renderer sees it.
 *
 * THE BOUNDED SOFTENING of 3F-1642's "print verbatim — the tool does not interpret" stance
 * (operator-mandated; exactly three clauses, no further): pass the runner's words through where it
 * gives them; STATE the diagnosis — WHAT BROKE — where it does not; PRESCRIBE NO CURE, either way.
 * The renderer may name WHAT failed and WHERE. It may never say how to fix it. The gloss stays
 * REMEDY-NEUTRAL: what broke is equally a missing dependency, a syntax error, a bad import, a
 * top-level throw, or two colliding step definitions, so the report never guesses the cure (never
 * `pnpm install`, and never "delete one of the step definitions"). The one remedy that always
 * holds — fix the harness and regenerate — is the one it gives, carrying the parent's fuller
 * `OUTCOME_DESCRIPTION` gloss through to the reader; it POINTS, it does not diagnose a remedy.
 *
 * OMIT-WHEN-EMPTY (the Pending Items tally precedent): a run carrying no broken evidence
 * returns `[]`, so a SOUND report is byte-identical to the pre-slice output — no stray empty
 * section. Markdown-only: a machine consumer reads soundness as `summary.byOutcome.broken > 0`,
 * already type-forced into the JSON, so no new JSON field is owed.
 */
const runIntegritySection: SectionEmitter = (report) => {
  // The predicate is the single source of the verdict — the renderer never re-derives
  // "is this run sound?" with its own scan, so the stamp cannot drift from the CLI's exit 4
  // (@SCN-CLI-012), which asks the same predicate.
  if (!hasBrokenEvidence({ scenarioReconciliations: report.ledger.scenarioReconciliations })) return [];
  // ASKED, not derived (3F-2203) — which items are broken is a model query, and it is the same
  // scan `hasBrokenEvidence` above is now derived from, so the stamp and the list cannot disagree.
  // Taking `.length` of a list you were handed is projection, not derivation.
  const brokenItems = brokenItemsOf({
    scenarioReconciliations: report.ledger.scenarioReconciliations,
  });
  const count = brokenItems.length;
  // GENERIC over both producers — the count-phrase names what a collection-failed vitest suite and
  // an ambiguous cucumber step have in common (the proof did not run), never one kind's idiom.
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
    // WHERE the evidence broke — a test file (vitest) or a feature file (cucumber). A `broken`
    // observation always carries its locator (the reader's WHERE-to-fix); the fallback keeps the
    // section honest if one ever does not.
    lines.push(`- \`${item.locator ?? "(evidence not named by the runner)"}\` — what broke:`);
    lines.push("");
    // WHAT broke, exactly as the item carries it: the runner's own words VERBATIM where the runner
    // gave them (vitest — every line, stack included, unedited: the tool does not interpret the
    // error), and the reader's synthesised diagnosis where it gave none (cucumber's ambiguous step
    // has no `error_message` to quote). No branch — one shape, resolved upstream. Either way the
    // line names what failed; it never prescribes the cure.
    lines.push("```text");
    lines.push(...(item.message ?? "(no message reported by the runner)").split("\n"));
    lines.push("```");
    lines.push("");
  }
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
 * Count` shape) — a SUBJECTS-AS-ROWS table: each subject (Scenario Reconciliation, Evidence
 * obligation) on its own row with its own Total, and balanced / out-of-balance as COLUMNS (both
 * subjects report into the same binary, so the "Verdict"/"outcome"/"Axis" words retire).
 *
 * The first subject is the SCENARIO RECONCILIATION — the manifesto's collection, ALL three row
 * kinds (scenario, phantom, suspense) — not `Scenario`, which names only the real thing
 * (3F-1726). Because the row is a pure presentation of `summary.scenarioReconciliations`, whose
 * totals count every row (@SCN-RMD-001, 3F-1724 — a phantom / suspense reconciliation is always
 * out-of-balance), a run whose only out-of-balance row is the suspense reconciliation renders
 * `N+1 | N | 1`, never `N | N | 0`. The subject's out-of-balance column therefore agrees with
 * `isBalanced` and with the exit code — the three views that disagreed in an adopter's repository 17-36-50Z run
 * (3F-1703), where a failing run's tally read `141 | 141 | 0` and looked like a clean board.
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
 * `summary.scenarioReconciliations` / `summary.evidenceObligations` totals; markdown-only.
 */
const evidenceReconciliationSection: SectionEmitter = (report) => {
  const scenarioReconciliations = report.summary.scenarioReconciliations;
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
      // The subject is the SCENARIO RECONCILIATION — the manifesto's COLLECTION (scenario,
      // phantom and suspense rows alike), not `Scenario`, which names only the real thing
      // (@SCN-RPT-004, 3F-1726; `scenarios` is in the manifesto's retired column).
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
  // Decompose the evidence-obligation out-of-balance into its causes — a FLAT list of the
  // nine out-of-balance leaf outcomes in canonical order (@SCN-RPT-019, 3F-1453; the ninth,
  // `no-scn-code`, added by @SCN-LDG-021, 3F-1774). The list is DERIVED from the type-forced
  // OUTCOME_DESCRIPTION (3F-1806), so a new Outcome renders here with no edit to this file;
  // its ROW ORDER is that map's key order, which is therefore load-bearing. Each a
  // counted `↳ <outcome>` row (only the out-of-balance column populated) reconciling to the
  // total exactly once. No debit/credit/neither grouping: the grouping emitted a subtotal
  // `↳ <group>-side` row AND its leaf rows at the same `↳` indent, so a naive column-sum
  // double-counted (the live 170 vs 85). `missing` carries the bare-level split as Detail.
  // Every outcome is ALWAYS rendered, including a zero count (a zero cause is itself a fact).
  for (const outcome of OUT_OF_BALANCE_OUTCOMES) {
    const detail = outcome === "missing" ? missingSplit : "";
    // The Subject cell shows the outcome's CANON DESCRIPTION, not the bare handle (3F-1626)
    // — single-sourced from OUTCOME_DESCRIPTION so it cannot drift from the outcome it names.
    lines.push(row([`↳ ${OUTCOME_DESCRIPTION[outcome]}`, "", "", String(evidenceObligations.byOutcome[outcome]), detail]));
  }
  // The Pending Items tally (@SCN-PND-011) — a SEPARATE line, NEVER an out-of-balance leaf of
  // its own, at any leaf count (3F-1453 line, endorsed; re-endorsed at eight leaves, 3F-1649;
  // the count is now nine, 3F-1774 — the constraint is categorical, not arithmetic): a Pending
  // Item is deferred, not out-of-balance, so it is
  // tallied apart from BOTH the balanced and out-of-balance counts and the `↳` leaf
  // decomposition above — its own line, never a `↳` row under the out-of-balance table. Read
  // off the materialised `summary.pending`; rendered only when the run genuinely carries Pending
  // Items (the omit-when-empty precedent), so a zero-pending report stays byte-identical.
  lines.push(...pendingTally(report.summary.pending));
  lines.push("");
  return lines;
};

/** The Pending Items tally line, preceded by its blank — or nothing at all when none is pending. */
function pendingTally(pending: number): string[] {
  return pending > 0
    ? ["", `⏳ ${pending} Pending Item(s) — deferred, tallied apart from balanced and out-of-balance.`]
    : [];
}

/**
 * Lint evidence obligations (@SCN-RPT-005; re-cut under Summary views with a total line, labelled
 * by the @lint TAG) — lifts every `@lint` evidence obligation out of the per-scenario trial
 * balance into its OWN `### Lint evidence obligations` table `| Scenario | Static check | Outcome |`,
 * one row per obligation in document order, each `outcome` carrying its `ITEM_GLYPH` glyph (so a
 * 🍉 watermelon reads at a glance). The total line STATES how many of them reconcile balanced —
 * read off the report's materialised `summary.lint` tally. Omitted entirely (returns `[]`) when no
 * scenario names a lint obligation. A pure derive over the ledger rows; markdown-only.
 */
const lintSection: SectionEmitter = (report) => {
  // Scenario rows only — a lint evidence obligation is an obligation-side thing. The suspense row's
  // lint credit (an uncited static-check, cites-no-scenario) is NOT an evidence obligation, so
  // it stays out of this table + tally; it surfaces on the suspense row's reconciling items.
  // ASKED, not derived (3F-2203) — the obligation-side lint sub-rows are a model list, and it is the SAME
  // list `summary.lint` is tallied from, so the table and its total line cannot disagree. The
  // scenario-rows-only cut (a suspense lint CREDIT is an observation, not an obligation) lives with
  // the rule; it stood here and in `lintTally`, character-identical, agreeing by copy.
  const rows = lintReconciliationsOf({
    scenarioReconciliations: report.ledger.scenarioReconciliations,
  }).map(
    // The Outcome cell shows the canon DESCRIPTION, not the bare handle (3F-1626,
    // single-sourced from OUTCOME_DESCRIPTION); the ITEM_GLYPH glyph is retained.
    ({ scnId, reconciliation: r }) =>
      `| ${scnId} | ${r.staticCheck!} | ${ITEM_GLYPH[r.outcome]} ${OUTCOME_DESCRIPTION[r.outcome]} |`
  );
  if (rows.length === 0) return [];
  const { satisfied, total } = report.summary.lint;
  return [
    "### Lint evidence obligations",
    "",
    `${satisfied} of ${total} lint evidence obligations reconcile satisfied.`,
    "",
    "| Scenario | Static check | Outcome |",
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
 * fallback for an uncoded id (no file registers the code) or the no-map back-compat path.
 * Omitted entirely only when no Scenario Reconciliation of ANY kind is out of balance; the total line
 * names the out-of-balance phantom/suspense rows the table cannot group (@SCN-RPT-030). A pure derive over
 * `report.ledger.scenarioReconciliations` (+ the model's `metadata.featureNames` title lookup);
 * markdown-only.
 */
const byFeatureSection: SectionEmitter = (report) => {
  // The TABLE groups scenario rows only (ruling Q3) — a phantom/suspense row names no feature file,
  // so it has no group to sit in. The SENTENCE still counts it (@SCN-RPT-030, 3F-3297).
  const rows = report.ledger.scenarioReconciliations;
  const scenarios = rows.filter(isScenario);
  const groups = outOfBalanceByFeature(scenarios);
  const ungrouped = ungroupedOutOfBalance(report.summary.scenarioReconciliations);
  if (groups.size === 0 && ungrouped.length === 0) return [];
  const outOfBalance = scenarios.filter(
    (s) => s.verdict === "out-of-balance"
  ).length;
  // Rows, not "out-of-balance scenarios": the old head read as M rows out of balance (3F-3297).
  const head = `${outOfBalance} of ${scenarios.length} scenario rows out of balance`;
  return [
    "### Out-of-balance by feature",
    "",
    `${head}${groups.size > 0 ? ", grouped by feature" : ""}${ungroupedTail(ungrouped)}.`,
    "",
    ...byFeatureTableLines(groups, report.metadata?.featureNames),
  ];
};

/** The out-of-balance scenario rows' ids under their feature code, in first-appearance order. */
function outOfBalanceByFeature(scenarios: RenderInput["ledger"]["scenarioReconciliations"]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const s of scenarios) {
    if (s.verdict !== "out-of-balance") continue;
    const code = featureCodeOf(s.scnId) ?? s.scnId;
    const ids = groups.get(code) ?? [];
    ids.push(s.scnId);
    groups.set(code, ids);
  }
  return groups;
}

/** The by-feature table, or no lines at all when no scenario row is out of balance. */
function byFeatureTableLines(
  groups: ReadonlyMap<string, readonly string[]>,
  featureNames: Readonly<Record<string, string>> | undefined,
): string[] {
  if (groups.size === 0) return [];
  const lines = ["| Feature | Count | Out-of-balance `@SCN` ids |", "| --- | --- | --- |"];
  for (const [code, ids] of groups) {
    const slug = featureNames?.[code];
    const label = slug ? `${slug} (${code})` : code;
    lines.push(`| ${label} | ${ids.length} | ${ids.join(", ")} |`);
  }
  lines.push("");
  return lines;
}

/**
 * The rows no feature can group, ASKED of the model's own sub-counts rather than re-counted here: the
 * phantom and suspense rows are always out of balance (`ScenarioReconciliationTotals`), and these are
 * the same sub-counts the header's Scenario Reconciliation row is made of — so the sentence adds up
 * to the header by construction. Zeros dropped; the ledger's own order.
 */
function ungroupedOutOfBalance(totals: RenderInput["summary"]["scenarioReconciliations"]): string[] {
  return [
    ...(totals.phantom > 0 ? [`${totals.phantom} phantom-scenario row(s)`] : []),
    ...(totals.suspense > 0 ? [`${totals.suspense} suspense-scenario row(s)`] : []),
  ];
}

/** The sentence's tail naming the ungrouped rows, or nothing when every out-of-balance row is grouped. */
function ungroupedTail(ungrouped: readonly string[]): string {
  return ungrouped.length > 0
    ? `; ${ungrouped.join(" and ")} out of balance, not grouped by feature (no feature file names them)`
    : "";
}

/**
 * The ledger (moved to the END) — the per-scenario table, with its summary lines on top: the
 * verdict tally bullet, and (when an evidence-obligation census is threaded) the
 * excluded-occurrence bullet relocated here from the dissolved corpus-census section (Q1a). When
 * the evidence-observation aggregate is threaded, the row gains corpus-driven evidence columns
 * between Scenario and Verdict, each a four-way obligation×observation cell; without the aggregate
 * the original three-column ledger is preserved (the 2-/3-arg callers stay green). Markdown-only.
 * The verdict-tally bullet names the collection "Scenario Reconciliation(s)" — canon's noun for
 * the reconciled OUTPUT collection (scenario + phantom + suspense), never "scenario(s)"
 * (@SCN-RPT-024, 3F-1919; "scenarios" is a Rejected alias).
 */
const ledgerSection: SectionEmitter = (report) => {
  // Group the scenario rows first, then the PHANTOM rows, then the SUSPENSE row as
  // distinct blocks at the END (ruling Q3) — a phantom/suspense is not a
  // scenario, so it never mingles with the scenario verdict rows.
  const scenarioRows = report.ledger.scenarioReconciliations.filter(
    isScenario
  );
  const phantomRows = report.ledger.scenarioReconciliations.filter((s) => s.kind === "phantom-scenario");
  const suspenseRows = report.ledger.scenarioReconciliations.filter((s) => s.kind === "suspense-scenario");
  const scenarios = [...scenarioRows, ...phantomRows, ...suspenseRows];
  // The runtime-observation axis is IN PLAY iff the summary carries the test-volume fold
  // (@SCN-RPT-010 / 3F-2103 — the gate that was the retired `evidenceObservations` section's
  // presence). When it is, the ledger gains the corpus-driven evidence columns.
  const withObservations = report.summary.testVolume !== undefined;
  return [
    // The reconciled per-scenario OUTPUT table — "Scenario Reconciliations", not "Ledger"
    // ("Ledger" is the INPUT concept in canon; double-entry-manifesto).
    "## Scenario Reconciliations",
    "",
    ...ledgerTallyLines(report.summary.scenarioReconciliations),
    ...(report.evidenceObligations ? censusLines(report.evidenceObligations) : []),
    "",
    ...ledgerTableLines(scenarios, withObservations),
    "",
  ];
};

/** The ledger's verdict tally bullet, and the phantom / suspense sub-counts broken out of it. */
function ledgerTallyLines(totals: RenderInput["summary"]["scenarioReconciliations"]): string[] {
  const lines = [
    // The headline verdict tally counts EVERY Scenario Reconciliation — scenario, phantom and
    // suspense alike (@SCN-RMD-001, 3F-1724; the scenario-only "ruling Q3" is retracted).
    `- ${totals.total} Scenario Reconciliation(s): ${totals.balanced} balanced, ` +
      `${totals.outOfBalance} out-of-balance.`,
  ];
  // The phantom (P) count is broken out as a SUB-COUNT of the tally above — it is counted
  // INSIDE total / out-of-balance (a phantom reconciliation is always out-of-balance), and
  // named here so a reader sees what makes up the total.
  if (totals.phantom > 0) {
    lines.push(
      `- ${totals.phantom} phantom-scenario(s): cited by an evidence observation, named by no feature.`
    );
  }
  // The suspense (S) count is broken out the same way — credits citing no scenario at all
  // (uncited evidence observations + uncited static-checks), aggregated into one row,
  // counted INSIDE the tally above.
  if (totals.suspense > 0) {
    lines.push(
      `- ${totals.suspense} suspense-scenario(s): credits citing no scenario, aggregated into "(no scenario)".`
    );
  }
  return lines;
}

/**
 * The scenario-corpus CENSUS — obligation-side facts on report.evidenceObligations.
 * These re-homed here from the dissolved `## Warnings` section: they are census
 * facts, NOT warnings and NOT reconciling items, so they ride in the ledger summary co-located
 * with the excluded-occurrence bullet (the evidenceObligations census view). Facts only —
 * count + locator.
 */
function censusLines(census: NonNullable<RenderInput["evidenceObligations"]>): string[] {
  const lines = [`- ${census.excludedOccurrences} @SCN ids seen in non-tag context, excluded`];
  // Untagged scenarios (@SCN-RPT-014) — Gherkin scenarios with no @SCN tag, located by
  // `feature : scenario`. Sorted defensively (a hand-built corpus fixture may be unsorted).
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
  // Prose-only codes (@SCN-RPT-015) — @SCN ids mentioned in prose but never tagged anywhere
  // (the dangling references). The bare code is its own locator. Sorted, after untagged.
  const proseOnly = census.proseOnlyCodes;
  if (proseOnly.length > 0) {
    lines.push(`- ${proseOnly.length} @SCN code(s) appear only in prose, never as a tag:`);
    for (const code of [...proseOnly].sort()) {
      lines.push(`  - ${code}`);
    }
  }
  return lines;
}

/**
 * The per-scenario table: with the corpus-driven evidence columns between Scenario and Verdict when
 * the runtime-observation axis is in play and any column appears, else the original three columns.
 */
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

/**
 * The ordered section list (project design §2; reorganised summary-first / ledger-last,
 * test volume added): title → provenance → the run-integrity stamp (only when the run is
 * unsound) → Summary views
 * (Evidence reconciliation, test volume, lint evidence obligations, out-of-balance by feature)
 * → the ledger. The `## Warnings` section was RETIRED entirely: the
 * no-evidence scenario (the earlier zero-evidence warning) is now a `both-missing` ledger
 * row, and the scenario-corpus
 * census facts (untagged scenarios / prose-only codes) re-homed into the ledger summary.
 *
 * The run-integrity stamp (@SCN-RPT-021) precedes the summary views because it is a caveat ON
 * them, not another cut OF them — an unsound run's `missing` counts cannot be taken at face
 * value. It omits itself entirely on a sound run, so the ordering above is unchanged for
 * every report that carries no broken evidence.
 */
const SECTIONS: readonly SectionEmitter[] = [
  titleSection,
  provenanceSection,
  runIntegritySection,
  summaryViewsSection,
  // The verdict OPENS the summary (@SCN-RPT-022) — before any cut of the reconciliation, so a
  // reader meets the bottom line first and a failing run can never LOOK like a passing one.
  runVerdictSection,
  evidenceReconciliationSection,
  testVolumeSection,
  // The scope discovery ranged over (@SCN-USG-020), ahead of the static-check census rather than
  // among the dispositions below it: it is not one of the things a step became, it is the pipeline
  // every figure under it was read from. A reader meets what was read before what was found.
  discoveryScopeSection,
  staticChecksSection,
  // The steps recognised as behavioural runners (@SCN-USG-011), beside the static-check counts
  // rather than among them: a runner is what a step was recognised as INSTEAD of reaching that
  // census, so it belongs next to it and never inside it.
  behaviouralRunnersSection,
  // The steps that are the reconciler (@SCN-USG-014), between the two: it is the disposition
  // nobody configured, so it reads after what the target named its runners and before the list the
  // consumer wrote — the tool accounting for itself before it accounts for their instructions.
  reconcilerSection,
  // The steps the target named non-checks (@SCN-USG-015), after the runners for the same reason
  // those follow the census: all three are dispositions a step got INSTEAD of reaching the books,
  // and they read in the order the reader meets them — what ran the suites, what this tool took
  // out of its own books, then what the consumer took out.
  excludedStepsSection,
  // What became of every step the run read (@SCN-USG-018), last of the pipeline cuts because it
  // is the one that counts what the four above it named. A reader meets the dispositions and then
  // the figure saying they are all of them — which is the axis's first non-negotiable, stated as
  // something checkable rather than as a sentence taken on trust.
  stepAccountingSection,
  lintSection,
  byFeatureSection,
  ledgerSection,
];

/**
 * Render the whole-document report model to markdown — the from-model pipeline,
 * a PURE PRESENTATION over the same `EvidenceReconciliation` the JSON serialises. Exposed for slice 3's
 * render-from-saved-JSON path: a consumer rebuilds a `EvidenceReconciliation` from banked JSON and
 * renders the human view off it, with no `RunContext` in hand. Needs NO external map — the
 * feature titles are read off `report.metadata.featureNames` (@SCN-RMD-006; nested under
 * `metadata`), so the by-feature cut names each feature in full from the model alone.
 */
export function renderReport(report: RenderInput): string {
  return SECTIONS.flatMap((section) => section(report)).join("\n");
}

/**
 * Regenerate the markdown from a banked `spec-reconciliation.json` ALONE (@SCN-RMD-007)
 * — the render-from-saved-JSON seam. `JSON.parse` the stored whole-document report back into a
 * `EvidenceReconciliation` and render it via `renderReport`: no `RunContext`, no live inputs, the JSON is the
 * whole document. Drift-equality is the acceptance — the markdown from the saved JSON equals the
 * markdown rendered directly from the same run (the by-feature titles included, which is why the
 * feature-title model-completion @SCN-RMD-006 is the enabling dependency). The load-bearing proof
 * that the JSON is the model, not a lossy projection.
 */
export function renderReportFromJson(json: string): string {
  return renderReport(JSON.parse(json) as RenderInput);
}

/**
 * Render the reconciliation to markdown. Keeps its `(balance, ctx, …)` signature (mirroring
 * `json.ts`): it assembles the shared whole-document report from the reconcile pieces —
 * threading the live `featureNames` title source INTO `assembleRenderInput`, so the titles
 * land on the model — then delegates to `renderReport`. So `writer.ts` and the unit tests are
 * untouched, the markdown stays byte-identical (same slugs, now model-sourced), and it is
 * provably a presentation of the same model the JSON serialises.
 */
export function renderMarkdown(
  evidenceReconciliation: EvidenceReconciliation,
  ctx: RunContext,
  evidenceObligations?: EvidenceObligations,
  featureNames?: FeatureNames
): string {
  return renderReport(assembleRenderInput(evidenceReconciliation, ctx, evidenceObligations, featureNames));
}
