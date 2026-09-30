import type { RenderInput } from "../assemble/renderInput.js";

export const discoveryScopeSection = (report: RenderInput): string[] => {
  const scope = report.summary.discoveryScope ?? [];
  if (scope.length === 0) return [];
  return [
    "### Discovery scope",
    "",
    "| Workflow | Job | Steps read | Candidates |",
    "| --- | --- | --- | --- |",
    ...scope.map(
      ({ source, job, steps, candidates }) =>
        `| ${source ?? "—"} | ${job} | ${steps} | ${candidates} |`
    ),
    "",
  ];
};
