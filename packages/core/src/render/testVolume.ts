import type { RenderInput } from "../domain/renderInput.js";
import type { QualityCheckObservations } from "../domain/ledger.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { cellSafe } from "./cellSafe.js";

const runnerCells = ({ qualityCheck, count, runner, ciSteps }: QualityCheckObservations): [string, string] => {
  if (typeof runner === "string") {
    return [
      cellSafe(runner),
      ciSteps ? cellSafe(ciSteps.join(", ")) : CORE_MESSAGES[CoreMessage.NoStepReadRunsIt],
    ];
  }
  if (qualityCheck === "fitness") {
    if (count === 0) return ["", ""];
    return [CORE_MESSAGES[CoreMessage.FitnessRunner], ciSteps ? CORE_MESSAGES[CoreMessage.FitnessCiStep](ciSteps.length) : ""];
  }
  if (runner === undefined) return [CORE_MESSAGES[CoreMessage.RunnerTierUnnamed], ""];
  return [CORE_MESSAGES[CoreMessage.RunnerTierNamesNone], ""];
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
    const [runner, ciSteps] = runnerCells(entry);
    lines.push(`| ${entry.qualityCheck} | ${entry.count} | ${runner} | ${ciSteps} |`);
  }
  lines.push("");
  return lines;
};
