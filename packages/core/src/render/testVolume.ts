import { BEHAVIOURAL_QUALITY_CHECKS } from "../domain/ledger.js";
import type { RenderInput } from "../assemble/renderInput.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";

export const testVolumeSection = (report: RenderInput): string[] => {
  const volume = report.summary.testVolume;
  const raw = report.summary.rawByRuntimeQualityCheck;
  if (!volume || !raw) return [];
  const total = volume.totalEvidenceObservations;
  const lines = [
    CORE_MESSAGES[CoreMessage.TestVolumeHeading],
    "",
    CORE_MESSAGES[CoreMessage.TestVolumeSum](total, volume.onScenario, volume.onPhantomScenario, volume.onSuspenseScenario),
    "",
    CORE_MESSAGES[CoreMessage.TestVolumeTableHeader],
    "| --- | --- |",
  ];
  for (const qualityCheck of BEHAVIOURAL_QUALITY_CHECKS) {
    lines.push(`| ${qualityCheck} | ${raw[qualityCheck]} |`);
  }
  lines.push("");
  return lines;
};
