import { shownFromTarget } from "./targetPath.js";

// An input the run was given or took by default, its path relative to the target's folder; no path when it was absent.
export interface ProvenanceInput {
  readonly name: string;
  readonly path?: string;
}

// target is unknown-target when nothing names one; sourceSha is unknown outside git.
export interface Provenance {
  readonly target: string;
  readonly sourceSha: string;
  readonly toolSha?: string;
  readonly toolVersion: string;
  readonly runTime: string;
  readonly inputs: readonly ProvenanceInput[];
}

// What the Run identity port reads from git, the install and the clock, as written. Which wins is the domain's.
export interface RunIdentity {
  readonly givenTarget?: string;
  readonly givenSourceSha?: string;
  readonly head?: string;
  readonly origin?: string;
  readonly gitTopLevel?: string;
  readonly toolSha?: string;
  readonly toolVersion?: string;
  readonly runTime: string;
}

// The origin reader's answer: the repository an origin names, or nothing for a form it does not read.
export type RepositoryOfOrigin = (origin: string) => string | undefined;

// A target given wins, then the origin's repository; with neither the target is unknown-target.
export function provenanceOf(identity: RunIdentity, inputs: readonly ProvenanceInput[], targetFolder: string, repositoryOf: RepositoryOfOrigin): Provenance {
  return {
    target: identity.givenTarget ?? (identity.origin === undefined ? undefined : repositoryOf(identity.origin)) ?? "unknown-target",
    sourceSha: identity.givenSourceSha ?? identity.head ?? "unknown",
    ...(identity.toolSha === undefined ? {} : { toolSha: identity.toolSha }),
    toolVersion: identity.toolVersion ?? "unknown",
    runTime: identity.runTime,
    inputs: inputs.map(({ name, path }) => (path === undefined ? { name } : { name, path: shownFromTarget(path, targetFolder) })),
  };
}
