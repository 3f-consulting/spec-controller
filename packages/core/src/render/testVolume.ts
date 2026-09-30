import { RUNTIME_QUALITY_CHECKS } from "../domain/ledger.js";
import type { RenderInput } from "../assemble/renderInput.js";

export const testVolumeSection = (report: RenderInput): string[] => {
  const volume = report.summary.testVolume;
  const raw = report.summary.rawByRuntimeQualityCheck;
  if (!volume || !raw) return [];
  const total = volume.totalEvidenceObservations;
  const lines = [
    "### Test volume",
    "",
    `${total} evidence observations = ${volume.onScenario} on scenarios + ${volume.onPhantomScenario} on phantom scenarios + ${volume.onSuspenseScenario} on the suspense scenario.`,
    "",
    "| Quality-check | Evidence observations |",
    "| --- | --- |",
  ];
  for (const qualityCheck of RUNTIME_QUALITY_CHECKS) {
    lines.push(`| ${qualityCheck} | ${raw[qualityCheck]} |`);
  }
  lines.push("");
  return lines;
};
