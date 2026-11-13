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
  readonly toolInstalledAsPackage: boolean;
  readonly toolVersion?: string;
  readonly runTime: string;
}
