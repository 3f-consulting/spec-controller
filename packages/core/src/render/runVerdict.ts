import type { ExitCodeOf, RenderInput } from "../domain/renderInput.js";
import type { Ledger } from "../model.js";
import { isBalanced, hasPendingItems } from "../domain/ledger.js";
import { claimCodeErrorsAre, type ClaimCodeError } from "../domain/scnTags.js";
import type { RunVerdict } from "../domain/runVerdict.js";
import { CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { markdownHeading } from "./heading.js";

type VerdictLine = { readonly headline: string; readonly gloss: string };

function claimCodeErrorsGloss(errors: readonly ClaimCodeError[], alsoOutOfBalance: string): string {
  const values = { heading: markdownHeading(3, coreMessage(CoreMessage.ClaimCodeErrorsHeading)), alsoOutOfBalance };
  switch (claimCodeErrorsAre(errors)) {
    case "misfilings":
      return coreMessage(CoreMessage.ClaimCodeErrorsGloss, values);
    case "several-codes":
      return coreMessage(CoreMessage.SeveralClaimCodesGloss, values);
    case "both":
      return coreMessage(CoreMessage.MisfiledAndSeveralClaimCodesGloss, values);
  }
}

function claimCodeErrorsVerdict(ledger: Ledger, errors: readonly ClaimCodeError[]): VerdictLine {
  const alsoOutOfBalance = isBalanced(ledger) ? "" : coreMessage(CoreMessage.AlsoOutOfBalance);
  return {
    headline: coreMessage(CoreMessage.ClaimCodeErrorsHeadline),
    gloss: claimCodeErrorsGloss(errors, alsoOutOfBalance),
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

function verdictFor(verdict: RunVerdict, ledger: Ledger, corpusDir: string, codeErrors: readonly ClaimCodeError[]): VerdictLine {
  switch (verdict) {
    case "nothing-to-reconcile":
      return nothingToReconcile(corpusDir);
    case "unsound":
      return UNSOUND;
    case "claim-code-errors":
      return claimCodeErrorsVerdict(ledger, codeErrors);
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
  const line = verdictFor(verdict, report, report.runProvenance.corpus, report.errorsInTheInputs?.claimCodeErrors ?? []);
  const exit = coreMessage(CoreMessage.VerdictExit, { code: exitCodeOf(verdict) });
  const lines = [markdownHeading(3, coreMessage(CoreMessage.RunVerdictHeading)), "", `${line.headline} — ${line.gloss} (${exit})`];
  if (verdict === "balanced" && hasPendingItems(report)) {
    lines.push("");
    lines.push(coreMessage(CoreMessage.PendingItemsOutstanding));
  }
  lines.push("");
  return lines;
};
