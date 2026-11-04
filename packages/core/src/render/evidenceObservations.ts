import type { RenderInput } from "../domain/renderInput.js";
import { runnerSteps, type QualityCheckKindObservations, type RunnerSteps } from "../domain/ledger.js";
import { CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { markdownHeading } from "./heading.js";
import { cellSafe, cellSafeKeepingCodeSpans } from "./cellSafe.js";
import { reportedName } from "./reportedName.js";

const namedRunnerStepsCell = (steps: RunnerSteps): string => {
  switch (steps.kind) {
    case "none":
      return coreMessage(CoreMessage.NoStepCountedAsItsRunnerRunsIt);
    case "some":
      return cellSafeKeepingCodeSpans(steps.ciSteps.map(reportedName).join(", "));
  }
};

const fitnessStepsCell = (steps: RunnerSteps): string => {
  switch (steps.kind) {
    case "none":
      return "";
    case "some":
      return coreMessage(CoreMessage.FitnessCiStep, { steps: steps.ciSteps.length });
  }
};

const runnerCells = (entry: QualityCheckKindObservations): [string, string] => {
  const { qualityCheckKind, count, runner } = entry;
  if (typeof runner === "string") return [cellSafe(runner), namedRunnerStepsCell(runnerSteps(entry))];
  if (qualityCheckKind === "fitness") {
    if (count === 0) return ["", ""];
    return [coreMessage(CoreMessage.FitnessRunner), fitnessStepsCell(runnerSteps(entry))];
  }
  if (runner === undefined) return [coreMessage(CoreMessage.RunnerLayerUnnamed), ""];
  return [coreMessage(CoreMessage.RunnerLayerNamesNone), ""];
};

export const evidenceObservationsSection = (report: RenderInput): string[] => {
  const observations = report.summary.evidenceObservations;
  if (!observations) return [];
  const lines = [
    markdownHeading(3, coreMessage(CoreMessage.EvidenceObservationsHeading)),
    "",
    coreMessage(CoreMessage.EvidenceObservationsSum, {
      total: observations.total,
      onScenario: observations.onScenario,
      onPhantomClaim: observations.onPhantomClaim,
      onUnnamedClaim: observations.onUnnamedClaim,
    }),
    "",
    coreMessage(CoreMessage.EvidenceObservationsTableHeader),
    "| --- | --- | --- | --- |",
  ];
  for (const entry of observations.byQualityCheckKind) {
    const [runner, ciSteps] = runnerCells(entry);
    lines.push(`| ${entry.qualityCheckKind} | ${entry.count} | ${runner} | ${ciSteps} |`);
  }
  lines.push("");
  return lines;
};
