import type { Layer, Runner } from "./configuration.js";
import { shownFromTarget } from "./targetPath.js";

// An input the run was given or took by default, with no path when it was absent.
export interface ProvenanceInput {
  readonly name: string;
  readonly path?: string;
}

// Each input kind the run could read, once for each path it read for it, in order, or once with no path when it read none.
export function provenanceInputsOf(kinds: readonly { readonly name: string; readonly paths: readonly string[] }[]): ProvenanceInput[] {
  return kinds.flatMap(({ name, paths }) => (paths.length === 0 ? [{ name }] : paths.map((path) => ({ name, path }))));
}

export type ProvenanceRunner = Pick<Runner, "name" | "found">;

// Each layer's runners as the provenance names them: a runner once, however many evidence reports were named for it.
export function provenanceRunnersOf(runners: Readonly<Record<Layer, readonly Runner[]>>): Provenance["runners"] {
  const once = (named: readonly Runner[]): ProvenanceRunner[] =>
    named.filter(({ name }, at) => named.findIndex((runner) => runner.name === name) === at).map(({ name, found }) => (found ? { name, found } : { name }));
  return { unit: once(runners.unit), integration: once(runners.integration), e2e: once(runners.e2e), performance: once(runners.performance) };
}

// target is unknown-target when nothing names one; sourceSha is unknown outside git.
export interface Provenance {
  readonly target: string;
  readonly sourceSha: string;
  readonly toolSha?: string;
  readonly toolVersion: string;
  readonly runTime: string;
  readonly inputs: readonly ProvenanceInput[];
  readonly countedOnlyExecutableClaims: boolean;
  // Each layer's runners, each named once; a layer with none has an empty list.
  readonly runners: Readonly<Record<Layer, readonly ProvenanceRunner[]>>;
}

export type ProvenanceOfInputs = Omit<Provenance, "countedOnlyExecutableClaims" | "runners">;

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
export function provenanceOf(identity: RunIdentity, inputs: readonly ProvenanceInput[], targetFolder: string, repositoryOf: RepositoryOfOrigin): ProvenanceOfInputs {
  return {
    target: identity.givenTarget ?? (identity.origin === undefined ? undefined : repositoryOf(identity.origin)) ?? "unknown-target",
    sourceSha: identity.givenSourceSha ?? identity.head ?? "unknown",
    ...(identity.toolSha === undefined ? {} : { toolSha: identity.toolSha }),
    toolVersion: identity.toolVersion ?? "unknown",
    runTime: identity.runTime,
    inputs: inputs.map(({ name, path }) => (path === undefined ? { name } : { name, path: shownFromTarget(path, targetFolder) })),
  };
}
