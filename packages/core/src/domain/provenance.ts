import { relativizeToRoot } from "./targetPath.js";

export interface Provenance {
  readonly target: string;
  readonly sourceSha: string;
  readonly toolSha?: string;
  readonly toolVersion: string;
  readonly inputs: readonly { readonly name: string; readonly path?: string }[];
}

export interface RunIdentity {
  readonly target?: string;
  readonly origin?: string;
  readonly sourceSha?: string;
  readonly toolSha?: string;
  readonly toolVersion: string;
}

// What the run identity port read, as written, beside what the run was given.
export interface RunIdentityAsRead {
  readonly target?: string | undefined;
  readonly origin?: string | undefined;
  readonly givenSourceSha?: string | undefined;
  readonly head?: string | undefined;
  readonly toolFolder: string;
  readonly toolHead?: string | undefined;
  readonly toolVersion: unknown;
}

const UNKNOWN = "unknown";

const INSTALLED_PACKAGES = "node_modules";

// A source SHA the run was given wins over the commit the target has checked out. A tool installed as a package has no
// commit of its own, whatever checkout its folder sits in.
export function runIdentityOf(read: RunIdentityAsRead): RunIdentity {
  const installed = read.toolFolder.split("/").includes(INSTALLED_PACKAGES);
  return {
    target: read.target,
    origin: read.origin,
    sourceSha: read.givenSourceSha ?? read.head,
    toolSha: installed ? undefined : read.toolHead,
    toolVersion: toolVersionOf(read.toolVersion),
  };
}

// A version that is no string, or an empty one, is unknown.
export function toolVersionOf(version: unknown): string {
  return typeof version === "string" && version !== "" ? version : UNKNOWN;
}

const UNKNOWN_TARGET = "unknown-target";

export function provenanceOf(identity: RunIdentity, inputs: Provenance["inputs"]): Provenance {
  return {
    target: identity.target ?? identity.origin ?? UNKNOWN_TARGET,
    sourceSha: identity.sourceSha ?? UNKNOWN,
    ...(identity.toolSha === undefined ? {} : { toolSha: identity.toolSha }),
    toolVersion: identity.toolVersion,
    inputs,
  };
}

export interface RunInput {
  readonly name: string;
  readonly path?: string;
}

export function provenanceFrom(identity: RunIdentity, inputs: readonly RunInput[], root: string): Provenance {
  return provenanceOf(
    identity,
    inputs.map(({ name, path }) => (path === undefined ? { name } : { name, path: relativizeToRoot(path, root) })),
  );
}
