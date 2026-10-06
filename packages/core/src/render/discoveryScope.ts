import type { RenderInput } from "../assemble/renderInput.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";

export const discoveryScopeSection = (report: RenderInput): string[] => {
  const scope = report.summary.discoveryScope ?? [];
  if (scope.length === 0) return [];
  return [
    CORE_MESSAGES[CoreMessage.DiscoveryScopeHeading],
    "",
    CORE_MESSAGES[CoreMessage.DiscoveryScopeTableHeader],
    "| --- | --- | --- | --- |",
    ...scope.map(
      ({ source, job, steps, candidates }) =>
        `| ${source ?? "—"} | ${job} | ${steps} | ${candidates} |`
    ),
    "",
  ];
};
