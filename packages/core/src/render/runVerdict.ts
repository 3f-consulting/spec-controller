import type { RenderInput } from "../assemble/renderInput.js";
import type { Ledger } from "../model.js";
import type { ProvenanceObject } from "../provenance/provenance.js";
import { isBalanced, hasPendingItems } from "../domain/ledger.js";
import { hasScenarioCodeErrors } from "../domain/scenarioCodeError.js";
import { verdictCode, type VerdictCode } from "../domain/verdictCode.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";

const DEFAULT_CORPUS_DIR = "features";

type Verdict = { headline: string; exit: string; gloss: string };

function corpusExamined(provenance: ProvenanceObject): string {
  return provenance.inputs.features ?? DEFAULT_CORPUS_DIR;
}

function scenarioCodeErrorsVerdict(reconciliation: Ledger): Verdict {
  const alsoOutOfBalance = isBalanced(reconciliation) ? "" : CORE_MESSAGES[CoreMessage.AlsoOutOfBalance];
  return {
    headline: CORE_MESSAGES[CoreMessage.ScenarioCodeErrorsHeadline],
    exit: CORE_MESSAGES[CoreMessage.VerdictExit](1),
    gloss: CORE_MESSAGES[CoreMessage.ScenarioCodeErrorsGloss](alsoOutOfBalance),
  };
}

const OUT_OF_BALANCE: Verdict = {
  headline: CORE_MESSAGES[CoreMessage.OutOfBalanceHeadline],
  exit: CORE_MESSAGES[CoreMessage.VerdictExit](1),
  gloss: CORE_MESSAGES[CoreMessage.OutOfBalanceGloss],
};

const UNSOUND: Verdict = {
  headline: CORE_MESSAGES[CoreMessage.UnsoundHeadline],
  exit: CORE_MESSAGES[CoreMessage.VerdictExit](4),
  gloss: CORE_MESSAGES[CoreMessage.UnsoundGloss],
};

const PENDING: Verdict = {
  headline: CORE_MESSAGES[CoreMessage.PendingHeadline],
  exit: CORE_MESSAGES[CoreMessage.VerdictExit](3),
  gloss: CORE_MESSAGES[CoreMessage.PendingGloss],
};

const BALANCED: Verdict = {
  headline: CORE_MESSAGES[CoreMessage.BalancedHeadline],
  exit: CORE_MESSAGES[CoreMessage.VerdictExit](0),
  gloss: CORE_MESSAGES[CoreMessage.BalancedGloss],
};

function nothingToReconcile(corpusDir: string): Verdict {
  return {
    headline: CORE_MESSAGES[CoreMessage.NothingToReconcileHeadline],
    exit: CORE_MESSAGES[CoreMessage.VerdictExit](5),
    gloss: CORE_MESSAGES[CoreMessage.NothingToReconcileGloss](corpusDir),
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
  const lines = [CORE_MESSAGES[CoreMessage.RunVerdictHeading], "", `${verdict.headline} — ${verdict.gloss} (${verdict.exit})`];
  if (code === 0 && hasPendingItems(reconciliation)) {
    lines.push("");
    lines.push(CORE_MESSAGES[CoreMessage.PendingItemsOutstanding]);
  }
  lines.push("");
  return lines;
};
