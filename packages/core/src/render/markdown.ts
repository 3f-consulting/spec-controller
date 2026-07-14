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
  PendingItem,
} from "../model.js";
// The single source for the human-readable outcome gloss — rendered in place of the bare
// handle wherever an outcome surfaces to a reader (3F-1626). An internal core import (NOT on
// the frozen v1 barrel), so the renderer and the map cannot drift.
import { OUTCOME_DESCRIPTION } from "../model.js";
import {
  projectProvenanceObject,
  type RunContext,
} from "../provenance/provenance.js";
import type { EvidenceObligations } from "../census/evidenceObligations.js";
import { RUNTIME_QUALITY_CHECKS, type AttributedCount, type RuntimeEvidenceObservationKindCounts } from "../census/evidenceObservations.js";
import type { StaticEvidenceObservationKindCounts } from "../census/staticEvidenceObservations.js";
import { assembleReport, type Report } from "../assemble/report.js";
// The run-integrity predicate (@SCN-LDG-018) — the existential scan for a `broken` reconciling
// item. The renderer asks the predicate and prints the HEADLINE word: predicate-name ≠
// headline-word (`hasBrokenEvidence` → "unsound"), exactly as `isBalanced` → "balanced".
// The three WHOLE-RUN predicates the verdict headline (@SCN-RPT-022) asks — the SAME three the
// CLI asks to set its exit code, in the SAME dominance order. The renderer never re-scans the
// reconciliation for a verdict of its own, so the headline cannot drift from the code it names.
import { hasBrokenEvidence, isBalanced, hasPendingItems } from "../reconcile/reconcile.js";
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
  // CREDIT-SIDE: evidence that NEVER RAN — a vitest suite that failed to collect before naming a
  // test (@SCN-LDG-017), or a cucumber step two or more step definitions match (@SCN-LDG-019).
  // Either way it posts to the suspense row: the credit can never discharge an obligation.
  "broken": "💥",
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
    if (where.length > 0) suffix = ` (${cellSafe(where)})`;
  } else if (isCredit && item.guard) suffix = ` (${item.guard})`;
  else if (isCredit && item.locator !== undefined) suffix = ` (${item.locator})`;
  return `${subject} ${ITEM_GLYPH[item.outcome]} ${OUTCOME_DESCRIPTION[item.outcome]}${suffix}`;
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
 * Item is a structurally distinct category, never one of the eight out-of-balance outcomes.
 */
function renderPendingItem(item: PendingItem): string {
  // A `qualityCheck`-less Pending Item (@SCN-PND-022) is SCENARIO-SCOPE — a whole-scenario
  // deferral (a bare `@wip` declaring no obligations) owing NO specific check. Render `⏳ pending`
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
  if (!hasBrokenEvidence({ scenarioReconciliations: report.evidenceReconciliation })) return [];
  const brokenItems = report.evidenceReconciliation.flatMap((s) =>
    s.reconcilingItems.filter((item) => item.outcome === "broken")
  );
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
 * The RUN-VERDICT headline (@SCN-RPT-022) — the first thing under `## Summary views`, so the
 * summary OPENS with the bottom line. The tally already fails on its own once every Scenario
 * Reconciliation is counted (@SCN-RMD-001, 3F-1724); this is the SUPPLEMENT that makes the
 * failure impossible to MISS. The slice's non-negotiable invariant (3F-1703): a run that exits
 * non-zero NEVER renders a headline that reads as a pass — an adopter's repository 17-36-50Z fault, where a
 * failing run's `141 | 141 | 0` tally was read as a clean board by operator and agent alike.
 *
 * ALWAYS PRESENT — the one deliberate departure from the `runIntegritySection` precedent it
 * otherwise follows. The unsound stamp is omit-when-empty (a sound run must gain no stray empty
 * section); a BALANCED run, by contrast, needs its verdict line just as much as a failing one —
 * "there is no headline" is not a verdict a reader can rely on.
 *
 * THE DOMINANCE ORDER MIRRORS `cli-balance/cli.ts` EXACTLY — broken → out-of-balance → pending.
 * The headline asks the same three predicates the CLI asks, in the same order, and never
 * re-derives a verdict of its own, so it cannot drift from the exit code it names. The order is
 * load-bearing for the same reason it is there: a broken run is ALWAYS out-of-balance too (its
 * `broken` item sits on the suspense row), so asking `isBalanced` first would have the headline
 * say exit 1 while the process exits 4. @SCN-CLI-013 (3F-1728) then PINS that agreement.
 *
 * EXIT 3 IS THE ONE CODE THE CORE CANNOT ASSERT. `--strict` is a CLI-edge flag invisible to the
 * core (it appears nowhere in `packages/core/src`), so the renderer cannot know whether it was
 * passed. A balanced run carrying Pending Items therefore names exit 3 CONDITIONALLY ("exit 3
 * under `--strict`") and never claims it; 0 / 1 / 4 are determinate from the reconciliation alone.
 */
const runVerdictSection: SectionEmitter = (report) => {
  const reconciliation = { scenarioReconciliations: report.evidenceReconciliation };
  // The predicates, in the CLI's dominance order. Each headline word is the RENDER word, not the
  // predicate name (`hasBrokenEvidence` → "UNSOUND"), the `isBalanced` → "balanced" precedent —
  // and "UNSOUND" is coherent with the `## Run integrity: unsound` stamp above (@SCN-RPT-021).
  const verdict = hasBrokenEvidence(reconciliation)
    ? {
        headline: "**UNSOUND**",
        exit: "exit 4",
        // GENERIC over both producers (3F-1654), for the same reason the run-integrity stamp is:
        // a cucumber ambiguity is not a collection failure, and the verdict line is read by the
        // same reader. It names the FACT the two share; the stamp above carries the detail.
        gloss:
          "the evidence could not be TRUSTED to reconcile. A proof never ran, so the behaviour " +
          "it proves was never exercised. Read the run-integrity stamp above before any count " +
          "below it.",
      }
    : !isBalanced(reconciliation)
      ? {
          headline: "**OUT-OF-BALANCE**",
          exit: "exit 1",
          gloss:
            "the accounts do not agree. At least one Scenario Reconciliation carries a " +
            "reconciling item. This run FAILED.",
        }
      : {
          headline: "**BALANCED**",
          exit: "exit 0",
          gloss: "every Scenario Reconciliation balances: declared, phantom and suspense alike.",
        };
  const lines = [
    "### Run verdict",
    "",
    `${verdict.headline} — ${verdict.gloss} (${verdict.exit})`,
  ];
  // The CONDITIONAL rider — never an assertion. A balanced run carrying Pending Items exits 0 as
  // rendered, and 3 only if the caller passed `--strict`; the core cannot see the flag, so it
  // names the possibility and stops short of claiming it. Asked LAST, mirroring the CLI's own
  // `else if (strict && hasPendingItems(...))` — a run already failing on a dominant predicate
  // never reaches it, and the note never appears alongside UNSOUND or OUT-OF-BALANCE.
  if (verdict.exit === "exit 0" && hasPendingItems(reconciliation)) {
    lines.push("");
    lines.push(
      "⏳ Pending Items are outstanding — deferred, not out-of-balance, so the verdict stands. " +
        "A run that treats a deferral as a failure gives exit 3 under `--strict`."
    );
  }
  lines.push("");
  return lines;
};

/**
 * Evidence reconciliation (@SCN-RPT-004 Update — supersedes the `Axis |
 * Count` shape) — a SUBJECTS-AS-ROWS table: each subject (Scenario Reconciliation, Evidence
 * obligation) on its own row with its own Total, and balanced / out-of-balance as COLUMNS (both
 * subjects report into the same binary, so the "Verdict"/"outcome"/"Axis" words retire).
 *
 * The first subject is the SCENARIO RECONCILIATION — the manifesto's collection, ALL three row
 * kinds (declared, phantom, suspense) — not `Scenario`, which names only the declared thing
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
      // The subject is the SCENARIO RECONCILIATION — the manifesto's COLLECTION (declared,
      // phantom and suspense rows alike), not `Scenario`, which names only the declared thing
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
  // eight out-of-balance leaf outcomes in canonical order (@SCN-RPT-019, 3F-1453), each a
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
  // The Pending Items tally (@SCN-PND-011) — a SEPARATE line, NEVER a ninth out-of-balance
  // leaf (3F-1453 line, endorsed; still endorsed at eight leaves, 3F-1649): a Pending Item is
  // deferred, not out-of-balance, so it is
  // tallied apart from BOTH the balanced and out-of-balance counts and the eight-leaf `↳`
  // decomposition above — its own line, never a `↳` row under the out-of-balance table. Read
  // off the materialised `summary.pending`; rendered only when the run genuinely carries Pending
  // Items (the omit-when-empty precedent), so a zero-pending report stays byte-identical.
  const pending = report.summary.pending;
  if (pending > 0) {
    lines.push("");
    lines.push(
      `⏳ ${pending} Pending Item(s) — deferred, tallied apart from balanced and out-of-balance.`
    );
  }
  lines.push("");
  return lines;
};

/**
 * The out-of-balance reconciling-item outcomes in canonical reading order (the `Outcome`
 * type's order in model.ts), `satisfied` excluded — it is the BALANCED outcome, not part of
 * the OUT-of-balance decomposition. A FLAT list (@SCN-RPT-019, 3F-1453): the earlier
 * debit/credit/neither grouping was removed because it emitted a `↳ <group>-side` subtotal
 * row AND its leaf rows at the same `↳` indent, so a naive column-sum double-counted (the
 * live 170 vs 85). The eight leaves reconcile to the out-of-balance total exactly once.
 *
 * ⚠ HAND-MAINTAINED (3F-1649). Unlike `OUTCOME_DESCRIPTION`, `ITEM_GLYPH` and
 * `summary.byOutcome` — all three type-forced `Record<Outcome, …>` maps that REFUSE TO
 * COMPILE when the union grows — this is a plain `readonly Outcome[]`, so it accepts a
 * missing member SILENTLY. `broken` (@SCN-LDG-017) is the lived case: it joined the union,
 * tallied into the JSON via `byOutcome.broken`, and would have been omitted from this table
 * with a clean build. A new `Outcome` member MUST be added here too. The @SCN-RPT-019
 * exhaustiveness guard (markdown.test.ts) derives its expectation from a type-forced
 * `Record<Outcome, true>` and reds if this array ever falls behind the union again.
 */
const OUT_OF_BALANCE_OUTCOMES: readonly Outcome[] = [
  "missing",
  "failing",
  "watermelon",
  "cites-unknown-scenario",
  "cites-no-scenario",
  // A credit whose proving SUITE FAILED TO COLLECT (@SCN-LDG-017) — a suspense-row sibling of
  // `cites-no-scenario`, distinguished by errored-vs-completed. Its own leaf, never folded in.
  "broken",
  "undemanded",
  "both-missing",
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
        // The Outcome cell shows the canon DESCRIPTION, not the bare handle (3F-1626,
        // single-sourced from OUTCOME_DESCRIPTION); the ITEM_GLYPH glyph is retained.
        .map((r) => `| ${s.scnId} | ${r.guard!} | ${ITEM_GLYPH[r.outcome]} ${OUTCOME_DESCRIPTION[r.outcome]} |`)
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
 * Reads the report's materialised `summary.scenarioReconciliations`, `evidenceObligations`, and
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
  const totals = report.summary.scenarioReconciliations;
  const lines = [
    // The reconciled per-scenario OUTPUT table — "Scenario Reconciliations", not "Ledger"
    // ("Ledger" is the INPUT concept in canon; double-entry-manifesto).
    "## Scenario Reconciliations",
    "",
    // The headline verdict tally counts EVERY Scenario Reconciliation — declared, phantom and
    // suspense alike (@SCN-RMD-001, 3F-1724; the declared-only "ruling Q3" is retracted).
    `- ${totals.total} scenario(s): ${totals.balanced} balanced, ` +
      `${totals.outOfBalance} out-of-balance.`,
  ];
  // The phantom (P) count is broken out as a SUB-COUNT of the tally above — it is counted
  // INSIDE total / out-of-balance (a phantom reconciliation is always out-of-balance), and
  // named here so a reader sees what makes up the total.
  if (totals.phantom > 0) {
    lines.push(
      `- ${totals.phantom} phantom-scenario(s): cited by an evidence observation, declared by no feature.`
    );
  }
  // The suspense (S) count is broken out the same way — credits citing no scenario at all
  // (uncited evidence observations + unattributed static-guards), aggregated into one row,
  // counted INSIDE the tally above.
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
      const items = renderRowExceptions(s);
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
 * test volume added): title → provenance → the run-integrity stamp (only when the run is
 * unsound) → Summary views
 * (Evidence reconciliation, test volume, lint evidence obligations, out-of-balance by feature)
 * → the ledger. The `## Warnings` section was RETIRED entirely: the
 * no-evidence-declared scenario is now a `both-missing` ledger row, and the declared-corpus
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
