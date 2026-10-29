import type { RenderInput } from "../domain/renderInput.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";

export const discoveryScopeSection = (report: RenderInput): string[] => {
  const rows = report.summary.stepAccounting?.byJob ?? [];
  if (rows.length === 0) return [];
  return [
    CORE_MESSAGES[CoreMessage.DiscoveryScopeHeading],
    "",
    CORE_MESSAGES[CoreMessage.DiscoveryScopeTableHeader],
    "| --- | --- | --- | --- |",
    ...rows.map(
      ({ workflow, job, stepsRead, candidates }) =>
        `| ${workflow} | ${job} | ${stepsRead} | ${candidates} |`
    ),
    "",
  ];
};
