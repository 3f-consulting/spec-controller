import type { ExitCodeOf, RenderInput } from "../domain/renderInput.js";
import type { Ledger } from "../model.js";
import { isBalanced, hasPendingItems } from "../domain/ledger.js";
import { scenarioCodeErrorsAre, type ScenarioCodeError } from "../domain/scnTags.js";
import type { RunVerdict } from "../domain/runVerdict.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { markdownHeading } from "./heading.js";

type VerdictLine = { readonly headline: string; readonly gloss: string };

function scenarioCodeErrorsGloss(errors: readonly ScenarioCodeError[], alsoOutOfBalance: string): string {
  const values = { heading: CORE_MESSAGES[CoreMessage.ScenarioCodeErrorsHeading], alsoOutOfBalance };
  switch (scenarioCodeErrorsAre(errors)) {
    case "misfilings":
      return coreMessage(CoreMessage.ScenarioCodeErrorsGloss, values);
    case "several-codes":
      return coreMessage(CoreMessage.SeveralScnCodesGloss, values);
    case "both":
      return coreMessage(CoreMessage.MisfiledAndSeveralScnCodesGloss, values);
  }
}

function scenarioCodeErrorsVerdict(ledger: Ledger, errors: readonly ScenarioCodeError[]): VerdictLine {
  const alsoOutOfBalance = isBalanced(ledger) ? "" : coreMessage(CoreMessage.AlsoOutOfBalance);
  return {
    headline: coreMessage(CoreMessage.ScenarioCodeErrorsHeadline),
    gloss: scenarioCodeErrorsGloss(errors, alsoOutOfBalance),
  };
}

const OUT_OF_BALANCE: VerdictLine = {
  headline: coreMessage(CoreMessage.OutOfBalanceHeadline),
  gloss: coreMessage(CoreMessage.OutOfBalanceGloss),
};

const UNSOUND: VerdictLine = {
  headline: coreMessage(CoreMessage.UnsoundHeadline),
  gloss: coreMessage(CoreMessage.UnsoundGloss),
};

const PENDING: VerdictLine = {
  headline: coreMessage(CoreMessage.PendingHeadline),
  gloss: coreMessage(CoreMessage.PendingGloss),
};

const BALANCED: VerdictLine = {
  headline: coreMessage(CoreMessage.BalancedHeadline),
  gloss: coreMessage(CoreMessage.BalancedGloss),
};

function nothingToReconcile(corpusDir: string): VerdictLine {
  return {
    headline: coreMessage(CoreMessage.NothingToReconcileHeadline),
    gloss: coreMessage(CoreMessage.NothingToReconcileGloss, { corpusDir }),
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
  const verdict = report.summary.runVerdict;
  const line = verdictFor(verdict, report, report.runProvenance.corpus, report.errorsInTheInputs?.scenarioCodeErrors ?? []);
  const exit = coreMessage(CoreMessage.VerdictExit, { code: exitCodeOf(verdict) });
  const lines = [markdownHeading(3, coreMessage(CoreMessage.RunVerdictHeading)), "", `${line.headline} — ${line.gloss} (${exit})`];
  if (verdict === "balanced" && hasPendingItems(report)) {
    lines.push("");
    lines.push(coreMessage(CoreMessage.PendingItemsOutstanding));
  }
  lines.push("");
  return lines;
};
