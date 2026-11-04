import type { Outcome } from "../domain/outcome.js";
import { coreMessage } from "./coreText.js";
import { CoreMessage } from "./messages.js";

export const OUTCOME_DESCRIPTION = {
  satisfied: CoreMessage.OutcomeSatisfied,
  missing: CoreMessage.OutcomeMissing,
  failing: CoreMessage.OutcomeFailing,
  watermelon: CoreMessage.OutcomeWatermelon,
  "no-scn-code": CoreMessage.OutcomeNoScnCode,
  "duplicate-scn-code": CoreMessage.OutcomeDuplicateScnCode,
  "cites-unknown-scenario": CoreMessage.OutcomeCitesUnknownScenario,
  "cites-no-scenario": CoreMessage.OutcomeCitesNoScenario,
  "no-evidence-obligation": CoreMessage.OutcomeNoEvidenceObligation,
  broken: CoreMessage.OutcomeBroken,
  "both-missing": CoreMessage.OutcomeBothMissing,
} as const satisfies Record<Outcome, CoreMessage>;

export const outcomeDescription = (outcome: Outcome): string => coreMessage(OUTCOME_DESCRIPTION[outcome]);
