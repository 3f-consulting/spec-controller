/**
 * THE RUN VERDICT — the headline sentence a reader meets first, and the exit code it names. A
 * self-contained emitter, read on its own terms, so it stays out of `markdown.ts`.
 */

import type { RenderInput } from "../assemble/renderInput.js";
import type { Ledger } from "../model.js";
import type { ProvenanceObject } from "../provenance/provenance.js";
import { isBalanced, hasPendingItems } from "../domain/ledger.js";
import { hasScenarioCodeErrors } from "../domain/scenarioCodeError.js";
import { verdictCode, type VerdictCode } from "../domain/verdictCode.js";

/**
 * The corpus directory a run reads when `--features` is not supplied — the tool's own default,
 * relative to the target root. It is the STRING the report names, never a resolved path: three
 * targets in three different places all looked in the same place by the same name, which is what
 * lets a reader compare two runs' reports at all.
 */
const DEFAULT_CORPUS_DIR = "features";

/** The headline word, the exit code it names, and the sentence between them. */
type Verdict = { headline: string; exit: string; gloss: string };

/**
 * The corpus directory this run examined, off the provenance the renderer already holds
 * — the `--features` value the operator gave, or the default above.
 *
 * READ FROM `runProvenance`, WHICH IS WHY NO NEW FIELD IS OWED. `provenanceSection` derives both
 * the Inputs list and the "Not supplied" line from this same object, so the verdict names the
 * directory the header already accounts for and the two cannot disagree. A `process.cwd()` here
 * would be the obvious alternative and is barred twice over: this package is pure and
 * `lint:boundaries`'s `no-restricted-globals` rule enforces it over every non-test file under
 * `packages/core/src`, and a resolved absolute path is not the fact a reader needs.
 *
 * THE RULE NAMED HERE WAS ONCE WRONG AND IS CORRECTED RATHER THAN RE-WORDED. It read "the
 * domain-purity guard enforces it", and that guard never scanned `render/` — its population was
 * `packages/core/src/domain` — nor did it look at a global at all, only at `from` specifiers. The
 * bar was real; the mechanism cited for it was not.
 */
function corpusExamined(provenance: ProvenanceObject): string {
  return provenance.inputs.features ?? DEFAULT_CORPUS_DIR;
}

/** A run whose corpus misfiles a scenario code: it heads the verdict, and never hides the balance. */
function scenarioCodeErrorsVerdict(reconciliation: Ledger): Verdict {
  const alsoOutOfBalance = isBalanced(reconciliation)
    ? ""
    : " The accounts do not agree either: at least one Scenario Reconciliation carries a reconciling item.";
  return {
    headline: "**SCENARIO CODE ERRORS**",
    exit: "exit 1",
    gloss:
      "the corpus files a scenario code under the wrong feature, so the by-feature grouping " +
      `cannot be trusted. Read \`## Scenario code errors\` above.${alsoOutOfBalance} This run FAILED.`,
  };
}

const OUT_OF_BALANCE: Verdict = {
  headline: "**OUT-OF-BALANCE**",
  exit: "exit 1",
  gloss: "the accounts do not agree. At least one Scenario Reconciliation carries a reconciling item. This run FAILED.",
};

const UNSOUND: Verdict = {
  headline: "**UNSOUND**",
  exit: "exit 4",
  // Generic over both producers: a cucumber ambiguity is not a collection failure, and the
  // run-integrity stamp above carries the detail.
  gloss:
    "the evidence could not be TRUSTED to reconcile. A proof never ran, so the behaviour " +
    "it proves was never exercised. Read the run-integrity stamp above before any count " +
    "below it.",
};

const PENDING: Verdict = {
  headline: "**PENDING**",
  exit: "exit 3",
  gloss:
    "every Scenario Reconciliation balances, but Pending Items are outstanding and this run " +
    "treats a deferral as a failure (`--strict`). This run FAILED.",
};

const BALANCED: Verdict = {
  headline: "**BALANCED**",
  exit: "exit 0",
  gloss: "every Scenario Reconciliation balances: scenario, phantom and suspense alike.",
};

function nothingToReconcile(corpusDir: string): Verdict {
  return {
    headline: "**NOTHING TO RECONCILE**",
    exit: "exit 5",
    // Names the absence on both sides, because the remedies differ, and the directory it looked
    // in: a consumer whose corpus lives elsewhere must be able to tell "I found nothing" from
    // "I looked somewhere you never used".
    gloss:
      "there were no accounts to agree. The ledger carries no Scenario Reconciliation at " +
      `all, so this run has NO BASIS FOR A VERDICT — nothing was declared in \`${corpusDir}\` ` +
      "and nothing was produced. Not balanced: a run that examined nothing must not certify.",
  };
}

/** The words for the code the ladder gave. Each headline word is a render word, never a predicate name. */
function verdictFor(code: VerdictCode, reconciliation: Ledger, corpusDir: string, codeErrors: boolean): Verdict {
  switch (code) {
    case 5:
      return nothingToReconcile(corpusDir);
    case 4:
      return UNSOUND;
    case 1:
      return codeErrors ? scenarioCodeErrorsVerdict(reconciliation) : OUT_OF_BALANCE;
    case 3:
      return PENDING;
    case 0:
      return BALANCED;
  }
}

/**
 * The run-verdict headline — the first thing under `## Summary views`, so the summary opens with
 * the bottom line. Always present: a balanced run needs its verdict line as much as a failing one.
 *
 * The code it names is `verdictCode`'s, read over the same ledger, code errors and strictness the
 * process exit is computed from, so the two cannot disagree. Strictness is read off the report's
 * provenance; a report saved before it was recorded reads as not strict.
 */
export const runVerdictSection = (report: RenderInput): string[] => {
  const reconciliation = { scenarioReconciliations: report.ledger.scenarioReconciliations };
  const codeErrors = hasScenarioCodeErrors(report);
  const code = verdictCode({
    ledger: reconciliation,
    scenarioCodeErrors: report.scenarioCodeErrors,
    strict: report.runProvenance.strict === true,
  });
  const verdict = verdictFor(code, reconciliation, corpusExamined(report.runProvenance), codeErrors);
  const lines = ["### Run verdict", "", `${verdict.headline} — ${verdict.gloss} (${verdict.exit})`];
  // A run that is not strict still names the possibility, and stops short of claiming it.
  if (code === 0 && hasPendingItems(reconciliation)) {
    lines.push("");
    lines.push(
      "⏳ Pending Items are outstanding — deferred, not out-of-balance, so the verdict stands. " +
        "A run that treats a deferral as a failure gives exit 3 under `--strict`."
    );
  }
  lines.push("");
  return lines;
};
