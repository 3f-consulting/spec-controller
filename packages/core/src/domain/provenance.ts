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

const UNKNOWN = "unknown";

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
