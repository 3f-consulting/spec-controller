/**
 * The output PLAN — the pure app-layer parse+validate of the `--format <fmt>[:<path>]`
 * grammar (the three-layer split). Given the raw
 * `--format` specs (in argv order; empty when no flag was passed), `planOutput` returns
 * either an `OutputPlan` — an ordered list of `{ fmt, dest }` outputs — or a typed error.
 *
 * PURE: no IO. The plan describes WHAT to emit and WHERE; the writer (`writer.ts`) is the
 * only layer that performs the IO. This split lets `planOutput` be proven in isolation
 * (`@unit`, no subprocess) while the writer's real stdout/file effect is the `@integration`
 * arm — the anti-watermelon rule (each integration arm asserts the real IO, never a
 * planOutput re-run).
 *
 * FMT-001 (`@SCN-FMT-001`) establishes the skeleton: no flag — and an explicit `md` —
 * plan a single markdown output bound for stdout. Later sub-issues extend `planOutput`
 * with json (FMT-002), file dests (`<fmt>:<path>`, FMT-002/003), the at-most-one-to-stdout
 * invariant (FMT-005), the legacy-`--json` rejection (FMT-006), and unknown-format
 * rejection (FMT-007) — each landing on the `OutputPlan` type + typed `PlanResult` error
 * surface designed here.
 *
 * Parent: @SCN-FMT-001 — the output-dispatch rework.
 */

/** A supported output format. FMT-001 plans `md`; `json` is wired in FMT-002. */
export type OutputFormat = "md" | "json";

/**
 * The formats `planOutput` accepts; any other `--format` token is rejected (FMT-007 /
 * @SCN-FMT-007). The single source of truth the unknown-format guard checks against AND
 * lists in its hint, so a future format (html, sarif) is added in exactly one place.
 */
const SUPPORTED_FORMATS: readonly OutputFormat[] = ["md", "json"];

/** Runtime narrowing of a parsed `--format` token to a supported `OutputFormat`. */
function isSupportedFormat(fmt: string): fmt is OutputFormat {
  return (SUPPORTED_FORMATS as readonly string[]).includes(fmt);
}

/** Where a planned output is written — stdout, or a caller-given file path. */
export type OutputDest =
  | { readonly kind: "stdout" }
  | { readonly kind: "file"; readonly path: string };

/** One planned output: a format routed to a destination. */
export interface PlannedOutput {
  readonly fmt: OutputFormat;
  readonly dest: OutputDest;
}

/** The plan: the ordered outputs a single invocation will emit. */
export interface OutputPlan {
  readonly outputs: readonly PlannedOutput[];
}

/**
 * The result of planning — either the plan, or a typed error carrying the operator-facing
 * message (later sub-issues raise these for the stdout-collision, legacy-flag, and
 * unknown-format cases). A discriminated union so the CLI branches on `ok`.
 */
export type PlanResult =
  | { readonly ok: true; readonly plan: OutputPlan }
  | { readonly ok: false; readonly error: string };

/**
 * Parse + validate the `--format` specs into an `OutputPlan` (or a typed error).
 *
 * FMT-001: no specs (no `--format` flag) defaults to a single `md`; an explicit `md`
 * plans the same. Each planned output is markdown bound for stdout — the default human
 * report, like vitest/cucumber.
 */
export function planOutput(
  formatSpecs: readonly string[],
  namesStdout: (path: string) => boolean = () => false,
): PlanResult {
  // No --format flag defaults to a single "md" spec — the default human report.
  const specs = formatSpecs.length === 0 ? ["md"] : formatSpecs;
  const outputs: PlannedOutput[] = specs.map((spec) => {
    // Grammar: "<fmt>[:<path>]". Split on the FIRST colon — the fmt is everything before
    // it; a ":<path>" tail routes that format to the file at <path> (FMT-002/003), where
    // the path is everything after the first colon (so a path may itself contain colons).
    // No colon keeps the bare-fmt → stdout default (FMT-001). The at-most-one-to-stdout /
    // unknown-format validation (FMT-005/007) lands on this same parse and the typed
    // PlanResult error surface.
    const colon = spec.indexOf(":");
    const fmt = (colon === -1 ? spec : spec.slice(0, colon)) as OutputFormat;
    const dest: OutputDest =
      colon === -1 ? { kind: "stdout" } : { kind: "file", path: spec.slice(colon + 1) };
    return { fmt, dest };
  });

  // The unknown-format guard (FMT-007 / @SCN-FMT-007): a
  // --format naming an unsupported format (e.g. `xml`, or a typo) is rejected fast on the
  // shared typed PlanResult error surface (the same surface FMT-005/006 use) — rather than
  // silently rendering as markdown (the writer's default render branch) and exiting 0. The
  // error LISTS the supported formats so the operator knows what to use — basic public-CLI
  // robustness. Checked BEFORE the stdout-collision count so an unroutable format is
  // reported as such (an unknown format can't meaningfully collide on stdout).
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

  // The stdout invariant (FMT-005 / @SCN-FMT-005): AT MOST
  // ONE output may route to stdout, so a captured stdout never carries two interleaved
  // documents. This is a COUNT check on the stdout-destined outputs (≤ 1) — NOT a
  // "distinct formats > 1" check — so `--format md --format md` (the same format twice,
  // both stdout) is rejected just as `--format md --format json` is; a distinct-formats
  // check would wrongly pass the former. Rejected with a typed error on the shared
  // PlanResult surface (the same surface FMT-006/007 raise), carrying the hint to give one
  // of the colliding outputs a `:<path>` so it writes to a file instead.
  // A path that names standard output itself (/dev/stdout, /dev/fd/1) routes there as surely as a
  // bare format does, so it is counted with the outputs bound for stdout.
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

/** The operating system's identity for a regular file: its device and inode, exact beyond 2^53. */
export interface FileIdentity {
  readonly dev: bigint;
  readonly ino: bigint;
}

/** A planned output beside the identity of the regular file it lands on, when it lands on one. */
export interface IdentifiedOutput {
  readonly output: PlannedOutput;
  readonly identity: FileIdentity | undefined;
}

/**
 * The refusal for the first two outputs that land on one regular file, or undefined when none do.
 * The file is known by its identity rather than its spelling, so a link, a `..`, a case the volume
 * folds or the file standard output is redirected into all count. An output with no identity is
 * not on a regular file, and writing such a destination twice loses nothing, so it is never compared.
 */
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

function sameFile(a: FileIdentity, b: FileIdentity): boolean {
  return a.dev === b.dev && a.ino === b.ino;
}

function asGiven(output: PlannedOutput): string {
  return output.dest.kind === "stdout" ? `${output.fmt} on standard output` : `${output.fmt}:${output.dest.path}`;
}
