// Where a report goes: standard output, or the file a path names.
type OutputDestination = { readonly kind: "stdout" } | { readonly kind: "file"; readonly path: string };

// A report as the run asked for it: its format, not yet known to be one the tool writes, and its destination.
export interface RequestedOutput {
  readonly fmt: string;
  readonly dest: OutputDestination;
}

// A requested report, and whether the file it names is standard output, as the output port found it.
export interface LocatedOutput extends RequestedOutput {
  readonly namesStandardOutput: boolean;
}

export interface PlannedOutput<Format extends string> {
  readonly fmt: Format;
  readonly dest: OutputDestination;
}

// What a file is, whatever path names it: two outputs, or an output and an input, with one identity are one file.
interface FileIdentity {
  readonly dev: bigint;
  readonly ino: bigint;
}

// A planned report with the identity of the file it would write, if that is a regular file, and whether it goes to
// standard error.
export interface IdentifiedOutput<Format extends string> {
  readonly output: PlannedOutput<Format>;
  readonly identity: FileIdentity | undefined;
  readonly toStandardError: boolean;
}

// A file the run reads, named by how the run came to read it, with its identity if it is a regular file.
export interface IdentifiedInput {
  readonly subject: string;
  readonly path: string;
  readonly identity: FileIdentity | undefined;
}

export type OutputRefusal<Format extends string> =
  | { readonly kind: "unknown-format"; readonly formats: readonly string[]; readonly written: readonly Format[] }
  | { readonly kind: "more-than-one-to-standard-output"; readonly formats: readonly Format[] }
  | { readonly kind: "outputs-share-a-file"; readonly first: PlannedOutput<Format>; readonly second: PlannedOutput<Format> }
  | { readonly kind: "output-overwrites-an-input"; readonly output: PlannedOutput<Format>; readonly input: IdentifiedInput };

export type OutputPlan<Format extends string> =
  | { readonly ok: true; readonly outputs: readonly PlannedOutput<Format>[] }
  | { readonly ok: false; readonly refusal: OutputRefusal<Format> };

// The reports to write, given the formats the tool writes: each in a format it writes, and at most one on standard output.
export function outputPlanOf<Format extends string>(requested: readonly LocatedOutput[], written: readonly Format[]): OutputPlan<Format> {
  const unknown = requested.filter(({ fmt }) => !(written as readonly string[]).includes(fmt));
  if (unknown.length > 0) return { ok: false, refusal: { kind: "unknown-format", formats: unknown.map(({ fmt }) => fmt), written } };

  const located = requested as readonly (LocatedOutput & { readonly fmt: Format })[];
  const toStandardOutput = located.filter((o) => o.dest.kind === "stdout" || o.namesStandardOutput);
  if (toStandardOutput.length > 1) {
    return { ok: false, refusal: { kind: "more-than-one-to-standard-output", formats: toStandardOutput.map(({ fmt }) => fmt) } };
  }

  return { ok: true, outputs: located.map(({ fmt, dest }) => ({ fmt, dest })) };
}

// Two planned reports on one file, or a report on a file the run reads, refuse the plan. Two reports on standard error
// follow one another in its stream, so only the first is compared with the files.
export function outputClashOf<Format extends string>(
  outputs: readonly IdentifiedOutput<Format>[],
  inputs: readonly IdentifiedInput[],
): OutputRefusal<Format> | undefined {
  let toStandardErrorSeen = false;
  const compared = outputs.map(({ output, identity, toStandardError }) => {
    const shown = { output, identity: toStandardError && toStandardErrorSeen ? undefined : identity };
    toStandardErrorSeen ||= toStandardError;
    return shown;
  });
  return sharedFileOf(compared) ?? inputOverwrittenOf(compared, inputs);
}

interface ComparedOutput<Format extends string> {
  readonly output: PlannedOutput<Format>;
  readonly identity: FileIdentity | undefined;
}

function sharedFileOf<Format extends string>(outputs: readonly ComparedOutput<Format>[]): OutputRefusal<Format> | undefined {
  const onFiles = outputs.filter((o): o is ComparedOutput<Format> & { identity: FileIdentity } => o.identity !== undefined);
  for (const [index, first] of onFiles.entries()) {
    const second = onFiles.slice(index + 1).find((o) => JSON.stringify(o.output.dest) === JSON.stringify(first.output.dest));
    if (second !== undefined) return { kind: "outputs-share-a-file", first: first.output, second: second.output };
  }
  return undefined;
}

function inputOverwrittenOf<Format extends string>(
  outputs: readonly ComparedOutput<Format>[],
  inputs: readonly IdentifiedInput[],
): OutputRefusal<Format> | undefined {
  for (const { output, identity } of outputs) {
    if (identity === undefined) continue;
    const input = inputs.find((read) => read.identity !== undefined && sameFile(read.identity, identity));
    if (input !== undefined) return { kind: "output-overwrites-an-input", output, input };
  }
  return undefined;
}

function sameFile(a: FileIdentity, b: FileIdentity): boolean {
  return a.dev === b.dev && a.ino === b.ino;
}
