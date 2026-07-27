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
  QualityCheck,
  RuntimeQualityCheck,
  Ledger,
  PendingItem,
} from "../model.js";
// The single source for the human-readable outcome gloss — rendered in place of the bare
// handle wherever an outcome surfaces to a reader (3F-1626) — and the DERIVED leaf list the
// decomposition walks (3F-1806): both live in the model, so the renderer cannot drift from the
// union. Internal core imports (NOT on the frozen v1 barrel).
import { OUTCOME_DESCRIPTION, OUT_OF_BALANCE_OUTCOMES } from "../model.js";
import {
  projectProvenanceObject,
  type RunContext,
} from "../provenance/provenance.js";
import type { EvidenceObligations } from "../census/evidenceObligations.js";
import { RUNTIME_QUALITY_CHECKS } from "../domain/ledger.js";
import { assembleReport, type EvidenceReconciliation } from "../assemble/report.js";
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
  // The watermelon: green on the surface (a static guard exists), red within (not wired
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
  // declared — the undemanded reconciling item on the real scenario's row (@SCN-LDG-008).
  "undemanded": "◇",
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
  // A CREDIT-SIDE item surfaces its WHERE-TO-FIX in the reconciliation cell (ruling
  // Q5): a lint credit (the uncited static-guard folded onto the suspense row, ruling
  // Q4) shows its static guard handle; a runtime credit (phantom `cites-unknown-scenario` or
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
  } else if (isCredit && item.staticGuard) suffix = ` (${item.staticGuard})`;
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
 * Item is a structurally distinct category, never one of the out-of-balance leaf outcomes.
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
 * A section-emitter — one ordered slab of the report over the shared `EvidenceReconciliation` model (+ the
 * markdown-only `featureNames` label lookup). An empty array OMITS the section (so a cut
 * vanishes when its data is empty). Each emitter opens with its heading and ends with a
 * trailing blank line; `renderReport` flat-maps the ordered list and joins, so the blanks
 * separate the sections cleanly.
 */
type SectionEmitter = (report: EvidenceReconciliation) => string[];

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
  // The TOOL's own identity (3F-1916) — which spec-controller produced this run,
  // distinct from the target's Source SHA above. A null tool SHA renders the explicit
  // "unknown (not a git checkout)" (mirroring Source SHA's null-rendering); the version
  // is always present, so a run stays attributable even with no SHA.
  lines.push(`- Tool SHA: ${p.toolSha ?? "unknown (not a git checkout)"}`);
  lines.push(`- Tool version: ${p.toolVersion}`);
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
  if (!hasBrokenEvidence({ scenarioReconciliations: report.ledger.scenarioReconciliations })) return [];
  const brokenItems = report.ledger.scenarioReconciliations.flatMap((s) =>
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
  const reconciliation = { scenarioReconciliations: report.ledger.scenarioReconciliations };
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
          gloss: "every Scenario Reconciliation balances: scenario, phantom and suspense alike.",
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
 * Test volume (@SCN-RPT-010) — the evidence-observation side under Summary views, the
 * counterpart to the Evidence reconciliation' demand side. Renders the balancing identity
 * (`N evidence observations = a on scenarios + b on phantom scenarios + c on the suspense scenario`,
 * a DERIVED view of the retained aggregate, grouped by the SCENARIO-KIND each credit posted to)
 * then the per-quality-check evidence observation table
 * (all four runtime quality-checks, zeros shown — a fixed tally like Evidence reconciliation).
 * Omitted only when no evidence-observation read is threaded (the 3-arg back-compat path). The
 * identity holds BY CONSTRUCTION (one shared pass in src/evidenceObservations.ts); the renderer
 * only sums what the aggregate already counted by kind. Quality-checks read as their tag words,
 * lowercase (the label-=-tag rule). The numbers read off the report's materialised
 * `summary.testVolume` + `summary.rawByRuntimeQualityCheck` (both Ledger folds, 3F-2103 — the
 * `evidenceObservations` section retired).
 */
const testVolumeSection: SectionEmitter = (report) => {
  const volume = report.summary.testVolume;
  const raw = report.summary.rawByRuntimeQualityCheck;
  if (!volume || !raw) return [];
  const total = volume.totalEvidenceObservations;
  // Three DIRECT reads off the materialised kind-counts — the renderer does no arithmetic on this
  // line. The three terms are grouped by the SCENARIO-KIND each credit posted to (the canon
  // grouping): on scenarios (a scenario's account), on phantom scenarios (invented
  // phantom-scenario accounts — many can exist, hence the plural) and on the suspense scenario (the
  // one suspense account, singular — includes broken). The identity total = onScenario +
  // onPhantomScenario + onSuspenseScenario holds BY CONSTRUCTION (one shared runtimeObservationTally
  // fold), so the three printed terms cannot drift from the total.
  const lines = [
    "### Test volume",
    "",
    `${total} evidence observations = ${volume.onScenario} on scenarios + ${volume.onPhantomScenario} on phantom scenarios + ${volume.onSuspenseScenario} on the suspense scenario.`,
    "",
    "| Quality-check | Evidence observations |",
    "| --- | --- |",
  ];
  for (const qualityCheck of RUNTIME_QUALITY_CHECKS) {
    lines.push(`| ${qualityCheck} | ${raw[qualityCheck]} |`);
  }
  lines.push("");
  return lines;
};

/**
 * Static guards (@SCN-USG-001) — the STATIC-guard evidence observation side under
 * Summary views, the mirror of `### Test volume` on the runtime axis. Renders the counts line
 * (`N static guard(s) run, K uncited static guard(s)`) alone — a pure counts summary, symmetric with
 * `### Test volume` (2.4). The demanded count is implicit (`running − uncited`), so it
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
  // volume + the uncited count render here; the demanded count is implicit.
  return [
    "### Static guards",
    "",
    `${counts.runningGuardCount} static guard(s) run, ${counts.uncitedStaticGuardCount} uncited static guard(s).`,
    "",
  ];
};

/**
 * Lint evidence obligations (@SCN-RPT-005; re-cut under Summary views with a
 * total line; labelled by the @lint TAG, not the kind) — lifts
 * every `kind === "static"` (`@lint`) evidence obligation out of the per-scenario trial
 * balance into its OWN `### Lint evidence obligations` table `| Scenario | Static guard | Outcome |`,
 * one row per evidenceObligation in document order, each `outcome` carrying its `ITEM_GLYPH` glyph (so a
 * 🍉 watermelon reads at a glance). The total line outcomes how many of them reconcile
 * balanced — read off the report's materialised `summary.lint` tally. The
 * heading/total label is the tag word "lint" (the internal kind "static" is never rendered).
 * Omitted entirely (returns `[]`) when no scenario declares a lint evidenceObligation.
 * The rows are a pure derive over `report.ledger.scenarioReconciliations[].evidenceObligations[]`; markdown-only.
 */
const lintSection: SectionEmitter = (report) => {
  // Scenario rows only — a lint evidence obligation is a declared-side thing. The suspense row's
  // lint credit (an uncited static-guard, cites-no-scenario) is NOT an evidence obligation, so
  // it stays out of this table + tally; it surfaces on the suspense row's reconciling items.
  const rows = report.ledger.scenarioReconciliations
    .filter((s) => s.kind !== "phantom-scenario" && s.kind !== "suspense-scenario")
    .flatMap((s) =>
      s.qualityCheckReconciliations
        .filter((r) => r.qualityCheck === "lint")
        // The Outcome cell shows the canon DESCRIPTION, not the bare handle (3F-1626,
        // single-sourced from OUTCOME_DESCRIPTION); the ITEM_GLYPH glyph is retained.
        .map((r) => `| ${s.scnId} | ${r.staticGuard!} | ${ITEM_GLYPH[r.outcome]} ${OUTCOME_DESCRIPTION[r.outcome]} |`)
    );
  if (rows.length === 0) return [];
  const { satisfied, total } = report.summary.lint;
  return [
    "### Lint evidence obligations",
    "",
    `${satisfied} of ${total} lint evidence obligations reconcile satisfied.`,
    "",
    "| Scenario | Static guard | Outcome |",
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
 * `report.ledger.scenarioReconciliations` (+ the model's `metadata.featureNames` title lookup);
 * markdown-only.
 */
const byFeatureSection: SectionEmitter = (report) => {
  // Scenario rows only (ruling Q3) — phantom/suspense rows are grouped at
  // the end of the Ledger, not folded into the scenario out-of-balance-by-feature cut.
  const scenarios = report.ledger.scenarioReconciliations.filter(
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
  scenarios: readonly ScenarioReconciliation[]
): EvidenceColumn[] {
  // Only scenario rows carry evidence obligations that drive columns — a phantom / suspense
  // row's credit-side items are not evidence obligations, so they never add a column.
  const scenarioRows = scenarios.filter(
    (s) => s.kind !== "phantom-scenario" && s.kind !== "suspense-scenario"
  );
  const hasStatic = scenarioRows.some((s) =>
    s.qualityCheckReconciliations.some((o) => o.qualityCheck === "lint")
  );
  const qualityChecksPresent = new Set<RuntimeQualityCheck>();
  // A column appears for every runtime quality-check present in DEMAND or OBSERVATION on a scenario
  // row. Both are read off the Ledger: a declared or undemanded quality-check surfaces as a
  // `QualityCheckReconciliation` at that check; every observed credit surfaces as a posted credit on
  // the row (@SCN-LDG-022). The retired census's `attributed[]` re-represented those posted credits
  // — it added no quality-check the rows do not already carry (a matched/undemanded credit always
  // has its `QualityCheckReconciliation`), so folding the rows keeps the column set byte-identical.
  for (const s of scenarioRows) {
    for (const o of s.qualityCheckReconciliations) {
      // A both-missing item carries no quality-check — it drives no column.
      if (o.qualityCheck && o.qualityCheck !== "lint") qualityChecksPresent.add(o.qualityCheck);
    }
    for (const o of s.evidenceObservations) {
      if (o.qualityCheck !== "lint") qualityChecksPresent.add(o.qualityCheck);
    }
  }
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
 * The quality-check → single-letter obligation glyph, parallel to `columnHeader` — the LEFT side
 * of the two-sided cell (the demand). A single letter names WHICH check is obligated; the right
 * side (after the `/`) carries the OBSERVATION count (the credit). The `L2` left-count for lint is
 * a later slice — a lint obligation always shows the single `L` here.
 */
const QUALITY_CHECK_LETTER: Record<QualityCheck, string> = {
  lint: "L",
  unit: "U",
  integration: "I",
  e2e: "E",
  performance: "P",
};

/**
 * One evidence cell — the two-sided `<obligation>/<observation>` encoding. The LEFT side is the
 * DEMAND (a single quality-check letter iff the scenario obligated this check, else `-`); the RIGHT
 * side is the OBSERVATION count (the multiplicity of posted credits at this check, else `-`). It
 * projects the two-sided ledger row — it reconstructs nothing. It counts BACKING (presence), NOT
 * quality: a failing runtime evidenceObligation still shows its credit count (the failing-ness lives
 * in the Verdict + Reconciling-items columns), so `U/-` is unambiguously demanded-but-missing (zero
 * evidenceObservations). A `-/N` cell is an UNDEMANDED observation (a credit at a check the scenario
 * did not demand, @SCN-LDG-008); a doubly-empty `-/-` renders BLANK (`""`) — no demand, no credit.
 * The lint cell reads the scenario's static evidenceObligation outcomes (lint is not a counted
 * evidence observation): its right side is the count of static guards PRESENT — `balanced` or the
 * watermelon (the script exists; its inadequacy is quality, in Reconciling-items 🍉), NOT a posted
 * credit. The count exposes backing, not quality — never rank by it.
 */
function evidenceCell(
  s: ScenarioReconciliation,
  col: EvidenceColumn
): string {
  // A PHANTOM / suspense row has no evidence-obligation demand of its own — its
  // whole story is the credit-side reconciling item. Every evidence cell is neither-declared-
  // nor-a-matched-evidence obligation, so it reads `—`; the citation shows in Reconciling items.
  if (s.kind === "phantom-scenario" || s.kind === "suspense-scenario") return "—";
  if (col.kind === "lint") {
    // LEFT: a lint obligation is DECLARED iff a lint QualityCheckReconciliation exists on the row
    // (a single `L` — the `L2` left-count is a later slice). RIGHT: the PRESENT-guard count — the
    // static guards `satisfied` or watermelon. Lint's right stays this static-outcome derivation
    // (NOT `evidenceObservations`): lint carries no credit multiplicity, so the count is exact.
    const statics = s.qualityCheckReconciliations.filter((o) => o.qualityCheck === "lint");
    const left = statics.length > 0 ? QUALITY_CHECK_LETTER.lint : "-";
    const present = statics.filter(
      (o) => o.outcome === "satisfied" || o.outcome === "watermelon"
    ).length;
    const right = present > 0 ? String(present) : "-";
    return left === "-" && right === "-" ? "" : `${left}/${right}`;
  }
  // LEFT — DEMAND is ASKED of the Ledger, not reconstructed. `s.evidenceObligations` is the debit
  // side the scenario declared (@SCN-LDG-023) — the fact itself — filtered to the ACTIVE ones: a
  // `<qc>pending` obligation demands NOTHING (it partitions off to a one-sided Pending Item), so it
  // is not a demand. Demanded → the check's letter; else `-`.
  const demanded = s.evidenceObligations.some(
    (o) => o.qualityCheck === col.qualityCheck && !o.pending
  );
  const left = demanded ? QUALITY_CHECK_LETTER[col.qualityCheck] : "-";
  // RIGHT — the OBSERVATION count is the MULTIPLICITY of POSTED CREDITS at this quality-check on THIS
  // row (@SCN-LDG-022) — read straight off the Ledger's `evidenceObservations`, NEVER from
  // `qualityCheckReconciliations` (which collapse to ONE matched row however many credits cite the
  // pair, and would undercount duplicate citations). BOTH the demanded and undemanded arms read this
  // one source: a demanded check's credits are matched-attributed, an undemanded check's credits post
  // as undemanded rows — the same posted credits either way, so `evidenceObservations` is the single
  // multiplicity-correct count. (Provably equal to the retired split off `qualityCheckReconciliations`
  // for the undemanded arm — the reconciler posts one undemanded QCR per citing credit — but that
  // derivation collapses duplicate citations, so the credits are the correct source.)
  const observed = s.evidenceObservations.filter(
    (o) => o.qualityCheck === col.qualityCheck
  ).length;
  const right = observed > 0 ? String(observed) : "-";
  // A doubly-empty cell (no demand, no credit) renders BLANK — the column is simply absent for this
  // scenario. Otherwise the two-sided `<left>/<right>`.
  return left === "-" && right === "-" ? "" : `${left}/${right}`;
}

/**
 * The ledger (moved to the END) — the per-scenario
 * table, with its summary lines on top: the verdict tally bullet, and (when a
 * declared-evidence-obligations census is threaded) the excluded-occurrence bullet relocated
 * here from the dissolved `## Declared corpus` section (Q1a). When the
 * evidence-observation aggregate is threaded, the row gains corpus-driven evidence
 * columns between Scenario and Verdict, each a four-way demand×evidence observation cell; without the
 * aggregate the original three-column ledger is preserved (the 2-/3-arg callers
 * stay green). Markdown-only (the JSON carries the raw scenario facts + the declared / observed
 * objects); the verdict-tally bullet names the collection "Scenario Reconciliation(s)" — canon's
 * noun for the reconciled OUTPUT collection (scenario + phantom + suspense), never "scenario(s)"
 * (@SCN-RPT-024, 3F-1919; "scenarios" is a Rejected alias).
 * Reads the report's materialised `summary.scenarioReconciliations`, `evidenceObligations`, and
 * `evidenceObservations.attributed`.
 */
const ledgerSection: SectionEmitter = (report) => {
  // Group the scenario rows first, then the PHANTOM rows, then the SUSPENSE row as
  // distinct blocks at the END (ruling Q3) — a phantom/suspense is not a
  // scenario, so it never mingles with the scenario verdict rows.
  const scenarioRows = report.ledger.scenarioReconciliations.filter(
    (s) => s.kind !== "phantom-scenario" && s.kind !== "suspense-scenario"
  );
  const phantomRows = report.ledger.scenarioReconciliations.filter((s) => s.kind === "phantom-scenario");
  const suspenseRows = report.ledger.scenarioReconciliations.filter((s) => s.kind === "suspense-scenario");
  const scenarios = [...scenarioRows, ...phantomRows, ...suspenseRows];
  // The runtime-observation axis is IN PLAY iff the summary carries the test-volume fold
  // (@SCN-RPT-010 / 3F-2103 — the gate that was the retired `evidenceObservations` section's
  // presence). When it is, the ledger gains the corpus-driven evidence columns.
  const withObservations = report.summary.testVolume !== undefined;
  const totals = report.summary.scenarioReconciliations;
  const lines = [
    // The reconciled per-scenario OUTPUT table — "Scenario Reconciliations", not "Ledger"
    // ("Ledger" is the INPUT concept in canon; double-entry-manifesto).
    "## Scenario Reconciliations",
    "",
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
      `- ${totals.phantom} phantom-scenario(s): cited by an evidence observation, declared by no feature.`
    );
  }
  // The suspense (S) count is broken out the same way — credits citing no scenario at all
  // (uncited evidence observations + uncited static-guards), aggregated into one row,
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

  const columns = withObservations ? evidenceColumns(scenarios) : [];
  if (withObservations && columns.length > 0) {
    const headers = [
      "Scenario",
      ...columns.map(columnHeader),
      "Verdict",
      "Reconciling items",
    ];
    lines.push(`| ${headers.join(" | ")} |`);
    lines.push(`| ${headers.map(() => "---").join(" | ")} |`);
    for (const s of scenarios) {
      const cells = columns.map((col) => evidenceCell(s, col));
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
 * no-evidence scenario (the earlier no-evidence-declared warning) is now a `both-missing` ledger
 * row, and the declared-corpus
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
 * a PURE PRESENTATION over the same `EvidenceReconciliation` the JSON serialises. Exposed for slice 3's
 * render-from-saved-JSON path: a consumer rebuilds a `EvidenceReconciliation` from banked JSON and
 * renders the human view off it, with no `RunContext` in hand. Needs NO external map — the
 * feature titles are read off `report.metadata.featureNames` (@SCN-RMD-006; nested under
 * `metadata`), so the by-feature cut names each feature in full from the model alone.
 */
export function renderReport(report: EvidenceReconciliation): string {
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
  return renderReport(JSON.parse(json) as EvidenceReconciliation);
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
  balance: Ledger,
  ctx: RunContext,
  evidenceObligations?: EvidenceObligations,
  withRuntimeObservations: boolean = false,
  featureNames?: FeatureNames,
  withStaticGuards: boolean = false
): string {
  const report = assembleReport(balance, ctx, evidenceObligations, withRuntimeObservations, withStaticGuards, featureNames);
  return renderReport(report);
}
