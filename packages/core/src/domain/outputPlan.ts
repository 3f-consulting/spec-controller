// The formats are the request's; the plan only compares where each output goes.
export type Destination =
  | { readonly to: "standard-output" }
  | { readonly to: "standard-error" }
  | { readonly to: "file"; readonly path: string };

export interface OutputRequest<Format extends string> {
  readonly format: Format;
  readonly destination: Destination;
}

// The Output port probes each place and reports what it is: a regular file's device and inode, something that is not a
// regular file, one of the run's own standard streams, or nothing there yet, with the folder it would be made in, when
// that folder exists, and its name.
export type FileIdentity =
  | { readonly is: "regular-file"; readonly device: bigint; readonly inode: bigint }
  | { readonly is: "not-a-regular-file" }
  | { readonly is: "standard-output" | "standard-error" }
  | { readonly is: "absent"; readonly folder?: { readonly device: bigint; readonly inode: bigint }; readonly name: string };

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
  | { readonly ok: true; readonly outputs: readonly OutputRequest<Format>[] }
  | { readonly ok: false; readonly refusal: OutputRefusal<Format> };

const toStandardOutput = <Format extends string>({ output, identity }: IdentifiedOutput<Format>): boolean =>
  output.destination.to === "standard-output" || identity.is === "standard-output";

// One regular file by device and inode, or one file not yet made by its folder and name.
function sameFile(one: FileIdentity, other: FileIdentity): boolean {
  if (one.is === "regular-file" && other.is === "regular-file") return one.device === other.device && one.inode === other.inode;
  if (one.is !== "absent" || other.is !== "absent" || one.folder === undefined || other.folder === undefined) return false;
  return one.folder.device === other.folder.device && one.folder.inode === other.folder.inode && one.name === other.name;
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
  const shared = sharingAFile(outputs);
  if (shared !== undefined) return { ok: false, refusal: { kind: "outputs-share-a-file", first: shared[0].output, second: shared[1].output } };
  for (const { output, identity } of outputs) {
    const input = inputs.find((read) => sameFile(identity, read.identity));
    if (input !== undefined) return { ok: false, refusal: { kind: "output-overwrites-an-input", output, input } };
  }
  return { ok: true, outputs: outputs.map(({ output }) => output) };
}
