import type { Outcome } from "../domain/outcome.js";
import { coreMessage } from "./coreText.js";
import { CoreMessage } from "./messages.js";

export const OUTCOME_DESCRIPTION = {
  satisfied: CoreMessage.OutcomeSatisfied,
  missing: CoreMessage.OutcomeMissing,
  failing: CoreMessage.OutcomeFailing,
  "cannot-fail": CoreMessage.OutcomeWatermelon,
  "no-claim-code": CoreMessage.OutcomeNoClaimCode,
  "duplicate-claim-code": CoreMessage.OutcomeDuplicateClaimCode,
  "cites-unknown-claim": CoreMessage.OutcomeCitesUnknownScenario,
  "cites-no-claim": CoreMessage.OutcomeCitesNoScenario,
  "not-asked-for": CoreMessage.OutcomeNoEvidenceObligation,
  "never-ran": CoreMessage.OutcomeBroken,
  "no-quality-check": CoreMessage.OutcomeBothMissing,
} as const satisfies Record<Outcome, CoreMessage>;

export const outcomeDescription = (outcome: Outcome): string => coreMessage(OUTCOME_DESCRIPTION[outcome]);
