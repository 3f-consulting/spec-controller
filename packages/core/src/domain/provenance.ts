import { provenanceOf, type Provenance, type RunIdentity } from "./evidenceReconciliation.js";
import { relativizeToRoot } from "./targetPath.js";

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
