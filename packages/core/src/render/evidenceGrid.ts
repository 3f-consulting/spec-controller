/**
 * THE LEDGER'S EVIDENCE GRID — the corpus-driven evidence columns the Scenario Reconciliations table
 * gains when the runtime-observation axis is in play, and the two-sided cell under each.
 *
 * Its own module rather than a block in `markdown.ts`, moved out whole at 3F-3524 so the ledger
 * section's split into functions under the complexity and function-length standards did not push
 * `markdown.ts` past the file-length ceiling then in force — retired portfolio-wide on
 * 2026-09-18 (3F-2320); `staticChecks.ts` and `runVerdict.ts` are the precedent. NOTHING
 * about the grid changed in the move: same columns, same headers, same cells.
 */

import type { ScenarioReconciliation, QualityCheck, RuntimeQualityCheck } from "../model.js";
import { RUNTIME_QUALITY_CHECKS } from "../domain/ledger.js";
import {
  isScenario,
  staticCheckReconciliationsOf,
  presentStaticCheckCountOf,
} from "../domain/scenarioReconciliation.js";
import { evidenceObligationsOf } from "../domain/journal.js";

/**
 * One corpus-driven evidence column in the ledger: the fitness column,
 * or a runtime quality-check column. The column SET is corpus-driven — only the quality-checks
 * the run raises or observes appear, so e2e / performance show up only when present.
 */
export type EvidenceColumn = { kind: "fitness" } | { kind: "runtime"; qualityCheck: RuntimeQualityCheck };

/**
 * Which runtime quality-checks the scenario rows RAISE or OBSERVE — the set a column appears for.
 *
 * Both are read off the Ledger: a named or no-evidence-obligation quality-check surfaces as a
 * `QualityCheckReconciliation` at that check; every observed credit surfaces as a posted credit on
 * the row (@SCN-LDG-022). The retired census's `attributed[]` re-represented those posted credits
 * — it added no quality-check the rows do not already carry (a matched/no-evidence-obligation credit always
 * has its `QualityCheckReconciliation`), so folding the rows keeps the column set byte-identical.
 */
function runtimeQualityChecksPresent(
  scenarioRows: readonly ScenarioReconciliation[]
): ReadonlySet<RuntimeQualityCheck> {
  const present = new Set<RuntimeQualityCheck>();
  for (const s of scenarioRows) {
    for (const o of s.qualityCheckReconciliations) {
      // A both-missing item carries no quality-check — it drives no column.
      if (o.qualityCheck && o.qualityCheck !== "fitness") present.add(o.qualityCheck);
    }
    for (const o of s.evidenceObservations) {
      if (o.qualityCheck !== "fitness") present.add(o.qualityCheck);
    }
  }
  return present;
}

/**
 * The corpus-driven evidence columns: fitness first (when any scenario names a fitness check), then
 * each runtime quality-check present as an EVIDENCE OBLIGATION or as a posted EVIDENCE OBSERVATION
 * on a scenario row, in canonical quality-check order.
 */
export function evidenceColumns(
  scenarios: readonly ScenarioReconciliation[]
): EvidenceColumn[] {
  // Only scenario rows carry evidence obligations that drive columns — a phantom / suspense
  // row's credit-side items are not evidence obligations, so they never add a column.
  const scenarioRows = scenarios.filter(
    isScenario
  );
  // ASKED (3F-2203) — whether a row has static-check sub-rows is the same model cut the grid cell
  // and the fitness table read. Whether a COLUMN then appears is the renderer's own business; what a
  // row's fitness sub-rows ARE is not.
  const hasStatic = scenarioRows.some((s) => staticCheckReconciliationsOf(s).length > 0);
  const qualityChecksPresent = runtimeQualityChecksPresent(scenarioRows);
  const columns: EvidenceColumn[] = [];
  if (hasStatic) columns.push({ kind: "fitness" });
  for (const qualityCheck of RUNTIME_QUALITY_CHECKS) {
    if (qualityChecksPresent.has(qualityCheck)) columns.push({ kind: "runtime", qualityCheck });
  }
  return columns;
}

/** The column's header — the quality-check word, title-cased (Fitness / Unit / Integration / …). */
export function columnHeader(col: EvidenceColumn): string {
  const word = col.kind === "fitness" ? "fitness" : col.qualityCheck;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * The quality-check → single-letter obligation glyph, parallel to `columnHeader` — the LEFT side
 * of the two-sided cell (the evidence obligation). A single letter names WHICH check is obligated; the right
 * side (after the `/`) carries the OBSERVATION count (the credit). Every letter is countless: one
 * obligation per tier, and one static check per row — one scenario is one fitness check (3F-3411).
 */
const QUALITY_CHECK_LETTER: Record<QualityCheck, string> = {
  fitness: "F",
  unit: "U",
  integration: "I",
  e2e: "E",
  performance: "P",
};

/**
 * One evidence cell — the two-sided `<obligation>/<observation>` encoding. The LEFT side is the
 * EVIDENCE OBLIGATION (a single quality-check letter iff the scenario obligated this check, else `-`); the RIGHT
 * side is the OBSERVATION count (the multiplicity of posted credits at this check, else `-`). It
 * projects the two-sided ledger row — it reconstructs nothing. It counts BACKING (presence), NOT
 * quality: a failing runtime evidenceObligation still shows its credit count (the failing-ness lives
 * in the Verdict + Reconciling-items columns), so `U/-` is unambiguously named-but-missing (zero
 * evidenceObservations). A `-/N` cell is a NO-EVIDENCE-OBLIGATION observation (a credit at a check the scenario
 * did not name, @SCN-LDG-008); a doubly-empty `-/-` renders BLANK (`""`) — no evidence obligation, no credit.
 * The fitness cell reads the scenario's fitness evidence obligation outcomes (a fitness credit is not
 * a counted evidence observation): its right side is the count of checks PRESENT — `balanced` or the
 * watermelon (the script exists; its inadequacy is quality, in Reconciling-items 🍉), NOT a posted
 * credit. The count exposes backing, not quality — never rank by it.
 */
export function evidenceCell(
  s: ScenarioReconciliation,
  col: EvidenceColumn
): string {
  // A PHANTOM / suspense row has no evidence obligation of its own — its
  // whole story is the credit-side reconciling item. Every evidence cell is neither-named-nor-
  // matched, so it reads `—`; the citation shows in Reconciling items.
  if (!isScenario(s)) return "—";
  return col.kind === "fitness" ? fitnessCell(s) : runtimeCell(s, col.qualityCheck);
}

/**
 * The two sides joined — except a doubly-empty cell (no evidence obligation, no credit), which
 * renders BLANK: the column is simply absent for this scenario.
 */
function twoSided(left: string, right: string): string {
  return left === "-" && right === "-" ? "" : `${left}/${right}`;
}

/** The fitness column's cell on a scenario row. */
function fitnessCell(s: ScenarioReconciliation): string {
  // LEFT: a fitness obligation is NAMED iff a fitness QualityCheckReconciliation exists on the row
  // (`F`). RIGHT: the PRESENT-check count — the checks `satisfied` or watermelon. The fitness
  // right stays this outcome derivation (NOT `evidenceObservations`): one scenario is one check, so
  // the count is exact.
  // BOTH SIDES ASKED (3F-2203) — the named-guard sub-rows and the present-guard count are
  // model facts, read off the row. "Present" spans satisfied AND watermelon (a watermelon guard
  // EXISTS; its inadequacy is quality, shown in Reconciling items 🍉) — an outcome-vocabulary
  // rule, which is why the renderer no longer states it.
  const left = staticCheckReconciliationsOf(s).length > 0 ? QUALITY_CHECK_LETTER.fitness : "-";
  const present = presentStaticCheckCountOf(s);
  const right = present > 0 ? String(present) : "-";
  return twoSided(left, right);
}

/** A runtime quality-check column's cell on a scenario row. */
function runtimeCell(s: ScenarioReconciliation, qualityCheck: RuntimeQualityCheck): string {
  // LEFT — EVIDENCE OBLIGATION is ASKED of the Ledger, not reconstructed. `s.evidenceObligations` is the debit
  // side the scenario RAISED (@SCN-LDG-023) — the fact itself — filtered to the ACTIVE ones: a
  // `<qc>pending` obligation names NOTHING (it partitions off to a one-sided Pending Item), so it
  // is not an evidence obligation. Named → the check's letter; else `-`.
  // ASKED, not re-encoded (3F-2203). "A pending obligation names nothing" is the model's rule
  // (canon, Pending Item — a `<qc>pending` tag raises NO Evidence Obligation), and it is the SAME
  // rule `evidenceObligationPairsOf` applies. The renderer stated the
  // `!pending` clause itself before: a third home for one rule, agreeing by copy.
  const named = evidenceObligationsOf(s.evidenceObligations).some(
    (o) => o.qualityCheck === qualityCheck
  );
  const left = named ? QUALITY_CHECK_LETTER[qualityCheck] : "-";
  // RIGHT — the OBSERVATION count is the MULTIPLICITY of POSTED CREDITS at this quality-check on THIS
  // row (@SCN-LDG-022) — read straight off the Ledger's `evidenceObservations`, NEVER from
  // `qualityCheckReconciliations` (which collapse to ONE matched row however many credits cite the
  // pair, and would undercount duplicate citations). BOTH the named and no-evidence-obligation arms read this
  // one source: a named check's credits are matched-attributed, a no-evidence-obligation check's credits post
  // as no-evidence-obligation rows — the same posted credits either way, so `evidenceObservations` is the single
  // multiplicity-correct count. (Provably equal to the retired split off `qualityCheckReconciliations`
  // for the no-evidence-obligation arm — the reconciler posts one no-evidence-obligation QCR per citing credit — but that
  // derivation collapses duplicate citations, so the credits are the correct source.)
  const observed = s.evidenceObservations.filter(
    (o) => o.qualityCheck === qualityCheck
  ).length;
  const right = observed > 0 ? String(observed) : "-";
  return twoSided(left, right);
}
