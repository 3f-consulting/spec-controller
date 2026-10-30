import type { RenderInput } from "../domain/renderInput.js";
import type { QualityCheckObservations } from "../domain/ledger.js";
import type { TierWithoutRunner } from "../domain/evidenceReconciliation.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";

const tierNote = (qualityCheck: string, tiersWithoutRunner: readonly TierWithoutRunner[]): string => {
  const without = tiersWithoutRunner.find(({ tier }) => tier === qualityCheck);
  if (without === undefined) return "";
  return CORE_MESSAGES[without.namesNone ? CoreMessage.RunnerTierNamesNone : CoreMessage.RunnerTierUnnamed];
};

const runnerCells = (
  { qualityCheck, count, runner, ciSteps }: QualityCheckObservations,
  tiersWithoutRunner: readonly TierWithoutRunner[]
): [string, string] => {
  if (count === 0) return ["", ""];
  if (qualityCheck === "fitness") {
    return [CORE_MESSAGES[CoreMessage.FitnessRunner], CORE_MESSAGES[CoreMessage.FitnessCiStep]];
  }
  if (runner === undefined) return [tierNote(qualityCheck, tiersWithoutRunner), ""];
  return [runner, (ciSteps ?? []).join(", ")];
};

export const testVolumeSection = (report: RenderInput): string[] => {
  const observations = report.summary.evidenceObservations;
  if (!observations) return [];
  const lines = [
    CORE_MESSAGES[CoreMessage.EvidenceObservationsHeading],
    "",
    CORE_MESSAGES[CoreMessage.EvidenceObservationsSum](
      observations.total,
      observations.onScenario,
      observations.onPhantomClaim,
      observations.onUnnamedClaim
    ),
    "",
    CORE_MESSAGES[CoreMessage.EvidenceObservationsTableHeader],
    "| --- | --- | --- | --- |",
  ];
  for (const entry of observations.byQualityCheck) {
    const [runner, ciSteps] = runnerCells(entry, report.summary.tiersWithoutRunner ?? []);
    lines.push(`| ${entry.qualityCheck} | ${entry.count} | ${runner} | ${ciSteps} |`);
  }
  lines.push("");
  return lines;
};
