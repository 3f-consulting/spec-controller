/**
 * Unit arm for @SCN-MUT-016 — the fence that tells a sweep which DIED from a sweep which found a
 * fault (features/mutation-score.feature, 3F-2957).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the `[SCN-MUT-016]` ids in the describe / it
 * strings below match the scenario's tag, so a grep of the id returns both halves of the pair.
 * `@unit`-only — Cucumber skips it; this Vitest arm IS the observed evidence.
 *
 * THE THREE TERMS BELOW WERE ALREADY TRUE AND WERE NOWHERE WRITTEN DOWN. @SCN-MUT-015 stopped the
 * borrow filtering on a run's conclusion, which is what had been ACCIDENTALLY fencing the crash
 * surface (3F-2901): a sweep that died is a run whose number is partial, or is a previous run's.
 * What actually fences it now is this repository's own wiring — a runner that cannot fail the run
 * over the score, and a measurement upload that does not run when the sweep before it failed — so
 * the wiring is asserted rather than relied upon.
 *
 * WHAT IS HELD HERE IS THE WIRING, NOT THE CONSEQUENCE. The crashed night reading `missing` is what
 * these terms IMPLY, one inference on, and this arm opens files off disk: it cannot watch a night
 * crash. So the implication stays in the scenario's preamble and the assertions stay at what can be
 * seen — each of them a single tidying edit away from being taken back.
 *
 * READ OFF THE REAL WORKFLOW AND THE REAL RUNNER CONFIG (@SCN-MUT-014's precedent). A planted
 * workflow beside a planted config would show that two files this test wrote agree. What is in
 * doubt is whether THIS repository still holds the fence each night depends on.
 *
 * AND THE CHASE IS FOLLOWED AT EACH HOP. The measurement upload is found by the path the PRODUCER
 * writes, never by a step name; the report upload by the path the sweep's own report is written to;
 * the sweep step and the config it reads by resolving which package.json script the nightly runs
 * and taking the one that reaches the runner. Nothing passes on an absence: a workflow that
 * uploads neither, and a config nothing can read a threshold off, each red as themselves rather
 * than as an empty comparison against an empty one.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, it, expect } from "vitest";
import { parse } from "yaml";

import { SWEEP_RECORD_PATH } from "./measurementArtefact.js";
import { MUTATION_REPORT_PATH } from "./mutationScore.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

/** The workflow that sweeps this repository's domain core. */
const NIGHTLY = ".github/workflows/mutation.yml";

/** The command a sweep of this repository's domain core resolves to. */
const SWEEP = "stryker run";

/** The runner's config where it looks for it, used when the sweep names none of its own. */
const DEFAULT_RUNNER_CONFIG = "stryker.config.json";

/** One of this repository's own files, read whole. */
function bytesOf(file: string): string {
  return readFileSync(path.join(repoRoot, file), "utf8");
}

/** A non-null object — the YAML- and JSON-parse walks narrow through these. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** One step of the nightly, in the shape the claims below ask about. */
interface WorkflowStep {
  readonly run: string | undefined;
  readonly uses: string | undefined;
  /** The step's own `if:`, `undefined` where it states none and GitHub's `success()` holds it. */
  readonly condition: string | undefined;
  readonly with: Record<string, unknown>;
}

/**
 * Every step of the nightly, in the document's own order, refused where there are none.
 *
 * A THIRD YAML WALK IN THIS DIRECTORY, AND THE ONE FIELD THAT MAKES IT ONE. `ciRunCommands` answers
 * which commands CI runs and @SCN-MUT-015's walk answers what a step uploads and in what order;
 * neither carries a step's `if:`, which is the whole of this scenario's first two terms. A walk
 * that reads the condition is a different reader, and it is written where it is read.
 */
function nightlySteps(): WorkflowStep[] {
  const doc: unknown = parse(bytesOf(NIGHTLY));
  const jobs = isRecord(doc) ? doc["jobs"] : undefined;
  const steps = isRecord(jobs)
    ? Object.values(jobs).flatMap((job) =>
        isRecord(job) && Array.isArray(job["steps"]) ? job["steps"] : [],
      )
    : [];
  if (steps.length === 0) throw new Error(`${NIGHTLY} names no steps this can read.`);
  return steps.filter(isRecord).map((step) => ({
    run: typeof step["run"] === "string" ? step["run"] : undefined,
    uses: typeof step["uses"] === "string" ? step["uses"] : undefined,
    condition: typeof step["if"] === "string" ? step["if"] : undefined,
    with: isRecord(step["with"]) ? step["with"] : {},
  }));
}

/** A path as the comparison below reads it — a directory and that directory with a slash are one. */
function asPath(written: unknown): string {
  return typeof written === "string" ? written.trim().replace(/\/+$/, "") : "";
}

/** The only index of the nightly's steps satisfying a claim, refused where there is not one. */
function theOneIndex(
  steps: readonly WorkflowStep[],
  holds: (step: WorkflowStep) => boolean,
  what: string,
): number {
  const found = steps.flatMap((step, at) => (holds(step) ? [at] : []));
  if (found.length !== 1) {
    throw new Error(`${NIGHTLY} holds ${found.length} steps that ${what}; it must hold exactly one.`);
  }
  return found[0]!;
}

/** Does this step upload the file or directory at this path? */
function uploads(step: WorkflowStep, what: string): boolean {
  return (step.uses ?? "").startsWith("actions/upload-artifact") && asPath(step.with["path"]) === what;
}

/**
 * The step of the nightly that uploads what lives at this path, refused where it is not uploaded.
 *
 * IT IS THE ABSENCE THAT MATTERS HERE. A workflow that had stopped uploading either file states no
 * condition on the step it no longer has, so a reader that shrugged at finding nothing would report
 * a fenced measurement over a pipeline that leaves nothing behind for the fence to be about.
 */
function uploadOf(what: string): WorkflowStep {
  const steps = nightlySteps();
  return steps[theOneIndex(steps, (step) => uploads(step, asPath(what)), `upload ${what}`)]!;
}

/** The manifest, as the ledger's own edge reads it. */
const manifest = JSON.parse(bytesOf("package.json")) as { scripts?: Record<string, string> };

/** A script's command with any `pnpm <script>` of this manifest's own expanded into it. */
function commandOf(script: string): string {
  const command = manifest.scripts?.[script];
  if (command === undefined) throw new Error(`package.json names no script "${script}".`);
  const delegate = /^pnpm\s+([\w:-]+)/.exec(command);
  const inner = delegate === null ? undefined : manifest.scripts?.[delegate[1]!];
  return inner === undefined ? command : `${inner} ${command.slice(delegate![0].length)}`;
}

/** Does this step run a package.json script whose own command line reaches the runner? */
function reachesTheSweep(step: WorkflowStep): boolean {
  const invoked = /^\s*pnpm\s+([\w:-]+)\s*$/.exec(step.run ?? "");
  return invoked !== null && commandOf(invoked[1]!).includes(SWEEP);
}

/**
 * The command line the nightly sweeps this repository's domain core with.
 *
 * REFUSED WHERE THE NIGHTLY SWEEPS NOTHING, for the reason the uploads are: a pipeline that no
 * longer runs the runner has no exit code for this scenario to be about, and the thresholds of a
 * config nothing consults would green here forever.
 */
function sweepCommand(): string {
  const steps = nightlySteps();
  const sweep = steps[theOneIndex(steps, reachesTheSweep, `reach \`${SWEEP}\``)]!;
  return commandOf(/^\s*pnpm\s+([\w:-]+)\s*$/.exec(sweep.run ?? "")![1]!);
}

/** The runner config the sweep reads — the one it names, or the one the runner looks for. */
function runnerConfigFile(): string {
  const named = /(?:-c|--config-?[Ff]ile)[= ]\s*'?"?([^\s'"]+)/.exec(sweepCommand());
  return named === null ? DEFAULT_RUNNER_CONFIG : named[1]!;
}

/**
 * The thresholds the runner is given, refused where the config states none this can read.
 *
 * A config that cannot be read reds as itself — `readFileSync` throws naming the file, and a config
 * holding no thresholds block throws naming what could not be found. Neither is allowed to arrive
 * here as an empty object whose missing `break` then reads as a `break` deliberately not set.
 */
function runnerThresholds(): Record<string, unknown> {
  const file = runnerConfigFile();
  const config: unknown = JSON.parse(bytesOf(file));
  const thresholds = isRecord(config) ? config["thresholds"] : undefined;
  if (!isRecord(thresholds)) {
    throw new Error(`${file} states no thresholds block, so what it may fail the run over cannot be read off it.`);
  }
  return thresholds;
}

describe("[SCN-MUT-016] a sweep that died leaves no measurement behind, and its exit code is about itself", () => {
  it("[SCN-MUT-016] runs the measurement upload after the sweep and under no condition of its own, so a sweep that failed takes it down with it", () => {
    // The two halves of "conditioned on the sweep": GitHub holds a step stating no `if:` to
    // `success()`, and a step placed AHEAD of the sweep would have nothing yet to succeed at.
    // Either edit alone leaves a failed run uploading a number about a tree it never finished.
    const steps = nightlySteps();
    const upload = theOneIndex(steps, (step) => uploads(step, SWEEP_RECORD_PATH), `upload ${SWEEP_RECORD_PATH}`);
    expect(steps[upload]!.condition).toBeUndefined();
    expect(theOneIndex(steps, reachesTheSweep, `reach \`${SWEEP}\``)).toBeLessThan(upload);
  });

  it("[SCN-MUT-016] runs the report upload beside it whatever the sweep did, which is the asymmetry", () => {
    // The report of the run that died is precisely what an operator opens, and the NUMBER of that
    // run is precisely what the ledger must never be handed. Two uploads, two conditions, and a
    // tidying edit that made them agree would take one of the two readings away.
    expect(uploadOf(path.dirname(MUTATION_REPORT_PATH)).condition).toBe("always()");
  });

  it("[SCN-MUT-016] gives the runner no score it may fail the run over, so the sweep's exit code is about the sweep", () => {
    // `break` is what would make a low score exit non-zero. Without it the runner can only fail
    // over ITSELF, which is what lets a failed run be read as a harness fault rather than as a
    // regression — the discriminator the borrow no longer gets from a run's conclusion.
    expect(runnerThresholds()["break"] ?? null).toBeNull();
  });
});
