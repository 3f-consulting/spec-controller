import type {
  Scenario,
  EvidenceObservation,
  RuntimeEvidenceObservation,
  FitnessEvidenceObservation,
} from "./journal.js";
import { isFitnessObservation } from "./journal.js";

export type Posting =
  | { kind: "scenario"; scnId: string }
  | { kind: "phantom-scenario"; scnId: string }
  | { kind: "suspense-scenario"; posted: "broken" | "cites-nothing" | "no-evidence-obligation-static-check" };

export type RuntimePosting =
  | { kind: "scenario"; scnId: string }
  | { kind: "phantom-scenario"; scnId: string }
  | { kind: "suspense-scenario"; posted: "broken" | "cites-nothing" };

export type StaticCheckPosting =
  | { kind: "scenario"; scnId: string }
  | { kind: "phantom-scenario"; scnId: string }
  | { kind: "suspense-scenario"; posted: "broken" | "no-evidence-obligation-static-check" };

export function postingOf(
  observation: RuntimeEvidenceObservation,
  scenarioIds: ReadonlySet<string>
): RuntimePosting;
export function postingOf(
  observation: FitnessEvidenceObservation,
  scenarioIds: ReadonlySet<string>
): StaticCheckPosting;
export function postingOf(
  observation: EvidenceObservation,
  scenarioIds: ReadonlySet<string>
): Posting;
export function postingOf(
  observation: EvidenceObservation,
  scenarioIds: ReadonlySet<string>
): Posting {
  if (observation.qualityCheck === "fitness") {
    if (isFitnessObservation(observation) && observation.broken === true) {
      return { kind: "suspense-scenario", posted: "broken" };
    }
    if (observation.scnId !== undefined) {
      return scenarioIds.has(observation.scnId)
        ? { kind: "scenario", scnId: observation.scnId }
        : { kind: "phantom-scenario", scnId: observation.scnId };
    }
    return { kind: "suspense-scenario", posted: "no-evidence-obligation-static-check" };
  }
  if (observation.broken === true) return { kind: "suspense-scenario", posted: "broken" };
  if (observation.scnId === null) return { kind: "suspense-scenario", posted: "cites-nothing" };
  if (!scenarioIds.has(observation.scnId)) {
    return { kind: "phantom-scenario", scnId: observation.scnId };
  }
  return { kind: "scenario", scnId: observation.scnId };
}
