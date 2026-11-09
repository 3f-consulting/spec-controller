import type { Outcome } from "../domain/outcome.js";
import { coreMessage } from "./coreText.js";
import { CoreMessage } from "./messages.js";

export const OUTCOME_DESCRIPTION = {
  satisfied: CoreMessage.OutcomeSatisfied,
  missing: CoreMessage.OutcomeMissing,
  failing: CoreMessage.OutcomeFailing,
  "cannot-fail": CoreMessage.OutcomeCannotFail,
  "no-claim-code": CoreMessage.OutcomeNoClaimCode,
  "duplicate-claim-code": CoreMessage.OutcomeDuplicateClaimCode,
  "cites-unknown-claim": CoreMessage.OutcomeCitesUnknownClaim,
  "cites-no-claim": CoreMessage.OutcomeCitesNoClaim,
  "not-asked-for": CoreMessage.OutcomeNotAskedFor,
  "never-ran": CoreMessage.OutcomeNeverRan,
  "no-quality-check": CoreMessage.OutcomeNoQualityCheck,
} as const satisfies Record<Outcome, CoreMessage>;

export const outcomeDescription = (outcome: Outcome): string => coreMessage(OUTCOME_DESCRIPTION[outcome]);
