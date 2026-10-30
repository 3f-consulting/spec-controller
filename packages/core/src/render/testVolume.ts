import type { RenderInput } from "../domain/renderInput.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";

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
    "| --- | --- |",
  ];
  for (const { qualityCheck, count } of observations.byQualityCheck) {
    lines.push(`| ${qualityCheck} | ${count} |`);
  }
  lines.push("");
  return lines;
};
