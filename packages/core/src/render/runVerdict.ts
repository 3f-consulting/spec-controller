/**
 * THE RUN VERDICT — the headline sentence a reader meets first, and the exit code it names.
 *
 * Its own module rather than a further section in `markdown.ts`, which sits at a `max-lines`
 * exception — and an exception excuses existing debt, never headroom (complexity-threshold.feature).
 * The precedent is `measuredItem.ts`, moved out for the same reason; the move was forced here by
 * @SCN-CLI-019 adding a fifth verdict, and it is the emitter this file is named for.
 */

import type { RenderInput } from "../assemble/renderInput.js";
import type { Ledger } from "../model.js";
import type { ProvenanceObject } from "../provenance/provenance.js";
import {
  hasBrokenEvidence,
  isBalanced,
  hasPendingItems,
  hasNothingToReconcile,
} from "../domain/ledger.js";

/**
 * The corpus directory a run reads when `--features` is not supplied — the tool's own default,
 * relative to the target root. It is the STRING the report names, never a resolved path: three
 * targets in three different places all looked in the same place by the same name, which is what
 * lets a reader compare two runs' reports at all (@SCN-CLI-018).
 */
const DEFAULT_CORPUS_DIR = "features";

/** The headline word, the exit code it names, and the sentence between them. */
type Verdict = { headline: string; exit: string; gloss: string };

/**
 * The corpus directory this run examined, off the provenance the renderer already holds
 * (@SCN-CLI-018) — the `--features` value the operator gave, or the default above.
 *
 * READ FROM `runProvenance`, WHICH IS WHY NO NEW FIELD IS OWED. `provenanceSection` derives both
 * the Inputs list and the "Not supplied" line from this same object, so the verdict names the
 * directory the header already accounts for and the two cannot disagree. A `process.cwd()` here
 * would be the obvious alternative and is barred twice over: this package is pure and
 * `lint:boundaries`'s `no-restricted-globals` rule enforces it over every non-test file under
 * `packages/core/src`, and a resolved absolute path is not the fact a reader needs.
 *
 * THE RULE NAMED HERE WAS WRONG UNTIL 3F-3438 AND IS CORRECTED RATHER THAN RE-WORDED. It read "the
 * domain-purity guard enforces it", and that guard never scanned `render/` — its population was
 * `packages/core/src/domain` — nor did it look at a global at all, only at `from` specifiers. The
 * bar was real; the mechanism cited for it was not.
 */
function corpusExamined(provenance: ProvenanceObject): string {
  return provenance.inputs.features ?? DEFAULT_CORPUS_DIR;
}

/** Which verdict this ledger has earned — the dominance chain, and nothing else. */
function verdictOf(reconciliation: Ledger, corpusDir: string): Verdict {
  // The predicates, in the CLI's dominance order. Each headline word is the RENDER word, not the
  // predicate name (`hasBrokenEvidence` → "UNSOUND"), the `isBalanced` → "balanced" precedent —
  // and "UNSOUND" is coherent with the `## Run integrity: unsound` stamp above (@SCN-RPT-021).
  //
  // `hasNothingToReconcile` IS FIRST, in the SAME position it holds in the CLI ladder, and that
  // shared position is what keeps @SCN-CLI-013's invariant true by construction rather than by
  // coincidence (@SCN-CLI-019). Its position among the other three is otherwise FREE — an empty
  // ledger fires none of them (no rows, so no row to carry anything), measured at 3F-3344 rather
  // than argued. What it may NOT sit after is the terminal arm: "**BALANCED**" is where this chain
  // ENDS UP, not a case it tests for, so a fifth verdict has to displace that default rather than
  // follow it. Deleted, the headline reads "**BALANCED** … (exit 0)" over a run with no accounts
  // at all, which is the fault itself.
  const verdict = hasNothingToReconcile(reconciliation)
    ? {
        headline: "**NOTHING TO RECONCILE**",
        exit: "exit 5",
        // NAMES THE ABSENCE ON BOTH SIDES, because the two are different remedies: a target that
        // declared nothing needs scenarios, one that produced nothing needs its evidence wired in.
        //
        // AND IT NAMES WHERE IT LOOKED FOR THE DECLARATIONS (@SCN-CLI-018). "I found no record" and
        // "I found no regression" must never wear one word — the rule this repository already
        // applies to the mutation record (3F-2947), reaching the corpus. A consumer whose corpus
        // lives somewhere else reads this sentence as a report on a directory they never used, and
        // the only thing separating those two readings is the directory being said out loud.
        gloss:
          "there were no accounts to agree. The ledger carries no Scenario Reconciliation at " +
          `all, so this run has NO BASIS FOR A VERDICT — nothing was declared in \`${corpusDir}\` ` +
          "and nothing was produced. Not balanced: a run that examined nothing must not certify.",
      }
    : hasBrokenEvidence(reconciliation)
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
  return verdict;
}

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
 * THE DOMINANCE ORDER MIRRORS `cli-balance/cli.ts` EXACTLY — nothing-to-reconcile → broken →
 * out-of-balance → pending. The headline asks the same four predicates the CLI asks, in the same
 * order, and never re-derives a verdict of its own, so it cannot drift from the exit code it
 * names. The order is load-bearing for the same reason it is there: a broken run is ALWAYS
 * out-of-balance too (its `broken` item sits on the suspense row), so asking `isBalanced` first
 * would have the headline say exit 1 while the process exits 4 — and an EMPTY ledger satisfies
 * `isBalanced` VACUOUSLY (@SCN-CLI-019), so asking it first would have the headline say
 * "**BALANCED** … (exit 0)" over a run with no accounts at all. @SCN-CLI-013 (3F-1728) PINS that
 * agreement between the headline and the process.
 *
 * EXIT 3 IS THE ONE CODE THE CORE CANNOT ASSERT. `--strict` is a CLI-edge flag invisible to the
 * core (it appears nowhere in `packages/core/src`), so the renderer cannot know whether it was
 * passed. A balanced run carrying Pending Items therefore names exit 3 CONDITIONALLY ("exit 3
 * under `--strict`") and never claims it; 0 / 1 / 4 / 5 are determinate from the reconciliation
 * alone.
 */
export const runVerdictSection = (report: RenderInput): string[] => {
  const reconciliation = { scenarioReconciliations: report.ledger.scenarioReconciliations };
  const verdict = verdictOf(reconciliation, corpusExamined(report.runProvenance));
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
