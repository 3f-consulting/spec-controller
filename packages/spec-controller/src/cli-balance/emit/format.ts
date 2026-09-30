export type OutputFormat = "md" | "json";

const SUPPORTED_FORMATS: readonly OutputFormat[] = ["md", "json"];

function isSupportedFormat(fmt: string): fmt is OutputFormat {
  return (SUPPORTED_FORMATS as readonly string[]).includes(fmt);
}

export type OutputDest =
  | { readonly kind: "stdout" }
  | { readonly kind: "file"; readonly path: string };

export interface PlannedOutput {
  readonly fmt: OutputFormat;
  readonly dest: OutputDest;
}

export interface OutputPlan {
  readonly outputs: readonly PlannedOutput[];
}

export type PlanResult =
  | { readonly ok: true; readonly plan: OutputPlan }
  | { readonly ok: false; readonly error: string };

export function planOutput(
  formatSpecs: readonly string[],
  namesStdout: (path: string) => boolean = () => false,
): PlanResult {
  const specs = formatSpecs.length === 0 ? ["md"] : formatSpecs;
  const outputs: PlannedOutput[] = specs.map((spec) => {
    const colon = spec.indexOf(":");
    const fmt = (colon === -1 ? spec : spec.slice(0, colon)) as OutputFormat;
    const dest: OutputDest =
      colon === -1 ? { kind: "stdout" } : { kind: "file", path: spec.slice(colon + 1) };
    return { fmt, dest };
  });

  const unknown = outputs.filter((o) => !isSupportedFormat(o.fmt));
  if (unknown.length > 0) {
    const bad = [...new Set(unknown.map((o) => o.fmt))].join(", ");
    return {
      ok: false,
      error:
        `Unknown --format ${bad}. Supported formats are ${SUPPORTED_FORMATS.join(", ")} ` +
        `(e.g. --format md, --format json:report.json).`,
    };
  }

  const stdoutBound = outputs.filter((o) => o.dest.kind === "stdout" || namesStdout(o.dest.path));
  if (stdoutBound.length > 1) {
    const fmts = stdoutBound.map((o) => o.fmt).join(", ");
    return {
      ok: false,
      error:
        `More than one output routes to stdout (${fmts}); at most one may. ` +
        `Give one of them a :<path> to write it to a file instead ` +
        `(e.g. --format json:report.json).`,
    };
  }

  return { ok: true, plan: { outputs } };
}

export interface FileIdentity {
  readonly dev: bigint;
  readonly ino: bigint;
}

export interface IdentifiedOutput {
  readonly output: PlannedOutput;
  readonly identity: FileIdentity | undefined;
}

export function sharedFileRefusal(outputs: readonly IdentifiedOutput[]): string | undefined {
  const onFiles = outputs.filter((o): o is IdentifiedOutput & { identity: FileIdentity } => o.identity !== undefined);
  for (const [index, first] of onFiles.entries()) {
    const second = onFiles.slice(index + 1).find((o) => sameFile(o.identity, first.identity));
    if (second !== undefined) {
      return (
        `Two outputs name the same file: ${asGiven(first.output)} and ${asGiven(second.output)}. ` +
        `Give each output a file of its own.`
      );
    }
  }
  return undefined;
}

export interface IdentifiedInput {
  readonly subject: string;
  readonly path: string;
  readonly identity: FileIdentity | undefined;
}

export function inputOverwriteRefusal(outputs: readonly IdentifiedOutput[], inputs: readonly IdentifiedInput[]): string | undefined {
  for (const { output, identity } of outputs) {
    if (identity === undefined) continue;
    const read = inputs.find((input) => input.identity !== undefined && sameFile(input.identity, identity));
    if (read !== undefined) {
      return (
        `An output would overwrite a file this run reads: ${asGiven(output)} is ${read.subject}, ${read.path}. ` +
        `Give the report a file of its own.`
      );
    }
  }
  return undefined;
}

function sameFile(a: FileIdentity, b: FileIdentity): boolean {
  return a.dev === b.dev && a.ino === b.ino;
}

function asGiven(output: PlannedOutput): string {
  return output.dest.kind === "stdout" ? `${output.fmt} on standard output` : `${output.fmt}:${output.dest.path}`;
}
