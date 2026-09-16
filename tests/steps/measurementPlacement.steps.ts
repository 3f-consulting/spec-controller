/**
 * @integration for the arms of features/measurement-placement.feature that RUN a placement.
 *
 * THIS ARM RUNS A PLACEMENT RATHER THAN READING ONE, which is the whole reason it exists. Every
 * other arm over a placement step in this repository reads its TEXT — which run it selects, which
 * branch term it was given, the ORDER of the lines inside it. Not one of them can tell a window
 * that FIRES from a window whose arithmetic is broken on the runner it runs on, and until this file
 * nothing in this repository could: the Rule in features/mutation-score.feature that describes this
 * arm carried no scenario at all.
 *
 * THOSE ARMS ARE NAMED BY WHAT THEY DO AND NOT BY AN `@SCN`, DELIBERATELY (3F-3200). This sentence
 * cited three codes; two of them had never existed and the third was attached to a claim it does
 * not make. A docblock is prose, nothing checks prose, and that is the design rather than a gap —
 * so a code written here is an unverified reference that rots in silence. Prose cites the ticket,
 * which is permanent.
 *
 * SO THE STEP IS LIFTED OUT OF THE WORKFLOW EVERY PUSH RUNS AND EXECUTED. Its `run:` script is
 * taken verbatim from `.github/workflows/ci.yml` and handed to `bash -e`, which is how GitHub
 * invokes a bare `run:` — so the `set +e` the placement opens with is doing here exactly what it
 * does there. Its own `env:` block supplies its terms. What is answered is the boundary to GitHub
 * and nothing else: the runner variables a job is given, and a `gh` that reports one run.
 *
 * THE GNU TOOLS ARE RESOLVED, AND THE ARM REDS WHERE IT FINDS NONE. `date -u -d "<iso>"` and
 * `stat -c %Y` are GNU spellings; a BSD implementation refuses both and the placement takes its
 * "not a moment this runner can read" path — placing nothing, for a reason that has nothing to do
 * with the window. Measured at 3F-3156: under a BSD `date` a run one hour old and a run forty
 * hours old both placed nothing. An arm that skipped itself on such a runner would be a credit
 * saying a check ran when it did not, so it fails instead, naming what it could not find.
 *
 * AND "NOTHING WAS PLACED" IS NEVER READ ON ITS OWN. A step that did nothing at all places nothing
 * too, and so does a fetch that failed for its own reasons — either would satisfy an assertion
 * phrased on the row's absence while the window was deleted. What is read is the refusal the
 * SHARED RULE prints: the age it computed, the window it compared that age against, and the
 * subject it was asked about. For the sweep the fetch is watched as well, because a run past the
 * window must never be downloaded at all.
 *
 * THE ROOT IS PLANTED AND IT IS THE EVIDENCE ROOT, never this run's own. `--root` is what
 * `resolveEvidenceRoot` takes as already-resolved (3F-3099), and the evidence root persists
 * between local runs — an arm reading the outer run's would find the previous run's records
 * sitting there and measure those.
 *
 * AND THE TWO SCENARIOS HERE PLANT ONE ARTEFACT BETWEEN THEM, WHICH IS WHY THERE IS ONE PLANT AND
 * NOT TWO. They are the two ends of one boundary — past the window nothing is placed and the row
 * reads `missing`; inside it the measurement is placed and the row reads `satisfied` — so the
 * same staged record, the same reported run and the same downloadable payload cross that boundary,
 * differing in their TIMESTAMP and in nothing else at all. Two plants would be two experiments,
 * each agreeing with itself about a boundary neither of them had crossed.
 *
 * SO THE SWEEP'S PAYLOAD IS FETCHABLE ON BOTH SIDES, INCLUDING THE SIDE THAT MUST NOT FETCH IT.
 * @SCN-PLC-001's claim is that the window stopped a download that would otherwise have succeeded,
 * and only a payload that was there to download can carry it: staging none would let a fetch that
 * failed for its own reasons pass for a fetch the window refused.
 */

import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  carriesBar,
  fitnessChecksOf,
  type ThresholdBar,
} from "@3f-consulting/spec-controller-core/internal";
import { parse } from "yaml";

import { MEASUREMENT_ARTEFACT_PATH, RECORDED_SWEEP_PATH } from "../checks/measurementArtefact.js";

const repoRoot = process.cwd();
const tsxBin = path.join(repoRoot, "node_modules", ".bin", "tsx");

/** The workflow every push runs, and the one that places every measurement this file is about. */
const LADDER = path.join(".github", "workflows", "ci.yml");

/**
 * How far in the past a LAPSED plant is dated — @SCN-PLC-001's end of the boundary.
 *
 * STATED INDEPENDENTLY OF THE WINDOW IT MUST FALL OUTSIDE, which is what makes it an assertion
 * rather than a restatement. The window is 26 hours and lives in exactly one place; this is 27,
 * chosen here. Widen the window past this and the measurement lands INSIDE it, the row is placed,
 * and the "reads missing" assertion below fails loudly — which is the failure a plant wants.
 */
const LAPSED_AGE_SECONDS = 27 * 60 * 60;

/**
 * How far in the past a FRESH plant is dated — @SCN-PLC-002's end of the same boundary.
 *
 * STATED INDEPENDENTLY OF THE WINDOW FOR THE SAME REASON, and from the same side of it: one hour,
 * chosen here, against a window of 26 that this file never restates. Narrow the shared window
 * below this — the plant this scenario's teeth come from sets it to `0` — and every row lands
 * OUTSIDE it, nothing is placed, and all three Examples rows red.
 *
 * AND IT IS NOT ZERO, WHICH WOULD BE A WEAKER PLANT. A measurement dated this instant would be
 * inside any window at all, including a window whose arithmetic answers zero for everything; an
 * hour is a number the comparison has to get right.
 */
const FRESH_AGE_SECONDS = 60 * 60;

/**
 * The run the stubbed `gh` reports, and the number the refusal must name it by.
 *
 * A literal, so that a refusal naming some other subject — a row this scenario is not about, or
 * the empty string an unset term expands to — cannot pass for this one.
 */
const PLANTED_RUN_ID = "4242";

/**
 * A number the row's own bar is satisfied by, read off the bar the row's manifest entry authors.
 *
 * NEVER A LITERAL, BECAUSE `satisfied` IS A STATEMENT ABOUT A NUMBER AND A BAR. The three rows
 * placed here state three different ones — 75s, 150s, 95% — so a number typed beside this arm
 * would be a second copy of a bar that lives in `package.json`, kept in step by whoever remembers;
 * the day one of them moved past its copy, this arm would plant a number its row reads `failing`
 * over and the scenario's own name would be the false part.
 *
 * READ THROUGH THE MANIFEST'S OWN ROW READER (`fitnessChecksOf`), never by reaching into the JSON.
 * A second reading of what a row's bar IS would be free to disagree with the reading the ledger
 * makes, and the disagreement would show up as a row that quietly read `missing`.
 *
 * ONE EITHER SIDE, AND DELIBERATELY NOT THE BAR ITSELF. A ceiling is satisfied AT its value and so
 * is a floor (@SCN-MUT-004); planting the boundary value would make this arm an assertion about
 * THAT rule instead of about the window.
 */
function insideTheBarOf(row: string): number {
  const bar = theBarOf(row);
  const planted = bar.atLeast === true ? bar.threshold + 1 : bar.threshold - 1;
  // A NUMBER NO ARTEFACT CAN CARRY WOULD BE A SILENT PLANT. `parseMeasuredEvidenceObservations`
  // drops a negative row, so a bar of zero would leave the credit stream empty and the row reading
  // `missing` — which is the sibling scenario's answer, reached here by accident.
  assert.ok(
    planted >= 0,
    `${row}'s bar of ${bar.threshold} leaves no number inside it this arm could plant`,
  );
  return planted;
}

/**
 * The bar this row's manifest entry authors, read through the manifest's own row reader.
 *
 * `fitnessChecksOf` AND NOT A HAND-WALK OF THE JSON, because this is the same reading the ledger
 * makes when it decides whether a number settles the row. A second reader over `atLeast` /
 * `atMost` would be a second opinion about what the target wrote, and the first entry the two read
 * differently would be a silent one.
 */
function theBarOf(row: string): ThresholdBar {
  const manifest = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8")) as {
    specController?: { fitnessChecks?: unknown };
  };
  const check = fitnessChecksOf(manifest.specController?.fitnessChecks).get(row);
  if (check === undefined || !carriesBar(check)) {
    assert.fail(`package.json holds no measured row for ${row}, so this arm has no bar to plant inside`);
  }
  return check.bar ?? assert.fail(`${row}'s manifest row authors a bar nothing can read`);
}

/** Everything a row of this scenario needs: which step places it, and how it is read back. */
interface PlaceableRow {
  /** The row the Examples table names, and the one the reader is asked for. */
  readonly row: string;
  /**
   * The bare check tag this row's measurement IS, which is the other half of its key.
   *
   * STATED ONCE AND PASSED TO THE READER FROM HERE, rather than spelled again in the command line
   * below: a record keyed on one tag and read back under another reconciles `missing`, and two
   * spellings of one term in one object is exactly where that would start.
   */
  readonly checkTag: string;
  /** The step of `ci.yml` that places this row, by the name the workflow gives it. */
  readonly step: string;
  /**
   * What the placement's own sentence must name its subject by — the run for the sweep, the row
   * for a timing. Both sentences name it: the refusal past the window and the placement inside it.
   */
  readonly namedAs: string;
  /** Where the placement would put the record, relative to the evidence root. */
  readonly placedAt: string;
  /** The command the row's own check runs, and whatever it states beyond the two terms above. */
  readonly readerCommand: string;
  readonly readerExtras: readonly string[];
}

const SWEEP: PlaceableRow = {
  row: "SCN-FIT-002",
  checkTag: "mutation",
  step: "Place the scheduled sweep's measurement",
  namedAs: PLANTED_RUN_ID,
  placedAt: "mutation-measurements.json",
  readerCommand: path.join(repoRoot, "tests", "checks", "mutationScoreReaderCli.ts"),
  readerExtras: ["--supersedes", "SCN-MUT-011"],
};

/** A timed suite's row — the two differ in their `@SCN` and in nothing else at all. */
function timedRow(row: string): PlaceableRow {
  return {
    row,
    checkTag: "ci-run-time",
    step: "Place the suites' timings",
    namedAs: row,
    placedAt: `timings-${row}-measurements.json`,
    readerCommand: path.join(repoRoot, "tests", "checks", "timingReaderCli.ts"),
    readerExtras: [],
  };
}

/**
 * The measurement each Examples row names, read as the row it belongs to.
 *
 * The prose is the scenario's and the mapping is the step definition's, which is where a mechanic
 * belongs: the Examples table says what a reader would call the thing, and this says which step of
 * the pipeline carries it and which command answers for it.
 */
const PLACEABLE: Readonly<Record<string, PlaceableRow>> = {
  "the nightly sweep's record": SWEEP,
  "the unit suite's timing": timedRow("SCN-FIT-012"),
  "the behavioural suite's timing": timedRow("SCN-FIT-013"),
};

const sandboxes: string[] = [];

let subject: PlaceableRow;
/** Everything this scenario plants, of which the evidence root is one directory. */
let sandbox: string;
/** The evidence root the lifted step is handed — what a placed measurement would land in. */
let plantedRoot: string;
let shimDir: string;
let ghCallLog: string;
/** What the stubbed `gh` answers `run list` with, carried from the plant to the run. */
let plantedRunList: string;
/**
 * The payload the stubbed `gh` would hand over, which exists on BOTH sides of the boundary.
 *
 * A run past the window must never be downloaded, and that claim is only worth something where
 * there was something to download: a plant staging no payload would let a fetch that failed for
 * its own reasons pass for a fetch the window refused.
 */
let plantedPayload: string;
/** The number the planted measurement carries — this row's own bar, cleared by one. */
let plantedNumber: number;
/** How old the plant is, in the seconds the placement's own sentence must report back. */
let plantedAge: number;
let placementEndedWith: number | null;
let placementSaid: string;
/** What the placement PRINTED, which is where a placement that happened says so. */
let placementPrinted: string;
/**
 * What the evidence root holds that this placement was never asked about, by path and by content.
 *
 * THE REJECTED SHAPE, MADE STRUCTURAL RATHER THAN PROMISED. Clearing the evidence root before the
 * producers run was ruled out (3F-3200); what is required instead is a placement removing the one
 * record it answers for. A step that wiped the root would satisfy every assertion about its OWN
 * row's copy being gone, so the difference between the two rules is read here and nowhere else.
 */
let bystanders: Readonly<Record<string, string>>;

After(function () {
  for (const at of sandboxes.splice(0)) rmSync(at, { recursive: true, force: true });
});

/**
 * A GNU implementation of one tool, by absolute path, or a failure naming what was missing.
 *
 * TWO CANDIDATES AND A PROBE, never a platform test. Whether `date` on this machine understands
 * `-d` is a question with an answer, and asking the question is both shorter and more honest than
 * deciding it from `process.platform` — a GNU coreutils on a mac answers yes under the name
 * `gdate`, and a stripped Linux image can answer no.
 */
function gnuTool(tool: string, probe: readonly string[], expected: (out: string) => boolean): string {
  for (const candidate of [tool, `g${tool}`]) {
    const ran = spawnSync(candidate, probe, { encoding: "utf8" });
    if (ran.status === 0 && expected((ran.stdout ?? "").trim())) {
      const found = spawnSync("/bin/sh", ["-c", `command -v ${candidate}`], { encoding: "utf8" });
      if (found.status === 0) return (found.stdout ?? "").trim();
    }
  }
  return assert.fail(
    `this arm runs a placement, and the placement's arithmetic is GNU's: no \`${tool}\` on this ` +
      `machine answered \`${tool} ${probe.join(" ")}\`, under that name or as \`g${tool}\`. ` +
      "Install GNU coreutils; skipping would be a credit for a check that did not run.",
  );
}

/** A script on the shimmed PATH, executable, that the lifted step will find under `name`. */
function shim(name: string, script: string): void {
  const at = path.join(shimDir, name);
  writeFileSync(at, script, "utf8");
  chmodSync(at, 0o755);
}

/**
 * The `run:` script and the `env:` block of ONE named step of the workflow.
 *
 * NAMED, AND EXACTLY ONE, because the claim is about a particular step: this file reads two of
 * them and `ci.yml` holds a third placement besides. A step that is not there fails HERE, which is
 * the red this scenario is written to produce for a row whose placement does not exist yet.
 */
function theStep(named: string): { readonly run: string; readonly env: Record<string, string> } {
  const workflow = parse(readFileSync(path.join(repoRoot, LADDER), "utf8")) as {
    jobs?: Record<string, { steps?: readonly { name?: string; run?: string; env?: Record<string, unknown> }[] }>;
  };
  const steps = workflow.jobs?.["ci"]?.steps ?? [];
  const found = steps.filter((step) => step.name === named);
  if (found.length !== 1) {
    assert.fail(`${LADDER} holds ${found.length} steps named "${named}"; it must hold exactly one.`);
  }
  const step = found[0]!;
  if (typeof step.run !== "string" || step.run.trim() === "") {
    assert.fail(`the "${named}" step of ${LADDER} runs nothing at all.`);
  }
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(step.env ?? {})) {
    // THE BOUNDARY TO GITHUB, ANSWERED, AND NOTHING ELSE REPLACED. A `${{ }}` expression is
    // resolved by GitHub before bash sees it; here it is the one term this arm has to stand in
    // for. Every other key crosses exactly as the workflow wrote it.
    env[key] = String(value).includes("${{") ? "answered-by-the-arm" : String(value);
  }
  return { run: step.run, env };
}

/**
 * Plant one measurement, dated `ageSeconds` ago — the whole of what either end of this boundary
 * arranges, and the reason there is ONE of these rather than one per scenario.
 *
 * THE TWO SCENARIOS DIFFER IN THIS ARGUMENT AND IN NOTHING ELSE. The same staged record, the same
 * reported run, the same downloadable payload and the same number cross the window in both
 * directions; what moves them across it is their timestamp. Two plants, one per scenario, would
 * each be internally consistent and would jointly say nothing about a boundary — the difference
 * between "past the window nothing is placed" and "inside it the measurement is placed" would rest
 * on whatever else the two plants had come to differ in.
 */
function plantMeasurement(measurement: string, ageSeconds: number): void {
  subject = PLACEABLE[measurement] ?? assert.fail(`no row of this scenario names "${measurement}"`);

  sandbox = mkdtempSync(path.join(tmpdir(), "measurement-placement-"));
  sandboxes.push(sandbox);
  // THE EVIDENCE ROOT IS A DIRECTORY OF ITS OWN INSIDE THE SANDBOX, so that the shims, the log
  // and the lifted script are not sitting in the directory whose contents are the assertion.
  plantedRoot = path.join(sandbox, "evidence");
  shimDir = path.join(sandbox, "shims");
  mkdirSync(shimDir, { recursive: true });
  ghCallLog = path.join(sandbox, "gh-calls.log");

  plantedAge = ageSeconds;
  plantedNumber = insideTheBarOf(subject.row);
  const takenAt = new Date(Date.now() - ageSeconds * 1000);
  const record = `${JSON.stringify(
    {
      measurements: [
        { scnId: subject.row, checkTag: subject.checkTag, measured: plantedNumber },
      ],
    },
    null,
    2,
  )}\n`;

  if (subject === SWEEP) {
    // THE SWEEP'S MEASUREMENT IS DATED BY THE RUN THAT TOOK IT, so what `gh` reports is the whole
    // of the plant's clock. The payload sits OUTSIDE the evidence root, where only a download can
    // carry it in: written into the root it would be indistinguishable from a placement.
    plantedPayload = path.join(sandbox, "artefact", "mutation-measurements.json");
    mkdirSync(path.dirname(plantedPayload), { recursive: true });
    writeFileSync(plantedPayload, record, "utf8");
    shim(
      "gh",
      "#!/bin/sh\n" +
        'printf "%s\\n" "$*" >> "$GH_CALL_LOG"\n' +
        'if [ "$1" = "run" ] && [ "$2" = "list" ]; then printf "%s" "$GH_RUN_LIST"; exit 0; fi\n' +
        // THE ARTEFACT IS HANDED OVER FLATTENED INTO `--dir`, which is what `gh` does with an
        // artefact holding one file — and what the `find` in the lifted step reads back.
        'if [ "$1" = "run" ] && [ "$2" = "download" ]; then\n' +
        '  dir=""\n' +
        '  while [ "$#" -gt 0 ]; do\n' +
        '    if [ "$1" = "--dir" ]; then dir="$2"; fi\n' +
        "    shift\n" +
        "  done\n" +
        '  if [ -z "$dir" ]; then echo "gh: run download was asked for no --dir" >&2; exit 1; fi\n' +
        '  mkdir -p "$dir" || exit 1\n' +
        '  cp "$GH_PAYLOAD" "$dir/mutation-measurements.json" || exit 1\n' +
        "  exit 0\n" +
        "fi\n" +
        'echo "gh: the arm stubs two calls and was asked for \\"$*\\"" >&2\n' +
        "exit 1\n",
    );
  } else {
    // A TIMING'S MEASUREMENT IS DATED BY THE FILE THE WRAPPER LEFT, so the plant is that file's
    // modification time. Only the row under test is staged: the other timed row's staged record
    // is absent, which is the ordinary case of a suite that did not run and must not red either.
    plantedPayload = path.join(plantedRoot, "staged", `timings-${subject.row}-measurements.json`);
    mkdirSync(path.dirname(plantedPayload), { recursive: true });
    writeFileSync(plantedPayload, record, "utf8");
    utimesSync(plantedPayload, takenAt, takenAt);
  }

  shim("date", `#!/bin/sh\nexec ${gnuTool("date", ["-u", "-d", "@0", "+%s"], (out) => out === "0")} "$@"\n`);
  shim(
    "stat",
    `#!/bin/sh\nexec ${gnuTool("stat", ["-c", "%Y", repoRoot], (out) => /^\d+$/.test(out))} "$@"\n`,
  );

  // The one term the stubbed `gh` answers with, dated by the same clock as the staged file above.
  plantedRunList = JSON.stringify([
    { databaseId: Number(PLANTED_RUN_ID), createdAt: takenAt.toISOString() },
  ]);
}

/** The row's own command, as the manifest names it and as its CI step runs it, over one root. */
function theRowsCommand(over: string): string[] {
  return [
    subject.readerCommand,
    "--scn",
    subject.row,
    "--check",
    subject.checkTag,
    ...subject.readerExtras,
    "--root",
    over,
  ];
}

// @SCN-PLC-001
Given("{string}, taken longer ago than the freshness window allows", function (measurement: string) {
  plantMeasurement(measurement, LAPSED_AGE_SECONDS);
});

// @SCN-PLC-002
Given("{string}, taken inside the freshness window", function (measurement: string) {
  plantMeasurement(measurement, FRESH_AGE_SECONDS);
});

/**
 * Run the lifted placement step once, over whatever is planted at this moment.
 *
 * LIFTED ONCE AND RUNNABLE MORE THAN ONCE, WHICH IS WHAT ONE OF THESE SCENARIOS IS ABOUT. Two of
 * the arms here run a placement over a root they made a moment earlier, and on such a root a
 * refusal that removes and a refusal that does nothing leave the same empty directory. The third
 * runs this twice over ONE root, so what the second run finds there is the first run's leavings —
 * which is the condition a consumer's pipeline has and `$RUNNER_TEMP` does not (3F-3431).
 */
function runTheLiftedPlacement(): void {
  const step = theStep(subject.step);

  // WRITTEN TO A FILE AND RUN AS `bash -e <file>`, which is how GitHub invokes a bare `run:`. The
  // placement's first act is to clear errexit; run any other way, that line would be answering a
  // shell this arm had set up rather than the one the pipeline hands it.
  const script = path.join(sandbox, "lifted-step.sh");
  writeFileSync(script, step.run, "utf8");

  const finished = spawnSync("bash", ["-e", script], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      // The shims first, so the lifted step reaches the GNU tools and the stubbed `gh` by the
      // names it spells. Everything else it needs — `jq`, `find`, `cp` — comes off the real PATH.
      PATH: `${shimDir}:${process.env["PATH"] ?? ""}`,
      HOME: process.env["HOME"] ?? sandbox,
      // The two runner variables a job is given, and the evidence root an earlier step of the
      // pipeline exports. This is the planted root, so nothing here touches this run's own.
      RUNNER_TEMP: path.join(sandbox, "runner-temp"),
      SPEC_CONTROLLER_EVIDENCE_DIR: plantedRoot,
      GH_CALL_LOG: ghCallLog,
      GH_RUN_LIST: plantedRunList,
      GH_PAYLOAD: plantedPayload,
      ...step.env,
    },
  });

  assert.equal(
    finished.error,
    undefined,
    `the lifted step must run; it failed to spawn: ${finished.error?.message}`,
  );
  placementEndedWith = finished.status;
  placementSaid = finished.stderr ?? "";
  placementPrinted = finished.stdout ?? "";
}

// @SCN-PLC-001
When("this run places what it has", function () {
  runTheLiftedPlacement();
});

/**
 * A placement never reds, whichever way it decided — read once, for both scenarios.
 *
 * A PLACEMENT IS NOT AN ARBITER. Having nothing to place is the ordinary reading of a cadence, and
 * the place it is reported is the row downstream — never here.
 */
function placementDidNotRed(): void {
  assert.equal(
    placementEndedWith,
    0,
    `a placement never reds; it ended ${String(placementEndedWith)} saying:\n${placementSaid}`,
  );
}

/** The sentences one stream of the placement's log carries about the window, parsed for their terms. */
function windowSentencesIn(said: string, verb: RegExp): { what: string; age: number; window: number }[] {
  return said.split("\n").flatMap((line) => {
    const matched = verb.exec(line);
    return matched === null
      ? []
      : [{ what: matched[1]!, age: Number(matched[2]), window: Number(matched[3]) }];
  });
}

// @SCN-PLC-001
Then(
  "nothing is placed, and the refusal names an age past the window it was measured against",
  function () {
    placementDidNotRed();

    // THE REFUSAL, READ FOR ITS ARITHMETIC. Asserting only that nothing landed would be satisfied
    // by a step that did nothing at all — which is exactly the state a deleted window leaves
    // behind for a row whose record was never placed anyway.
    const refusals = windowSentencesIn(
      placementSaid,
      /^place: (.*) measured (\d+)s ago, past the (\d+)s window/,
    );
    assert.equal(
      refusals.length,
      1,
      `the placement must refuse exactly one measurement for being past the window; it said:\n${placementSaid}`,
    );
    const refusal = refusals[0]!;
    assert.ok(
      refusal.what.includes(subject.namedAs),
      `the refusal must name what it refused; it refused "${refusal.what}", which does not name ` +
        `${subject.namedAs}`,
    );
    assert.ok(
      refusal.age > refusal.window,
      `the refusal must name an age past the window it names; it read ${refusal.age}s against ` +
        `${refusal.window}s`,
    );
    // AND THE AGE IS THE ONE THAT WAS PLANTED, within the seconds this arm itself takes. An age
    // read off the wrong clock — a file that was never touched, an ISO string parsed as nothing —
    // would still be "past the window" and would still refuse, for a reason nobody planted.
    assert.ok(
      Math.abs(refusal.age - plantedAge) < 120,
      `the age must be the one that was planted (${plantedAge}s); it read ${refusal.age}s`,
    );

    assert.ok(
      !existsSync(path.join(plantedRoot, subject.placedAt)),
      `nothing may be placed: ${subject.placedAt} is in the evidence root`,
    );

    if (subject === SWEEP) {
      // THE WINDOW IS CLEARED BEFORE THE PAYLOAD IS FETCHED, which is what makes stale and absent
      // one observable rather than two. A download that happened and was discarded would leave
      // the same empty evidence root and prove nothing at all.
      const calls = existsSync(ghCallLog) ? readFileSync(ghCallLog, "utf8") : "";
      assert.ok(calls.includes("run list"), `the placement must ask which run to place; it asked:\n${calls}`);
      assert.ok(
        !calls.includes("download"),
        `a run past the window is never downloaded; the placement called:\n${calls}`,
      );
    } else {
      // AND THE STAGED RECORD IS LEFT EXACTLY WHERE THE WRAPPER PUT IT. Its age is the test, and a
      // placement that tidied the SOURCE away would destroy the evidence on which the next run
      // makes the same judgement. What a refusal takes away is the placed copy, never this.
      assert.ok(
        existsSync(path.join(plantedRoot, "staged", `timings-${subject.row}-measurements.json`)),
        "a refused measurement is left staged, not cleared",
      );
    }
  },
);

// @SCN-PLC-001
Then(
  "{string} reads missing, because its own command has no measurement to answer with",
  function (row: string) {
    assert.equal(row, subject.row, "the Examples row and the measurement it names must be the same row");

    // THE ROW'S OWN COMMAND, as the manifest names it and as its CI step runs it. A hand-written
    // read of the evidence root would be this arm's reading of the rule rather than the product's.
    const read = spawnSync(tsxBin, theRowsCommand(plantedRoot), {
      cwd: repoRoot,
      encoding: "utf8",
    });
    assert.equal(read.error, undefined, `the row's command must run; it failed: ${read.error?.message}`);

    assert.notEqual(
      read.status,
      0,
      `${row}'s command must refuse; it ended 0 printing "${(read.stdout ?? "").trim()}"`,
    );
    // NOTHING ON STDOUT, because stdout IS the measurement: a number printed here is a number
    // credited, and the whole claim is that this run has none to credit.
    assert.equal(
      (read.stdout ?? "").trim(),
      "",
      `${row}'s command must print no number at all; it printed "${(read.stdout ?? "").trim()}"`,
    );
    assert.ok(
      (read.stderr ?? "").includes(row),
      `the refusal must name the row it could not answer; it said: ${(read.stderr ?? "").trim()}`,
    );

    // AND THE RUN'S CREDIT STREAM CARRIES NO ROW FOR IT, which is what `missing` IS. The ledger
    // reads that file: a row absent from it is an Evidence Obligation nothing answered.
    const stream = path.join(plantedRoot, "measurements.json");
    const credited = existsSync(stream)
      ? ((JSON.parse(readFileSync(stream, "utf8")) as { measurements?: readonly { scnId?: string }[] })
          .measurements ?? [])
      : [];
    assert.ok(
      !credited.some((measurement) => measurement.scnId === row),
      `${row} must reach the ledger as missing; the credit stream reads ${JSON.stringify(credited)}`,
    );
  },
);

// @SCN-PLC-002
Then(
  "it is placed, and the placement names an age inside the window it was measured against",
  function () {
    placementDidNotRed();

    // THE PLACEMENT, READ FOR ITS ARITHMETIC, exactly as the refusal above is. "The record is in
    // the evidence root" is not on its own the claim: a placement that copied the file without
    // ever reaching the window would satisfy it, and so would one whose comparison answers yes to
    // everything. What is read is the sentence the SHARED RULE's age produced — how old the
    // measurement was, and which window that age was weighed against.
    const placements = windowSentencesIn(
      placementPrinted,
      /^place: placed (.*), measured (\d+)s ago, inside the (\d+)s window/,
    );
    assert.equal(
      placements.length,
      1,
      "the placement must place exactly one measurement and say so; it printed:\n" +
        `${placementPrinted}\nand said:\n${placementSaid}`,
    );
    const placed = placements[0]!;
    assert.ok(
      placed.what.includes(subject.namedAs),
      `the placement must name what it placed; it placed "${placed.what}", which does not name ` +
        `${subject.namedAs}`,
    );
    assert.ok(
      placed.age <= placed.window,
      `the placement must name an age inside the window it names; it read ${placed.age}s against ` +
        `${placed.window}s`,
    );
    // AND THE AGE IS THE ONE THAT WAS PLANTED, within the seconds this arm itself takes — the same
    // assertion its sibling makes, and for the same reason. An age read off the wrong clock would
    // still be inside the window and would still place, for a reason nobody planted.
    assert.ok(
      Math.abs(placed.age - plantedAge) < 120,
      `the age must be the one that was planted (${plantedAge}s); it read ${placed.age}s`,
    );

    // AND THE WINDOW REFUSED NOTHING, which is what makes this the other END of the boundary
    // rather than a second reading of the same side. It is read as the absence of the sentence its
    // sibling reads, over the same stream.
    assert.deepEqual(
      windowSentencesIn(placementSaid, /^place: (.*) measured (\d+)s ago, past the (\d+)s window/),
      [],
      `nothing may be refused for being past the window; the placement said:\n${placementSaid}`,
    );
    // AND THIS ROW WAS NOT REFUSED FOR ANY OTHER REASON EITHER. The timings step places two rows
    // and this plant stages one, so the row that staged nothing is refused here — which is the
    // ordinary case of a suite that did not run, and is deliberately not silenced. What may not
    // appear on this stream is the subject of this scenario.
    assert.ok(
      !placementSaid.includes(subject.namedAs),
      `${subject.namedAs} may not be refused at all; the placement said:\n${placementSaid}`,
    );

    // THE RECORD IS IN THE EVIDENCE ROOT, AND IT IS THE ONE THAT WAS PLANTED. A placement that
    // wrote a record of its own — an empty one, a defaulted one, the other row's — would satisfy
    // an assertion phrased on the file's existence while carrying a number nobody measured.
    const placedAt = path.join(plantedRoot, subject.placedAt);
    assert.ok(existsSync(placedAt), `${subject.placedAt} must be in the evidence root; it is not`);
    assert.deepEqual(
      (JSON.parse(readFileSync(placedAt, "utf8")) as { measurements?: unknown }).measurements,
      [{ scnId: subject.row, checkTag: subject.checkTag, measured: plantedNumber }],
      `${subject.placedAt} must hold the measurement that was planted`,
    );

    if (subject === SWEEP) {
      // THE PAYLOAD WAS FETCHED, which is the observable its sibling asserts the absence of. Both
      // arms watch the same call over the same fetchable artefact: one that must happen once the
      // window has been cleared, and one that must not happen at all before it has.
      const calls = existsSync(ghCallLog) ? readFileSync(ghCallLog, "utf8") : "";
      assert.ok(calls.includes("run list"), `the placement must ask which run to place; it asked:\n${calls}`);
      assert.ok(
        calls.includes("download"),
        `a run inside the window is downloaded; the placement called:\n${calls}`,
      );
    } else {
      // THE STAGED RECORD IS LEFT WHERE THE WRAPPER PUT IT — a placement copies, it does not move.
      // A step that cleared what it had placed would leave the next run reading `missing` over a
      // suite that ran, and the whole ageing-out arrangement rests on the record still being there.
      assert.ok(
        existsSync(path.join(plantedRoot, "staged", `timings-${subject.row}-measurements.json`)),
        "a placed measurement is left staged as well, not moved",
      );
    }
  },
);

// @SCN-PLC-002
Then(
  "{string} reads satisfied, because its own command answers with the number that was placed",
  function (row: string) {
    assert.equal(row, subject.row, "the Examples row and the measurement it names must be the same row");

    // THE ROW'S OWN COMMAND, as the manifest names it and as its CI step runs it — the same call
    // its sibling makes, over the same root, against a record that is now there to answer with.
    const read = spawnSync(tsxBin, theRowsCommand(plantedRoot), {
      cwd: repoRoot,
      encoding: "utf8",
    });
    assert.equal(read.error, undefined, `the row's command must run; it failed: ${read.error?.message}`);
    assert.equal(
      read.status,
      0,
      `${row}'s command must answer; it ended ${String(read.status)} saying: ${(read.stderr ?? "").trim()}`,
    );
    // THE NUMBER IS THE WHOLE OF STDOUT, which is the readers' own contract: `measuredNumberOf`
    // reads the trimmed WHOLE of what a measured row's command printed, so a banner or a units
    // suffix here is not ignored, it is a different answer.
    assert.equal(
      (read.stdout ?? "").trim(),
      String(plantedNumber),
      `${row}'s command must print the number that was placed`,
    );

    // AND THE RUN'S CREDIT STREAM CARRIES THE ROW, which is what settles it: the ledger reads that
    // file, and a row absent from it is an Evidence Obligation nothing answered — the reading its
    // sibling asserts. The row is read whole, both terms and the number, because a measurement
    // keyed under the wrong check tag is not loud either; it reconciles `missing` too.
    const stream = path.join(plantedRoot, "measurements.json");
    const credited = existsSync(stream)
      ? ((JSON.parse(readFileSync(stream, "utf8")) as { measurements?: readonly unknown[] })
          .measurements ?? [])
      : [];
    assert.deepEqual(
      credited,
      [{ scnId: row, checkTag: subject.checkTag, measured: plantedNumber }],
      `${row} must reach the ledger with the number that was placed; the credit stream reads ` +
        JSON.stringify(credited),
    );

    // AND THE NUMBER IS ON THE SATISFYING SIDE OF THE BAR ITS ROW STATES, WHICH IS A GUARD ON THE
    // PLANT AND NOT THE LEDGER'S VERDICT. Whether a row reconciles `satisfied` is settled in one
    // place and it is not here (@SCN-CIP-004). What this stops is the word `satisfied` standing in
    // this scenario's name over a number that would read `failing` — the plant is derived from the
    // bar for that reason, and this is the derivation asserted rather than assumed.
    const bar = theBarOf(row);
    assert.ok(
      bar.atLeast === true ? plantedNumber >= bar.threshold : plantedNumber <= bar.threshold,
      `${row} states a bar of ${bar.threshold} ${bar.atLeast === true ? "at-least" : "at-most"}, ` +
        `and the number this arm planted is ${plantedNumber}, which is on the failing side of it`,
    );
  },
);

/**
 * Take away the source this row is placed from, leaving the evidence root exactly as it is.
 *
 * ABSENT RATHER THAN STALE, AND THE STRICTER HALF ON PURPOSE. The rule delivered here is `fresh
 * source -> copy`, `stale source -> remove`, `no source -> remove`, and it is the last of those
 * that the window cannot reach: there is no age to compare, so a removal on this path cannot be
 * the comparison's other arm wearing a disguise. It is the placement's own invariant — after this
 * step the root holds this run's measurement or it holds nothing (3F-3200, ruling 2026-09-16).
 *
 * AND THE CALL LOG IS EMPTIED WITH IT, so what the second run asked GitHub is read on its own. The
 * first run downloaded a payload; a log carrying both runs would let that download answer for this
 * one.
 */
function withdrawTheSource(): void {
  if (subject === SWEEP) {
    // NOTHING FINISHED TO REPORT, which is what "no source" is for a row placed from another
    // workflow's run — a nightly that has not run, or has been pruned. The payload goes too: a
    // fetchable artefact behind an unreported run would leave this arm unable to say which of the
    // two absences it had arranged.
    plantedRunList = "[]";
    rmSync(plantedPayload, { force: true });
  } else {
    // NO STAGED RECORD, which is what "no source" is for a timed row: the ordinary shape of a job
    // in which that suite did not run at all.
    rmSync(plantedPayload, { force: true });
  }
  rmSync(ghCallLog, { force: true });
}

/**
 * Leave in the evidence root what the next run's placement is not answering for, and say what.
 *
 * THREE NEIGHBOURS, EACH CHOSEN FOR A DIFFERENT WAY OF BEING WRONG: the record the OTHER placement
 * owns, the per-mutant record the product itself names as not a measurement and deliberately keeps
 * under no window, and this run's own credit stream, which is written by readers and by no
 * placement at all. A removal reaching any of them is a placement that went for the root.
 */
function leaveBystandersInTheRoot(): void {
  const neighbour = subject === SWEEP ? PLACEABLE["the unit suite's timing"]! : SWEEP;
  bystanders = {
    [neighbour.placedAt]: `{"measurements":[{"scnId":"${neighbour.row}","checkTag":"${neighbour.checkTag}","measured":1}]}\n`,
    [RECORDED_SWEEP_PATH]: '{"files":{}}\n',
    [MEASUREMENT_ARTEFACT_PATH]: '{"measurements":[{"scnId":"SCN-FIT-017","checkTag":"mutation-regression","measured":0}]}\n',
  };
  mkdirSync(plantedRoot, { recursive: true });
  for (const [at, held] of Object.entries(bystanders))
    writeFileSync(path.join(plantedRoot, at), held, "utf8");
}

/** What the placement says when the source it places this row from is not there at all. */
function theAbsentSourceSentence(): RegExp {
  return subject === SWEEP
    ? /^place: \S+ names no finished run on \S+ carrying both an id and a createdAt; nothing is placed\./m
    : new RegExp(`^place: ${subject.row} staged no timings record at \\S+; nothing is placed\\.`, "m");
}

Given(
  "{string}, placed into an evidence root by a run that came before this one",
  function (measurement: string) {
    plantMeasurement(measurement, FRESH_AGE_SECONDS);
    runTheLiftedPlacement();

    // THE EARLIER RUN REALLY PLACED IT, ASSERTED RATHER THAN ASSUMED. Everything below is about
    // what becomes of this copy; a Given that quietly placed nothing would leave the scenario
    // asserting the absence of a file that was never there, which is the shape of green this
    // whole feature file exists to refuse.
    assert.ok(
      existsSync(path.join(plantedRoot, subject.placedAt)),
      `the earlier run must have placed ${subject.placedAt}; the root holds no such file. It said:` +
        `\n${placementSaid}`,
    );
    leaveBystandersInTheRoot();
  },
);

When("this run has nothing to place into that same root", function () {
  withdrawTheSource();
  runTheLiftedPlacement();
});

Then(
  "the earlier run's copy is gone from the evidence root, and nothing else there is disturbed",
  function () {
    placementDidNotRed();

    // WHY NOTHING WAS PLACED, READ RATHER THAN INFERRED. A step that crashed on its first line
    // places nothing too, and so does one whose terms expanded to the empty string. The sentence
    // asserted here is the one an ABSENT source produces, which is neither of those and is also
    // not the one a lapsed measurement produces — the two paths are told apart on purpose.
    assert.match(placementSaid, theAbsentSourceSentence());
    assert.deepEqual(
      windowSentencesIn(placementSaid, /^place: (.*) measured (\d+)s ago, past the (\d+)s window/),
      [],
      `a source that is not there has no age to weigh; the placement said:\n${placementSaid}`,
    );
    assert.deepEqual(
      windowSentencesIn(placementPrinted, /^place: placed (.*), measured (\d+)s ago, inside the (\d+)s window/),
      [],
      `nothing may be placed when there is no source; the placement printed:\n${placementPrinted}`,
    );

    // THE CLAIM. The earlier run's copy is what the row's own command would otherwise read, and
    // until this scenario nothing in the tree removed it: "nothing is placed" only means something
    // where nothing is there.
    assert.ok(
      !existsSync(path.join(plantedRoot, subject.placedAt)),
      `${subject.placedAt} was placed by the earlier run and this run refused to place anything, ` +
        "so it may not still be in the evidence root: a refusal that removes nothing has no effect " +
        `at all. The placement said:\n${placementSaid}`,
    );

    // AND THE REMOVAL IS THE ROW'S, NOT THE ROOT'S. Read by content and not by existence, because a
    // placement that cleared the root and then recreated a file would pass the weaker assertion.
    for (const [at, held] of Object.entries(bystanders)) {
      const left = path.join(plantedRoot, at);
      assert.ok(
        existsSync(left),
        `${at} is nothing this placement answers for and it is gone from the evidence root; the ` +
          "removal is of the row that was refused, never of the root",
      );
      assert.equal(readFileSync(left, "utf8"), held, `${at} was rewritten by a placement it is no part of`);
    }

    if (subject === SWEEP) {
      // AND THE SECOND RUN ASKED, AND FOUND NOTHING TO FETCH. A step that never reached GitHub at
      // all would leave the same empty log and would remove for a reason nobody planted.
      const calls = existsSync(ghCallLog) ? readFileSync(ghCallLog, "utf8") : "";
      assert.ok(calls.includes("run list"), `the placement must ask which run to place; it asked:\n${calls}`);
      assert.ok(
        !calls.includes("download"),
        `there is no run to download from; the placement called:\n${calls}`,
      );
    }
  },
);
