import type { Outcome } from "../domain/outcome.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";

export const OUTCOME_DESCRIPTION: Record<Outcome, string> = {
  satisfied: CORE_MESSAGES[CoreMessage.OutcomeSatisfied],
  missing: CORE_MESSAGES[CoreMessage.OutcomeMissing],
  failing: CORE_MESSAGES[CoreMessage.OutcomeFailing],
  watermelon: CORE_MESSAGES[CoreMessage.OutcomeWatermelon],
  "no-scn-code": CORE_MESSAGES[CoreMessage.OutcomeNoScnCode],
  "duplicate-scn-code": CORE_MESSAGES[CoreMessage.OutcomeDuplicateScnCode],
  "cites-unknown-scenario": CORE_MESSAGES[CoreMessage.OutcomeCitesUnknownScenario],
  "cites-no-scenario": CORE_MESSAGES[CoreMessage.OutcomeCitesNoScenario],
  "no-evidence-obligation": CORE_MESSAGES[CoreMessage.OutcomeNoEvidenceObligation],
  broken: CORE_MESSAGES[CoreMessage.OutcomeBroken],
  "both-missing": CORE_MESSAGES[CoreMessage.OutcomeBothMissing],
};
