import { provenanceOf, type Provenance, type RunIdentity } from "../domain/evidenceReconciliation.js";
import { relativizeToRoot } from "../lib/portablePath.js";

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
