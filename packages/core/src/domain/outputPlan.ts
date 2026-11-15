// The formats are the request's; the plan only compares where each output goes.
type Destination =
  | { readonly to: "standard-output" }
  | { readonly to: "standard-error" }
  | { readonly to: "file"; readonly path: string };

export interface OutputRequest<Format extends string> {
  readonly format: Format;
  readonly destination: Destination;
}

// The Output port probes each place and reports what it is: a regular file's device and inode, something that is not a
// regular file, one of the run's own standard streams, or nothing there yet, with the path it would be made at through its
// folder's real path, in one case on a volume that folds case.
export type FileIdentity =
  | { readonly is: "regular-file"; readonly device: bigint; readonly inode: bigint }
  | { readonly is: "not-a-regular-file" }
  | { readonly is: "standard-output" | "standard-error" }
  | { readonly is: "absent"; readonly path: string };

export interface IdentifiedOutput<Format extends string> {
  readonly output: OutputRequest<Format>;
  readonly identity: FileIdentity;
}

export interface IdentifiedInput {
  readonly name: string;
  readonly path: string;
  readonly identity: FileIdentity;
}

export type OutputRefusal<Format extends string> =
  | { readonly kind: "more-than-one-to-standard-output"; readonly outputs: readonly OutputRequest<Format>[] }
  | { readonly kind: "outputs-share-a-file"; readonly first: OutputRequest<Format>; readonly second: OutputRequest<Format> }
  | { readonly kind: "output-overwrites-an-input"; readonly output: OutputRequest<Format>; readonly input: IdentifiedInput };

export type OutputPlan<Format extends string> =
  | { readonly ok: true }
  | { readonly ok: false; readonly refusal: OutputRefusal<Format> };

const toStandardOutput = <Format extends string>({ identity }: IdentifiedOutput<Format>): boolean => identity.is === "standard-output";
const toStandardError = <Format extends string>({ output }: IdentifiedOutput<Format>): boolean => output.destination.to === "standard-error";

// A regular file by its device and inode, a file not yet made by its path; anything else is no file.
function fileKeyOf(identity: FileIdentity): string | undefined {
  switch (identity.is) {
    case "regular-file":
      return `${identity.device}:${identity.inode}`;
    case "absent":
      return identity.path;
  }
  return undefined;
}

function sameFile(one: FileIdentity, other: FileIdentity): boolean {
  const key = fileKeyOf(one);
  return key !== undefined && key === fileKeyOf(other);
}

// The first two outputs that land on one file, however each is named.
function sharingAFile<Format extends string>(outputs: readonly IdentifiedOutput<Format>[]): readonly [IdentifiedOutput<Format>, IdentifiedOutput<Format>] | undefined {
  for (const [at, first] of outputs.entries()) {
    const second = outputs.slice(at + 1).find(({ identity }) => sameFile(first.identity, identity));
    if (second !== undefined) return [first, second];
  }
  return undefined;
}

// Which outputs may be written, judged on what each place is, never on how its path is spelled.
export function outputPlanOf<Format extends string>(outputs: readonly IdentifiedOutput<Format>[], inputs: readonly IdentifiedInput[]): OutputPlan<Format> {
  const onStandardOutput = outputs.filter(toStandardOutput);
  if (onStandardOutput.length > 1) return { ok: false, refusal: { kind: "more-than-one-to-standard-output", outputs: onStandardOutput.map(({ output }) => output) } };
  // Reports to standard error follow one another in its stream, so only the first is compared with the files.
  const firstOnStandardError = outputs.find(toStandardError);
  const compared = outputs.filter((output) => !toStandardError(output) || output === firstOnStandardError);
  const shared = sharingAFile(compared);
  if (shared !== undefined) return { ok: false, refusal: { kind: "outputs-share-a-file", first: shared[0].output, second: shared[1].output } };
  for (const { output, identity } of compared) {
    const input = inputs.find((read) => sameFile(identity, read.identity));
    if (input !== undefined) return { ok: false, refusal: { kind: "output-overwrites-an-input", output, input } };
  }
  return { ok: true };
}
