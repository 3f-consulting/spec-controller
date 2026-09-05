/**
 * The timing wrapper — runs a CI step, times the wall-clock, and posts the measurement
 * (@SCN-CIP-009 — features/ci-run-time.feature).
 *
 *     tsx timeStepCli.ts --scn <SCN-ID> --check <tag> [--root <dir>] -- <command> [args…]
 *
 * THE CITATION IS AN ARGUMENT, WHICH IS THE SHAPE OF THIS AXIS RATHER THAN A SHORTCUT. A static
 * check's credit resolves its `@SCN` over two hops from a script handle; a measurement has no
 * handle to resolve, so canon puts the check-to-scenario mapping in the runner that measures
 * (`double-entry-manifesto.md` → Fitness Scenario). Here the runner is a command line, and the
 * measurement it writes arrives already citing.
 *
 * IT IS NOT A CHECK, AND IT TAKES NO SCRIPT NAME OF ITS OWN. `runningStaticChecks` reads a
 * `package.json` script as a running static check when its name carries an observed prefix
 * (`lint:` / `guard:`) and a CI step invokes it, so a `lint:`-spelled wrapper would register a
 * phantom static check on this repository's own ledger. The reasoning `verify` and `ladder`
 * already carry — and the reason the timed scripts wrap THEMSELVES rather than gaining a
 * wrapper script beside them.
 *
 * `--root` MOVES THE WHOLE STEP: the wrapped command runs there and the artefact lands there.
 * One argument rather than two because a wrapper that measured a step in one tree and posted
 * the row into another is a fault with no honest use, and the evidence arm that drives this
 * over a planted tree needs exactly the arrangement the real run uses.
 *
 * IT IS NOT AN ARBITER EITHER: its exit code is the wrapped command's, always (@SCN-CIP-010).
 * The timing verdict is `balance:self`'s alone, so a suite over its ceiling reds in one
 * place and reads from one report. A wrapper that also redded on time would hold both the
 * number and the bar that number is judged against, and would make a green build depend on two
 * arbiters agreeing. The write happens first and unconditionally, because a slow failing suite
 * is still a slow suite and a dropped row reconciles as a step that never ran.
 *
 * IT READS THE ARTEFACT BEFORE IT WRITES ONE (@SCN-CIP-011), because a run has as many timed
 * steps as it has timed suites and they all post into the one file `--measurements` names. What that
 * read is worth — and what an unreadable one is worth — is `measurementArtefact.ts`'s to decide.
 *
 * AND IT READS THE TARGET'S MANIFEST, WHICH IS THE ONLY NUMBER IT IS TOLD (@SCN-CIP-012). The
 * ceiling comes from `specController.thresholds` at `--root`, through the same resolver the
 * reconciler uses; the anchor beneath it is divided back out. Every run prints the measurement
 * against both, names its band, and settles nothing.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  bareTerm,
  resolveThresholds,
  thresholdFor,
} from "@3f-consulting/spec-controller-core/internal";

import { killFloorReaderFor } from "../src/ingest/ingestQualityChecks.js";
import {
  MEASUREMENT_ARTEFACT_PATH,
  exitCodeOf,
  measurementArtefactWith,
  resolveEvidenceRoot,
} from "./measurementArtefact.js";
import { measuredSecondsOf, timingReport } from "./stepTiming.js";

/** Everything the wrapper was told: what it is measuring, where, and what to run. */
interface TimedStep {
  readonly scnId: string;
  readonly checkTag: string;
  /** Where the wrapped command runs and where the target's manifest is read from. */
  readonly root: string;
  /**
   * The root as it was GIVEN — `undefined` where `--root` was absent, never the default above.
   *
   * The two are separate fields because they answer different questions, and collapsing them is
   * the mistake 3F-3099 is about. `root` is where to run and what to read; this is whether a
   * SELF-CONTAINED TARGET was named, which is what decides where this run's output may land.
   * A wrapper comparing `root` against `process.cwd()` could not tell "no root given" from
   * "the root given IS the working tree".
   */
  readonly namedRoot: string | undefined;
  readonly command: readonly string[];
}

/**
 * A fault in how the wrapper was CALLED — exit 2, the code `balance:self` and the ladder
 * emitter already reserve for "this run is broken" as against "the code is wrong".
 */
function usage(problem: string): never {
  console.error(`time step: ${problem}`);
  console.error(
    "time step: usage — --scn <SCN-ID> --check <tag> [--root <dir>] -- <command> [args…]",
  );
  process.exit(2);
}

/** The value a `--flag` was given, or undefined where the flag is absent. */
function flagValue(flags: readonly string[], name: string): string | undefined {
  const at = flags.indexOf(name);
  if (at === -1) return undefined;
  const value = flags[at + 1];
  // A flag swallowing the next flag as its value would run a step citing "--check", which the
  // reader would drop and the ledger would report as a step that never ran.
  if (value === undefined || value.startsWith("--")) usage(`${name} needs a value`);
  return value;
}

/** Read the command line into the step it names. */
function timedStepOf(argv: readonly string[]): TimedStep {
  const separator = argv.indexOf("--");
  if (separator === -1) usage("the command to time goes after a `--` separator");
  const command = argv.slice(separator + 1);
  if (command.length === 0) usage("nothing to run after the `--` separator");

  const flags = argv.slice(0, separator);
  return {
    scnId: flagValue(flags, "--scn") ?? usage("--scn names the scenario this step answers"),
    checkTag: flagValue(flags, "--check") ?? usage("--check names the measured check"),
    root: flagValue(flags, "--root") ?? process.cwd(),
    namedRoot: flagValue(flags, "--root"),
    command,
  };
}

const step = timedStepOf(process.argv.slice(2));

// The clock brackets the child and nothing else. Anything measured outside it — this file's own
// startup, the write below — is the wrapper's time being charged to the suite.
const started = Date.now();
const finished = spawnSync(step.command[0]!, step.command.slice(1), {
  cwd: step.root,
  stdio: "inherit",
});
const measured = measuredSecondsOf(Date.now() - started);

/** What an earlier step of this run left in the artefact, or nothing where it is not there. */
function alreadyPostedIn(artefactPath: string): string | undefined {
  try {
    return readFileSync(artefactPath, "utf8");
  } catch {
    // The first timed step of a job finds no file, which is the ordinary case and not a fault.
    // What is unreadable for any other reason is handled the same way, one layer up: this step's
    // own measurement is worth more than the rows it could not read.
    return undefined;
  }
}

// AGAINST THE EVIDENCE ROOT, NOT AGAINST `step.root` (3F-3099). A named target carries its own
// evidence and resolves to exactly the path it always did; a run that named no target writes to a
// temporary directory rather than into whatever tree it happens to be standing in.
const artefactPath = path.join(resolveEvidenceRoot(step.namedRoot), MEASUREMENT_ARTEFACT_PATH);
// The parent is made rather than assumed: the evidence root is a directory nothing else creates,
// so the first timed step of a job is the thing that creates it.
mkdirSync(path.dirname(artefactPath), { recursive: true });
writeFileSync(
  artefactPath,
  `${JSON.stringify(
    measurementArtefactWith(
      { scnId: step.scnId, checkTag: step.checkTag, measured },
      alreadyPostedIn(artefactPath),
    ),
    null,
    2,
  )}\n`,
  "utf8",
);

/**
 * The ceiling the TARGET's manifest holds this step to, or null where it names none.
 *
 * READ THROUGH THE SAME RESOLVER THE LEDGER READS IT WITH, never a second copy: a wrapper that
 * parsed `specController.thresholds` itself would answer a question the reconciler answers
 * differently, and the report and the verdict would disagree about the same run. It is the
 * target's manifest and not this tool's (@SCN-LNT-005) — a suite's acceptable wall-clock is a
 * property of the repository being measured and the runner class it runs on.
 *
 * A manifest that is absent or unreadable yields no ceiling rather than a fault, which is what
 * `--root` over a planted tree needs and what the resolvers at this edge already do with config
 * they cannot read.
 */
function gateFor(timedStep: TimedStep): number | null {
  let manifest: { specController?: { thresholds?: unknown } };
  try {
    manifest = JSON.parse(readFileSync(path.join(timedStep.root, "package.json"), "utf8")) as {
      specController?: { thresholds?: unknown };
    };
  } catch {
    return null;
  }
  // The NUMBER off the bar, and deliberately not the bar. This wrapper reports a wall-clock against
  // a ceiling and nothing else; the comparison a bar carries is the LEDGER's to reconcile with
  // (@SCN-MUT-001), and a runner that read it here would be a second arbiter of the same verdict.
  const bar = thresholdFor(
    resolveThresholds(manifest, killFloorReaderFor(timedStep.root)),
    // Both terms bare, which is how a manifest's ceilings are stored whichever way they were
    // spelled — read through the one `bareTerm` the registry was built with (@SCN-TRM-001).
    bareTerm(timedStep.scnId),
    bareTerm(timedStep.checkTag)
  );
  return bar?.threshold ?? null;
}

// EVERY RUN, GREEN OR NOT, AND AFTER THE WRITE. The band over the trigger and under the gate
// reds nothing and reconciles satisfied, so this line is the only place a suite crossing its
// engineering anchor is visible at all — and a report printed only on the readings somebody
// thought were interesting would be missing on exactly the run that first crossed it.
console.log(timingReport({ scnId: step.scnId, checkTag: step.checkTag, measured }, gateFor(step)));

process.exit(exitCodeOf(finished));
