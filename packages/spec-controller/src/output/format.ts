import { AppError, AppMessage } from "../messages/messages.js";
import { message } from "../messages/appText.js";
import { refusal, type Refusal } from "../runEnding/refusal.js";

export type OutputFormat = "md" | "json";

const SUPPORTED_FORMATS: readonly OutputFormat[] = ["md", "json"];

function isSupportedFormat(fmt: string): fmt is OutputFormat {
  return (SUPPORTED_FORMATS as readonly string[]).includes(fmt);
}

type OutputDest =
  | { readonly kind: "stdout" }
  | { readonly kind: "file"; readonly path: string };

export interface PlannedOutput {
  readonly fmt: OutputFormat;
  readonly dest: OutputDest;
}

interface OutputPlan {
  readonly outputs: readonly PlannedOutput[];
}

export type PlanResult =
  | { readonly ok: true; readonly plan: OutputPlan }
  | { readonly ok: false; readonly error: Refusal };

// An output as the run asked for it: its format not yet known to be one the tool writes.
export interface RequestedOutput {
  readonly fmt: string;
  readonly dest: OutputDest;
}

export function planOutput(
  requested: readonly RequestedOutput[],
  namesStdout: (path: string) => boolean,
): PlanResult {
  const outputs: PlannedOutput[] = requested.map(({ fmt, dest }) => ({ fmt: fmt as OutputFormat, dest }));

  const unknown = outputs.filter((o) => !isSupportedFormat(o.fmt));
  if (unknown.length > 0) {
    const bad = unknown.map((o) => o.fmt).join(", ");
    return {
      ok: false,
      error: refusal(AppError.UnknownFormat, { formats: bad, supported: SUPPORTED_FORMATS.join(", ") }),
    };
  }

  const stdoutBound = outputs.filter((o) => o.dest.kind === "stdout" || namesStdout(o.dest.path));
  if (stdoutBound.length > 1) {
    const fmts = stdoutBound.map((o) => o.fmt).join(", ");
    return {
      ok: false,
      error: refusal(AppError.MoreThanOneToStdout, { formats: fmts }),
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

export function sharedFileRefusal(outputs: readonly IdentifiedOutput[]): Refusal | undefined {
  const onFiles = outputs.filter((o): o is IdentifiedOutput & { identity: FileIdentity } => o.identity !== undefined);
  for (const [index, first] of onFiles.entries()) {
    const second = onFiles.slice(index + 1).find((o) => sameFile(o.identity, first.identity));
    if (second !== undefined) {
      return refusal(AppError.OutputsShareFile, { first: asGiven(first.output), second: asGiven(second.output) });
    }
  }
  return undefined;
}

export interface IdentifiedInput {
  readonly subject: string;
  readonly path: string;
  readonly identity: FileIdentity | undefined;
}

export function inputOverwriteRefusal(outputs: readonly IdentifiedOutput[], inputs: readonly IdentifiedInput[]): Refusal | undefined {
  for (const { output, identity } of outputs) {
    if (identity === undefined) continue;
    const read = inputs.find((input) => input.identity !== undefined && sameFile(input.identity, identity));
    if (read !== undefined) {
      return refusal(AppError.OutputOverwritesInput, { output: asGiven(output), subject: read.subject, path: read.path });
    }
  }
  return undefined;
}

function sameFile(a: FileIdentity, b: FileIdentity): boolean {
  return a.dev === b.dev && a.ino === b.ino;
}

function asGiven(output: PlannedOutput): string {
  return output.dest.kind === "stdout" ? message(AppMessage.FormatOnStandardOutput, { fmt: output.fmt }) : `${output.fmt}:${output.dest.path}`;
}
