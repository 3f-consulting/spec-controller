import type { CiWorkflowStep } from "./checkScriptsRunInCI.js";

const PLUMBING_OWNER = "actions";
const PLUMBING_REPOSITORIES: ReadonlySet<string> = new Set(["checkout", "cache", "upload-artifact", "download-artifact"]);
const PLUMBING_REPOSITORY_PREFIX = "setup-";

export function isGitHubPlumbingStep(step: CiWorkflowStep): boolean {
  if (!("uses" in step)) return false;
  const [owner, repository] = step.uses.split(/[/@]/);
  return owner === PLUMBING_OWNER && isPlumbingRepository(String(repository));
}

function isPlumbingRepository(repository: string): boolean {
  return PLUMBING_REPOSITORIES.has(repository) || repository.startsWith(PLUMBING_REPOSITORY_PREFIX);
}
