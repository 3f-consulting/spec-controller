import type { ExitCodeOf, RenderInput } from "../domain/renderInput.js";
import type { Ledger } from "../model.js";
import { isBalanced, hasPendingItems } from "../domain/ledger.js";
import { scenarioCodeErrorsAre, type ScenarioCodeError } from "../domain/scnTags.js";
import type { RunVerdict } from "../domain/runVerdict.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";

type VerdictLine = { readonly headline: string; readonly gloss: string };

function scenarioCodeErrorsGloss(errors: readonly ScenarioCodeError[], alsoOutOfBalance: string): string {
  switch (scenarioCodeErrorsAre(errors)) {
    case "misfilings":
      return CORE_MESSAGES[CoreMessage.ScenarioCodeErrorsGloss](alsoOutOfBalance);
    case "several-codes":
      return CORE_MESSAGES[CoreMessage.SeveralScnCodesGloss](alsoOutOfBalance);
    case "both":
      return CORE_MESSAGES[CoreMessage.MisfiledAndSeveralScnCodesGloss](alsoOutOfBalance);
  }
}

function scenarioCodeErrorsVerdict(ledger: Ledger, errors: readonly ScenarioCodeError[]): VerdictLine {
  const alsoOutOfBalance = isBalanced(ledger) ? "" : CORE_MESSAGES[CoreMessage.AlsoOutOfBalance];
  return {
    headline: CORE_MESSAGES[CoreMessage.ScenarioCodeErrorsHeadline],
    gloss: scenarioCodeErrorsGloss(errors, alsoOutOfBalance),
  };
}

const OUT_OF_BALANCE: VerdictLine = {
  headline: CORE_MESSAGES[CoreMessage.OutOfBalanceHeadline],
  gloss: CORE_MESSAGES[CoreMessage.OutOfBalanceGloss],
};

const UNSOUND: VerdictLine = {
  headline: CORE_MESSAGES[CoreMessage.UnsoundHeadline],
  gloss: CORE_MESSAGES[CoreMessage.UnsoundGloss],
};

const PENDING: VerdictLine = {
  headline: CORE_MESSAGES[CoreMessage.PendingHeadline],
  gloss: CORE_MESSAGES[CoreMessage.PendingGloss],
};

const BALANCED: VerdictLine = {
  headline: CORE_MESSAGES[CoreMessage.BalancedHeadline],
  gloss: CORE_MESSAGES[CoreMessage.BalancedGloss],
};

function nothingToReconcile(corpusDir: string): VerdictLine {
  return {
    headline: CORE_MESSAGES[CoreMessage.NothingToReconcileHeadline],
    gloss: CORE_MESSAGES[CoreMessage.NothingToReconcileGloss](corpusDir),
  };
}

function verdictFor(verdict: RunVerdict, ledger: Ledger, corpusDir: string, codeErrors: readonly ScenarioCodeError[]): VerdictLine {
  switch (verdict) {
    case "nothing-to-reconcile":
      return nothingToReconcile(corpusDir);
    case "unsound":
      return UNSOUND;
    case "scenario-code-errors":
      return scenarioCodeErrorsVerdict(ledger, codeErrors);
    case "out-of-balance":
      return OUT_OF_BALANCE;
    case "pending":
      return PENDING;
    case "balanced":
      return BALANCED;
  }
}

export const runVerdictSection = (report: RenderInput, exitCodeOf: ExitCodeOf): string[] => {
  const reconciliation = { claimReconciliations: report.ledger.claimReconciliations };
  const verdict = report.summary.runVerdict;
  const line = verdictFor(verdict, reconciliation, report.runProvenance.corpus, report.scenarioCodeErrors ?? []);
  const exit = CORE_MESSAGES[CoreMessage.VerdictExit](exitCodeOf(verdict));
  const lines = [CORE_MESSAGES[CoreMessage.RunVerdictHeading], "", `${line.headline} — ${line.gloss} (${exit})`];
  if (verdict === "balanced" && hasPendingItems(reconciliation)) {
    lines.push("");
    lines.push(CORE_MESSAGES[CoreMessage.PendingItemsOutstanding]);
  }
  lines.push("");
  return lines;
};
