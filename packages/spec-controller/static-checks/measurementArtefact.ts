/**
 * The CHECK-AGNOSTIC measurement artefact — what a measurement IS, where a run posts one, and
 * what posting BESIDE an earlier one means (@SCN-CIP-009, @SCN-CIP-011) — together with the
 * WRAPPER half of a measured producer, the exit code a wrapper carries through (@SCN-CIP-010).
 *
 * EXTRACTED OUT OF `stepTiming.ts` (3F-2754), WHICH IS A NAMING FIX AND NOT A DESIGN ONE. That
 * module held two things that are not the same thing: the timing-specific READING — a band, a
 * variance margin, a wall-clock in seconds — and everything here, which never mentions a clock.
 * A mutation score posting into an artefact imported out of a module called `stepTiming` is the
 * misnaming the vocabulary discipline exists to catch, so the half that is about MEASUREMENT
 * rather than about TIME moved out and took its terms with it.
 *
 * ONE MODULE AGAIN, BECAUSE EVERY CONSUMER IS IN THIS DIRECTORY (3F-2861). The artefact spent a
 * while in `src/measurements/`, promoted into product (3F-2763) so a second repository could lift
 * the measurement RESTORE and reach the vocabulary that restore was written in — `static-checks/`
 * is not in the package's published `files`, so a term defined here is unreachable from outside
 * by construction. The restore is retired (3F-2841): moving a file between two CI runs is
 * `upload-artifact` and `gh run download`, neither of which needs a term from this package. What
 * is left posts and reads a measurement inside this repository's own gate, and every caller of it
 * is a wrapper in this directory — a product module with no product consumer, carried into `dist`
 * on every build. So it folded back into the door that had been re-exporting it, and no caller's
 * import specifier changed, which is what made the fold mechanical.
 *
 * NOTHING HERE NAMES A CHECK, AND THAT IS THE WHOLE POINT. `checkTag` is a string this module
 * never reads for meaning; the artefact is keyed by (`@SCN`, check) and carries a number.
 * A wall-clock in seconds and a score as a percentage are the same shape to it, which lets one
 * artefact hold a run's every measured row and one reader read them all.
 *
 * THE CITATION IS HANDED IN, NOT RESOLVED. A static check's run is a script handle, so its
 * `@SCN` is found over two hops — handle to bare tag through the registry, bare tag to
 * scenario through the corpus. A measurement has no handle: canon puts the check-to-scenario
 * mapping in the runner (`double-entry-manifesto.md` → Fitness Scenario), so the producer is
 * TOLD which scenario it is measuring and the measurement arrives already citing.
 *
 * NOTHING HERE IMPORTS THE READER, AND THAT IS THE POINT OF THE TESTS AROUND IT. The artefact's
 * keys are the keys `parseMeasuredEvidenceObservations` reads, and a producer that agreed with
 * that reader by inspection would agree until the day one of them was edited. A mis-keyed row
 * is not loud — the reader drops it and the obligation reconciles `missing`, which is the one
 * reading this axis exists to keep unreachable — so the agreement is pinned by reading the
 * artefact back through the real reader, in both evidence arms.
 *
 * WHAT ELSE IS HERE IS WHAT ONLY A WRAPPER HAS. `exitCodeOf` answers "how did the command I
 * wrapped end", which is a question about running something rather than about measuring anything,
 * and no consumer of the artefact has a wrapped command to ask it about.
 */

import { constants, tmpdir } from "node:os";
import path from "node:path";

import { bareTerm } from "@3f-consulting/spec-controller-core/internal";

/** One row of the artefact — a measured check's number, already naming the row it posts to. */
export interface Measurement {
  /** The `@SCN` of the stepless fitness scenario this measurement answers. */
  readonly scnId: string;
  /** The bare check tag the measurement IS, naming which obligation it settles. */
  readonly checkTag: string;
  /** The number, in the units the bar above it is authored in. */
  readonly measured: number;
}

/** The artefact a run posts its measurements into, in the shape `balance --measurements` reads. */
export interface MeasurementArtefact {
  readonly measurements: readonly Measurement[];
}

/**
 * THE EVIDENCE ROOT this run's output is written under and read back from (3F-3099).
 *
 * THE DEFECT THIS CLOSES, STATED PRECISELY. Every path in this file is a base-relative constant,
 * and every caller used to join it to the TARGET root — which is correct for a planted target, a
 * self-contained tree carrying its own evidence, and wrong for exactly one caller: the one whose
 * root is the working tree. spec-controller wrote its output into its own source, and the three
 * pieces of apparatus around that (a `.gitignore` block, a hygiene check, and the check's own
 * coverage gap) existed only because it did. So the fix is not to make the paths absolute; it is
 * to stop the BASE being derived from the root when no root was named.
 *
 * THREE RUNGS, IN THIS ORDER:
 *
 *   A NAMED TARGET ROOT — `--root` already means "you are pointing me at a self-contained
 *   target": `timeStepCli`'s own docblock has it that the wrapped command runs there and the
 *   artefact lands there. Evidence under a named root was never the fault, and every planted root
 *   in this repository's suite is already a `mkdtemp` outside any source tree. This rung is what
 *   lets every planted arm keep working with no edit, and it is the reason this change costs one
 *   scenario rather than the six an always-on `--evidence` flag would have touched.
 *
 *   `SPEC_CONTROLLER_EVIDENCE_DIR` — the environment's answer for a run that named no target: a
 *   CI job placing every stream on the runner's own disk, where the borrow step and the read step
 *   share one filesystem, and `scripts/verify.sh` doing the same locally.
 *
 *   NEITHER — a temporary directory. `$RUNNER_TEMP` on a runner, `$TMPDIR` locally, and the
 *   platform's own answer where neither is set, which is the ordinary case on Linux.
 *
 * THE FLAG BEATS THE VARIABLE, AND THAT ORDER WAS MEASURED RATHER THAN CHOSEN. The design this
 * implements had the variable winning ALWAYS. It cannot: `ci.yml` sets the variable for its whole
 * job and `scripts/verify.sh` exports it for the whole ladder, so EVERY process the suite spawns
 * inherits it — including the planted-tree arms, which pass `--root <mkdtemp>` and would then read
 * the outer run's evidence instead of their own. Seven cucumber scenarios red on that, and the
 * fix is not to teach seven arms to unset a variable: an argument the caller passed is more
 * specific than the environment it happens to be standing in, which is the ordinary precedence a
 * flag has over a variable everywhere else. No caller needs the other order — nothing that names
 * `--root` is reached through either place that sets the variable.
 *
 * NAMED IS NOT THE SAME AS DEFAULTED, AND THE WHOLE DESIGN TURNS ON THE DIFFERENCE. Callers pass
 * `undefined` here for "no root was named" rather than passing the working directory they default
 * to elsewhere; a resolver comparing against `"."` or `process.cwd()` would have to guess, and it
 * would guess wrong for the target that really is the working tree.
 *
 * AN EMPTY VARIABLE IS AN ABSENT ONE. A workflow `env:` key whose expression resolved to nothing
 * arrives as the empty string, and taken literally it would resolve every stream to a relative
 * path — back inside the working tree, silently, which is the defect this exists to close.
 *
 * THE RESIDUAL, NAMED RATHER THAN ENGINEERED AWAY. `ci.yml` states exactly one job, so the
 * borrow step and the read step share a runner filesystem and `$RUNNER_TEMP` reaches both. Split
 * that workflow in two and nothing reds: the borrow's measurement simply stops reaching the read,
 * and the ledger reports it in the vocabulary of a lapsed nightly sweep. A check on the workflow's
 * SHAPE would be exactly the control surface 3F-3099 argues against adding.
 */
export function resolveEvidenceRoot(
  namedRoot: string | undefined,
  env: NodeJS.ProcessEnv = process.env
): string {
  // `??` IS NOT ENOUGH AT ANY OF THESE RUNGS, AND THE DIFFERENCE IS THE EMPTY STRING. A workflow
  // `env:` key whose expression resolved to nothing arrives as `""`, not as an absent name, and
  // nullish-coalescing hands it straight on: the override would win as the empty path, and an
  // empty `RUNNER_TEMP` would shadow a perfectly good `TMPDIR`. Every rung asks for a value that
  // is actually there.
  const named = (value: string | undefined): string | undefined =>
    value !== undefined && value !== "" ? value : undefined;

  if (namedRoot !== undefined) return namedRoot;
  const overridden = named(env["SPEC_CONTROLLER_EVIDENCE_DIR"]);
  if (overridden !== undefined) return overridden;
  const temp = named(env["RUNNER_TEMP"]) ?? named(env["TMPDIR"]) ?? tmpdir();
  return path.join(temp, "spec-controller-self-balance");
}

/**
 * Where a run posts its measurements, relative to the EVIDENCE ROOT above.
 *
 * RELATIVE TO THE EVIDENCE ROOT AND NOT TO A REPOSITORY ROOT, WHICH IS THE WHOLE OF 3F-3099'S
 * CHANGE HERE. The string is unchanged, so a target named by `--root` carries its evidence exactly
 * where it always did; what moved is the base a run with NO root named resolves against, which is
 * a temporary directory rather than the working tree.
 */
export const MEASUREMENT_ARTEFACT_PATH = "runs/self-balance/measurements.json";

/**
 * Where a sweep that runs on its OWN CADENCE leaves what it measured, relative to a repository
 * root — a SWEEP RECORD, and not this run's credit stream (3F-3152).
 *
 * THE TWO FILES ANSWER TWO DIFFERENT QUESTIONS, WHICH IS WHY THEY ARE TWO FILES. The path above is
 * what THIS run credited: every row in it was produced by a producer of this run, and the ledger
 * reads it as such. A nightly's number is not that — it was measured about a tree by a run that
 * finished hours ago, and a push borrows it. While the borrow landed in the credit stream the two
 * readings were one file, and under a CONVERTED mutation check that becomes a live double count:
 * the fitness pass posts the credit, so a borrowed row sitting beside it would be a second credit
 * for one Evidence Obligation.
 *
 * SO THE BORROWED NUMBER LANDS HERE AND IS READ FROM HERE. The nightly writes this file, uploads
 * it, the push places it back at this path, and the converted check's command prints the row's
 * number — which the fitness pass then posts into the credit stream as the one credit this run
 * produced. Same shape, same reader, different question.
 *
 * Beneath the EVIDENCE ROOT, like the path above and for the same reason — a SECOND subtree under
 * it, because the two files answer two different questions and one base holding both is what keeps
 * them one fact for the borrow, the upload and the reader to chase.
 */
export const SWEEP_RECORD_PATH = "runs/mutation/measurements.json";

/** Whether two rows answer the same thing — the @SCN naming the row and the check tag on it. */
function isTheSameRowAs(row: Measurement, measurement: Measurement): boolean {
  // Both terms, because neither is an address on its own (@SCN-LNT-012) — and each read through
  // the SAME `bareTerm` `parseMeasuredEvidenceObservations` reads it with, so the agreement is true
  // by construction (@SCN-TRM-001). It used to be a second copy of the reading beside a comment
  // asserting the two must agree, and nothing anywhere compared them: a divergence did not red, it
  // posted two credits for one debit, silently, which is precisely the fault the comment named.
  return (
    bareTerm(row.scnId) === bareTerm(measurement.scnId) &&
    bareTerm(row.checkTag) === bareTerm(measurement.checkTag)
  );
}

/** Whether a row read back out of an artefact is one a producer can post beside. */
function isMeasurement(row: unknown): row is Measurement {
  if (typeof row !== "object" || row === null) return false;
  const { scnId, checkTag, measured } = row as Record<string, unknown>;
  return typeof scnId === "string" && typeof checkTag === "string" && typeof measured === "number";
}

/**
 * The well-formed rows in whatever an artefact's `measurements` key held, in artefact order.
 *
 * ROW BY ROW, like every reader at this edge. A damaged row costs itself and nothing else: the
 * obligation it would have settled reconciles `missing`, which is loud on the ledger, where one
 * bad row costing a whole artefact would be loud nowhere.
 */
export function measurementsOf(rows: unknown): Measurement[] {
  return Array.isArray(rows) ? rows.filter(isMeasurement) : [];
}

/**
 * The rows an earlier step of this run left, or none where there is nothing readable to find.
 *
 * ABSENT, EMPTY AND MALFORMED ALL READ AS NO ROWS, which is the stance every reader at this edge
 * takes rather than a shrug. Throwing would cost the step that is running now its own
 * measurement, and a row that never arrives reconciles as a step that never ran (@SCN-CIP-006) —
 * so a damaged artefact would be turned into a false verdict about a suite that plainly ran.
 */
function alreadyPostedIn(source: string | undefined): Measurement[] {
  if (source === undefined) return [];
  let posted: unknown;
  try {
    posted = JSON.parse(source);
  } catch {
    return [];
  }
  return measurementsOf((posted as { measurements?: unknown } | null)?.measurements);
}

/**
 * The artefact a run posts, carrying this measurement beside every other one the run made
 * (@SCN-CIP-011).
 *
 * ONE ARTEFACT, AS MANY CONTRIBUTING PRODUCERS AS THE RUN HAS MEASURED CHECKS, so a producer is
 * told what is already there and posts INTO it. Writing over it would leave only the last row and
 * every earlier bar reconciling missing — the reading this axis exists to keep unreachable.
 *
 * AND THE ROW IS KEYED, NOT APPENDED. A step that runs twice — a re-run, a retried job — owes its
 * bar one measurement, so it replaces its own row and nobody else's. Appending would hand the
 * reconciler two credits for a debit owed once and leave it choosing between them.
 */
export function measurementArtefactWith(
  measurement: Measurement,
  alreadyPosted: string | undefined,
): MeasurementArtefact {
  return measurementArtefactWithAll([measurement], alreadyPosted);
}

/**
 * The keying rule itself, stated over a whole set of rows.
 *
 * SET-SHAPED BECAUSE THE FILTER IS: what survives from the artefact already there is every row no
 * incoming row keys to. Private — it was exported while a restore carried a whole run's rows
 * through it (3F-2763), and that consumer is gone (3F-2841), leaving `measurementArtefactWith` as
 * the one-row door every producer here posts through.
 */
function measurementArtefactWithAll(
  measurements: readonly Measurement[],
  alreadyPosted: string | undefined,
): MeasurementArtefact {
  const others = alreadyPostedIn(alreadyPosted).filter(
    (row) => !measurements.some((measurement) => isTheSameRowAs(row, measurement)),
  );
  return { measurements: [...others, ...measurements] };
}

/** How a wrapped command ended, in the two fields `spawnSync` reports it in. */
export interface FinishedCommand {
  /** The code it exited with, or null where it never exited under its own power. */
  readonly status: number | null;
  /** The signal that killed it, or null where nothing did. */
  readonly signal: NodeJS.Signals | null;
}

/** What a signalled death is worth as an exit code, before the signal's own number. */
const SIGNAL_EXIT_CODE_BASE = 128;

/**
 * The code the wrapper exits with, which is the wrapped command's own (@SCN-CIP-010).
 *
 * NOT THE WRAPPER'S OPINION OF WHAT IT MEASURED. The verdict on a measurement is the ledger's,
 * and a wrapper that also redded on it would be holding both the number and the bar that number
 * is read against. It would also make a green build depend on two arbiters agreeing, where today
 * a step over its bar reds in exactly one place and says so in exactly one report.
 */
export function exitCodeOf(command: FinishedCommand): number {
  if (command.status !== null) return command.status;
  // A command killed by a signal never exited and has no code of its own, so the shell's
  // arithmetic answers for it — 128 + n, the spelling a CI log's reader already knows.
  if (command.signal !== null) return SIGNAL_EXIT_CODE_BASE + constants.signals[command.signal];
  // Neither: it could not be started at all. Whose fault that is belongs to whoever reads the
  // log; the one reading that must be unreachable here is the one that greens the build.
  return 1;
}
