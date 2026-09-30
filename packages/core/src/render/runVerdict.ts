import type { RenderInput } from "../assemble/renderInput.js";
import type { Ledger } from "../model.js";
import type { ProvenanceObject } from "../provenance/provenance.js";
import { isBalanced, hasPendingItems } from "../domain/ledger.js";
import { hasScenarioCodeErrors } from "../domain/scenarioCodeError.js";
import { verdictCode, type VerdictCode } from "../domain/verdictCode.js";

const DEFAULT_CORPUS_DIR = "features";

type Verdict = { headline: string; exit: string; gloss: string };

function corpusExamined(provenance: ProvenanceObject): string {
  return provenance.inputs.features ?? DEFAULT_CORPUS_DIR;
}

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
    gloss:
      "there were no accounts to agree. The ledger carries no Scenario Reconciliation at " +
      `all, so this run has NO BASIS FOR A VERDICT — nothing was declared in \`${corpusDir}\` ` +
      "and nothing was produced. Not balanced: a run that examined nothing must not certify.",
  };
}

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
