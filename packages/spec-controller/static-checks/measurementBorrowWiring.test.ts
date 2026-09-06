/**
 * Unit arms for the scenarios about WHICH run of the sweep a push borrows from, and about what the
 * borrow SAYS it did (features/mutation-score.feature):
 *
 *   @SCN-MUT-015 — the night that found a regression is the night whose measurement crosses, so
 *                  the selection asks whether a run FINISHED and never what verdict followed it
 *                  (3F-2956).
 *   @SCN-MUT-017 — the number that settles this repository's row was measured on the branch this
 *                  ladder gates, so a hand-dispatch on a feature branch is not a run the selection
 *                  can reach (3F-2963).
 *   @SCN-MUT-018 — the borrow says only what it did, so the one sentence claiming a placement
 *                  stands inside the path of the guard that made it (3F-2967).
 *   @SCN-MUT-020 — the measurement a push borrows is young enough to be about the code it will
 *                  settle, so a sweep that finished inside the window has its number placed and
 *                  the borrow names the age it accepted (3F-3182).
 *   @SCN-MUT-021 — and the same window from the other side: a sweep that finished past it has
 *                  nothing placed, the lapse named, and the push carrying on — so the row it
 *                  would have settled reads missing exactly as a sweep that never ran (3F-3183).
 *
 * ONE FILE, BECAUSE THEY ALL REACH ONE STEP. The first two narrow the same `gh run list`, along
 * axes that do not touch: one asks WHICH VERDICT it must not read, the other WHICH LINE the run was
 * taken on. The third asks what that step SAYS once it has chosen. The last two ask whether its age
 * arithmetic FIRES, from either side of the window — and they are a pair rather than one arm twice,
 * because a refusal arm alone is green over a borrow that places nothing ever, and an admitting arm
 * alone is green over a window that never refuses. All of them reach the step through the same
 * walk, and an edit that broke it would otherwise have to be caught once per arm.
 *
 * THREE OF THESE ARMS READ THE STEP; @SCN-MUT-020 AND @SCN-MUT-021 RUN IT, AND THE DISTINCTION IS
 * LOAD-BEARING RATHER THAN STYLISTIC (3F-3156). Everything above them asserts the step's TEXT, which
 * is the right instrument for a term that either is or is not written down. It is the wrong instrument
 * for the window: a text assertion cannot tell an age comparison that fires from one whose
 * arithmetic is broken on the runner it runs on — `date -u -d` is GNU-only, and under a BSD `date`
 * this step places nothing and exits 0 with every text assertion in this file still green. Reading
 * a mechanism's behaviour off its configuration is also the exact move that let this window lose
 * its witness for two slices. So the executing arms are not candidates for a later tidy-up into the
 * shape the arms above them use, and that is written here rather than left to be re-derived.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the `[SCN-MUT-015]` / `[SCN-MUT-017]` /
 * `[SCN-MUT-018]` / `[SCN-MUT-020]` / `[SCN-MUT-021]` ids in the describe / it strings below match
 * their scenarios' tags, so a grep of any of them returns both halves of that pair. `@unit`-only —
 * Cucumber skips them; these Vitest arms ARE the observed evidence.
 *
 * ONE CLAIM, TWO HALVES, AND THE SECOND ONE USED TO BE A COMMENT'S. Which run the borrow selects
 * decides whether a regression's number can cross at all; whether the sweep left that number
 * behind before its verdict redded the run decides whether there is a number to select. Move the
 * ratchet ahead of the upload and every assertion about selection stays green while the night that
 * found the fault uploads nothing — so the order is asserted here beside the selection rather than
 * defended in prose written for a different reason (the operator's report).
 *
 * READ OFF THE REAL WORKFLOWS, WHICH IS THE WHOLE SCENARIO (@SCN-MUT-014's precedent). A planted
 * pair of workflows would show that a string this file wrote matches a string this file wrote.
 * What is in doubt is whether THIS repository's two pipelines still hand a measurement across the
 * run boundary between them, and the only way to ask is to open the two files each push ships.
 *
 * AND THE CHASE IS FOLLOWED AT EACH HOP. The borrow is found by finding the step that lists
 * another workflow's runs, never by a step name; the sweep's upload is found by the artefact name
 * the borrow itself asks to download; the verdict step is found by resolving which package.json
 * script the nightly runs and taking the one that reaches the ratchet. A ladder that had stopped
 * borrowing, a sweep that had stopped uploading and a nightly that had stopped reconciling each
 * red as themselves rather than as an empty comparison against an empty one.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, it, expect } from "vitest";
import { parse } from "yaml";

import { SWEEP_RECORD_PATH } from "./measurementArtefact.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

/** The workflow every push runs, and the one that borrows. */
const LADDER = ".github/workflows/ci.yml";

/** The workflow that sweeps this repository's domain core, and ends on the ratchet's verdict. */
const NIGHTLY = ".github/workflows/mutation.yml";

/**
 * The values `gh run list --status` reads as a run's CONCLUSION rather than its status.
 *
 * The whole defect was that one of these sat where a status belongs: a conclusion filter asks
 * whether the nightly's own verdict passed, and that is not what the ledger is asking.
 */
const CONCLUSIONS = [
  "action_required",
  "cancelled",
  "failure",
  "neutral",
  "skipped",
  "stale",
  "startup_failure",
  "success",
  "timed_out",
];

/** One of this repository's own files, read whole. */
function bytesOf(file: string): string {
  return readFileSync(path.join(repoRoot, file), "utf8");
}

/** A non-null object — the YAML-parse walk narrows through these. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** One step of a workflow, in the shape the claims below ask about. */
interface WorkflowStep {
  readonly run: string | undefined;
  readonly uses: string | undefined;
  readonly env: Record<string, string>;
  readonly with: Record<string, unknown>;
}

/** A step's `env:` block, flattened to the string values a `${NAME}` can resolve to. */
function envOf(step: Record<string, unknown>): Record<string, string> {
  const block = isRecord(step["env"]) ? step["env"] : {};
  return Object.fromEntries(
    Object.entries(block).flatMap(([name, value]) =>
      typeof value === "string" ? [[name, value]] : [],
    ),
  );
}

/**
 * Every step of a workflow, in the document's own order, refused where there are none.
 *
 * A SECOND YAML WALK, AND THE REASON IT IS NOT `ciRunCommands`. That primitive answers "which
 * commands does CI run" and deliberately discards everything else — the `env:` a `${NAME}` resolves
 * against, the `uses:` an upload is recognised by, and the ORDER that is half of this scenario.
 * Narrowing it here to return commands would be asking it a question it does not answer.
 */
function stepsOf(file: string): WorkflowStep[] {
  const doc: unknown = parse(bytesOf(file));
  const jobs = isRecord(doc) ? doc["jobs"] : undefined;
  const steps = isRecord(jobs)
    ? Object.values(jobs).flatMap((job) => (isRecord(job) && Array.isArray(job["steps"]) ? job["steps"] : []))
    : [];
  if (steps.length === 0) throw new Error(`${file} names no steps this can read.`);
  return steps.filter(isRecord).map((step) => ({
    run: typeof step["run"] === "string" ? step["run"] : undefined,
    uses: typeof step["uses"] === "string" ? step["uses"] : undefined,
    env: envOf(step),
    with: isRecord(step["with"]) ? step["with"] : {},
  }));
}

/** A `${NAME}` resolved against a step's own `env:`; names it does not hold are left standing. */
function withEnv(line: string, env: Record<string, string>): string {
  // Left standing rather than thrown on, so an unresolved name reaches the assertion VERBATIM and
  // reds naming itself — `${WORKFLOW}` where a workflow file was expected says more than a throw.
  return line.replace(/"?\$\{(\w+)\}"?/g, (whole, name: string) => env[name] ?? whole);
}

/** The one line of a step's script matching a shape, refused where it holds none. */
function lineOf(step: WorkflowStep, shape: RegExp, what: string): string {
  const found = (step.run ?? "").split("\n").filter((line) => shape.test(line));
  if (found.length !== 1) throw new Error(`the borrow step holds ${found.length} lines that ${what}; it must hold exactly one.`);
  return withEnv(found[0]!, step.env);
}

/** A `--flag`'s value on a resolved command line, refused where the flag carries none. */
function flagValueOf(command: string, flag: string): string {
  const found = new RegExp(`${flag}\\s+"?([^\\s"]+)"?`).exec(command);
  if (found === null) throw new Error(`${flag} is not given a value in: ${command}`);
  return found[1]!;
}

/**
 * The step of the push ladder that borrows another workflow's measurement.
 *
 * IT IS THE ABSENCE THAT MATTERS HERE. A ladder that had stopped borrowing leaves every other
 * name below still agreeing with every other, so a reader that shrugged at finding no listing
 * would report a wired borrow over a push that no longer asks the nightly for anything.
 */
function borrowStep(): WorkflowStep {
  const listing = stepsOf(LADDER).filter((step) => /\bgh\s+run\s+list\b/.test(step.run ?? ""));
  if (listing.length !== 1) {
    throw new Error(`${LADDER} runs ${listing.length} steps that list another workflow's runs; it must run exactly one.`);
  }
  return listing[0]!;
}

/** The `gh run list` the borrow selects a run with, resolved against the step's own `env:`. */
function selection(): string {
  return lineOf(borrowStep(), /\bgh\s+run\s+list\b/, "list another workflow's runs");
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

/** Does this step run a package.json script whose own command line reaches the ratchet? */
function reachesTheRatchet(step: WorkflowStep): boolean {
  const invoked = /^\s*pnpm\s+([\w:-]+)\s*$/.exec(step.run ?? "");
  return invoked !== null && commandOf(invoked[1]!).includes("ratchetCli.ts");
}

/** The only index of the nightly's steps satisfying a claim, refused where there is not one. */
function theOneIndex(steps: readonly WorkflowStep[], holds: (step: WorkflowStep) => boolean, what: string): number {
  const found = steps.flatMap((step, at) => (holds(step) ? [at] : []));
  if (found.length !== 1) throw new Error(`${NIGHTLY} holds ${found.length} steps that ${what}; it must hold exactly one.`);
  return found[0]!;
}

describe("[SCN-MUT-015] the night that found a regression is the night whose measurement crosses", () => {
  it("[SCN-MUT-015] borrows from the newest run of the sweep that has finished, whatever verdict followed it", () => {
    // `completed` excludes `queued` and `in_progress` by construction rather than by accident: a
    // sweep still running has nothing to hand across yet, and borrowing from it would download
    // nothing and read `missing` for the ten minutes each night the sweep is live.
    const command = selection();
    expect(flagValueOf(command, "--workflow")).toBe(path.basename(NIGHTLY));
    expect(flagValueOf(command, "--status")).toBe("completed");
    expect(flagValueOf(command, "--limit")).toBe("1");
  });

  it("[SCN-MUT-015] asks for no verdict at all, so the night that found a regression is a night it can borrow from", () => {
    // The named half of the claim above: a run's conclusion answers whether the nightly's own
    // verdict passed, and the ledger is asking what this tree's domain core killed.
    expect(CONCLUSIONS).not.toContain(flagValueOf(selection(), "--status"));
  });

  it("[SCN-MUT-015] leaves that measurement behind before the step whose verdict reds the run", () => {
    // The artefact is the one the borrow itself asks to download, so this reads whether the two
    // pipelines still name one thing rather than whether two copies of a name agree.
    const artefact = flagValueOf(lineOf(borrowStep(), /\bgh\s+run\s+download\b/, "download another workflow's artefact"), "--name");
    const steps = stepsOf(NIGHTLY);
    const upload = theOneIndex(
      steps,
      (step) => (step.uses ?? "").startsWith("actions/upload-artifact") && step.with["name"] === artefact,
      `upload the ${artefact} the borrow downloads`,
    );
    expect(upload).toBeLessThan(theOneIndex(steps, reachesTheRatchet, "reach the ratchet"));
  });

  it("[SCN-MUT-015] meets no failure in doing its job that reds the step, and keeps the one red route left loud on purpose", () => {
    // Non-negotiable 1 of 3F-2947: a red here as well would make a green build depend on two
    // arbiters agreeing, which mutation-score.feature already settles for the bar itself. What
    // moved (3F-2960) is WHERE that guarantee lives. It used to rest on a comment saying the step
    // ran without `-e` — false since the day it was written, because GitHub invokes a bare `run:`
    // as `bash -e {0}` and this step names no `shell:`, so errexit arrives from the SHELL and
    // `set -uo pipefail` does not clear it. What guarded the branches was `if !`; nothing guarded
    // the stretch between them.
    const script = (borrowStep().run ?? "").split("\n").map((line) => line.trim());
    /** What the shell actually runs, in order — the comments and blanks it never sees dropped. */
    const commands = script.filter((line) => line !== "" && !line.startsWith("#"));

    // ERREXIT IS CLEARED BEFORE ANYTHING CAN FAIL, AND NOTHING TURNS IT BACK ON — ONE CLAIM, HELD
    // AS ONE. The absence of `set -e` used to stand here alone, and it was true of the defect and
    // of the fix alike: that is how a wrong comment acquired a green tick. It says nothing unless
    // something first clears what the shell arrived with, so it is a CLAUSE of that claim now
    // rather than a claim of its own. Being the FIRST command is the assertion because it needs no
    // list of which commands can fail: three attentive readings of this script produced three
    // different such lists, so a guarantee resting on one rests on the artefact that moved.
    expect({
      clearedBeforeAnythingElse: commands[0],
      turnedBackOn: commands.filter((line) => /^set\s+-\S*e/.test(line)),
    }).toEqual({
      clearedBeforeAnythingElse: expect.stringMatching(/^set\s+.*\+\S*e/),
      turnedBackOn: [],
    });

    // AND THE LAST ACT IS `exit 0`, WHICH IS A SECOND ROUTE, NOT THE SAME ONE TWICE. A script's
    // status is its last command's even with errexit cleared, so the `jq` that renders what was
    // placed would otherwise report the step's verdict over a payload the shape check had passed.
    expect(commands.at(-1)).toBe("exit 0");

    // AND `-u` IS KEPT, WHICH IS THE ONE RED ROUTE LEFT AND IS ASSERTED RATHER THAN ASSUMED. An
    // unbound expansion exits 127 whatever errexit says. That red says THIS SCRIPT IS BROKEN, not
    // YOUR CODE LOST A KILL; dropping it to close the route would buy `cp "" runs/…`, a silent
    // wrong placement, which is the fail-open this whole line of work exists to close.
    expect(commands.filter((line) => /^set\s+.*-\S*u/.test(line)).length).toBeGreaterThan(0);

    // AND EVERY EXIT THAT IS NOT THAT LAST ACT IS A BRANCH'S: it places nothing and says why on
    // stderr first. Unchanged by 3F-2960 — the branches always did behave as their comments claim.
    const branches = commands.slice(0, -1).flatMap((line, at) => (/^exit\b/.test(line) ? [at] : []));
    expect(branches.length).toBeGreaterThan(1);
    expect(branches.map((at) => commands[at])).toEqual(branches.map(() => "exit 0"));
    expect(branches.map((at) => commands[at - 1]?.endsWith(">&2"))).toEqual(branches.map(() => true));
  });
});

/**
 * The `on.push.branches` of a workflow, refused unless it names exactly one branch.
 *
 * A SECOND, INDEPENDENT WALK OF THE SAME DOCUMENT, WHICH IS WHAT MAKES THE CLAIM BELOW A COUPLING
 * (@SCN-MUT-017). `stepsOf` descends `jobs.*.steps`; this reads the top-level `on` block. Two
 * distinct facts about one file — the branch this ladder gates, and the branch it borrows a
 * measurement about — so asserting they agree is not a file agreeing with itself.
 *
 * EXACTLY ONE, BECAUSE THE CLAIM IS SINGULAR. "The one branch this ladder gates on push" is
 * ill-defined the moment there are two, and the honest response is a red naming the ambiguity
 * rather than a silent `[0]` that keeps passing while the question it answers has stopped
 * meaning anything.
 */
function gatedPushBranch(file: string): string {
  const doc: unknown = parse(bytesOf(file));
  // `on` is YAML 1.1's boolean `true`, which the parser hands back as the key `true`, not "on".
  const on = isRecord(doc) ? (doc["on"] ?? doc["true"]) : undefined;
  const push = isRecord(on) ? on["push"] : undefined;
  const branches = isRecord(push) && Array.isArray(push["branches"]) ? push["branches"] : [];
  if (branches.length !== 1) {
    throw new Error(`${file} gates ${branches.length} branches on push; "the one branch this ladder gates" needs exactly one.`);
  }
  return String(branches[0]);
}

describe("[SCN-MUT-017] the number that settles this repository's row was measured on the branch this ladder gates", () => {
  it("[SCN-MUT-017] borrows only from runs of the sweep taken on the branch it names", () => {
    // The value is read through `withEnv`, so it resolves whether the term is written inline or
    // carried in the step's own `env:` beside the other terms of the selection.
    expect(flagValueOf(selection(), "--branch")).not.toBe("");
  });

  it("[SCN-MUT-017] names the one branch this ladder itself gates on push", () => {
    // THE COUPLING, AND THE REASON THE LITERAL STRING IS NOT ASSERTED. Pinning "main" here would
    // red on a default-branch rename that correctly moved both — a guard failing over a change
    // that was right. Tying the two facts together instead reds on the rename that moves ONE:
    // the borrow left reading a branch this ladder no longer gates, which is the fault worth
    // catching and the one a literal cannot see.
    expect(flagValueOf(selection(), "--branch")).toBe(gatedPushBranch(LADDER));
  });

  it("[SCN-MUT-017] narrows on that branch rather than on the event, so a dispatch on the gated branch is still borrowable", () => {
    // ASSERTED AS AN ABSENCE, WHICH IS THE POINT OF IT. `--event schedule` would exclude the
    // feature-branch dispatches too and would ALSO refuse a hand-dispatch on the gated branch —
    // a legitimate measurement of the very tree being judged, forced to read `missing`. Nothing
    // in the selection line would look wrong afterwards, which is why the absence is held here:
    // a term nobody wrote down is the term a later tidy-up adds for symmetry (@SCN-MUT-016's
    // reasoning, applied to the flag that is NOT there rather than the one that is).
    expect(selection()).not.toMatch(/--event\b/);
  });
});

/**
 * What the borrow step's shell actually runs, in order — the comments and blanks it never sees
 * dropped.
 *
 * A THIRD READER OF THE SAME STEP, AND DELIBERATELY NOT A REFACTOR OF THE FIRST. @SCN-MUT-015's
 * fourth arm computes this same list inline. Lifting it out from under that arm would be a
 * behaviour-preserving touch of a scenario this slice does not own — a Read, which owes its own
 * sub-issue (Scenario CRUD). Two lines stand duplicated on purpose rather than reaching across
 * that boundary for tidiness.
 */
function borrowCommands(): string[] {
  return (borrowStep().run ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));
}

/**
 * Where the step makes its one claim of its own, refused unless there is exactly one.
 *
 * IDENTIFIED BY SHAPE, NAMING NOTHING. This step writes TWO things to stdout — this sentence and
 * the `jq` that renders what was placed beneath it — and only one of them is an `echo`. Excluding
 * the render BY NAME would be a hand-derived list of one, which is the instrument 3F-2960's Ruling
 * 2 barred; "is an `echo`, is not redirected" excludes nothing and enumerates nothing.
 *
 * EXACTLY ONE, BECAUSE THE CLAIM IS SINGULAR (`gatedPushBranch`'s precedent). "The sentence
 * claiming a placement" stops meaning anything the moment there are two, and the honest response
 * is a red naming the ambiguity rather than a silent `[0]` that keeps passing.
 */
function theClaimIndex(commands: readonly string[]): number {
  const found = commands.flatMap((line, at) =>
    /^echo\b/.test(line) && !line.endsWith(">&2") ? [at] : [],
  );
  if (found.length !== 1) {
    throw new Error(
      `the borrow step writes ${found.length} echoes of its own to stdout; "the sentence claiming a placement" needs exactly one.`,
    );
  }
  return found[0]!;
}

/** The `if` opening the block that the `fi` at `from` closes, walked back on nesting depth. */
function theOpeningIf(commands: readonly string[], from: number): number {
  let depth = 0;
  for (let at = from; at >= 0; at--) {
    if (/^fi\b/.test(commands[at]!)) depth += 1;
    else if (/^if\b/.test(commands[at]!)) {
      depth -= 1;
      if (depth === 0) return at;
    }
  }
  throw new Error(`the borrow step closes a block at ${from} that no if opens.`);
}

describe("[SCN-MUT-018] the borrow says only what it did", () => {
  it("[SCN-MUT-018] writes exactly one echo of its own to stdout, and that is the sentence claiming a measurement was placed", () => {
    // The refusal inside `theClaimIndex` is half of this arm: a second unredirected `echo` makes
    // the subject of the two assertions below ill-defined, and reds here rather than downstream.
    const commands = borrowCommands();
    expect(commands[theClaimIndex(commands)]).toMatch(/\bplaced\b/);
  });

  it("[SCN-MUT-018] stands that sentence immediately inside the path of the guard whose condition performs the placement", () => {
    // ADJACENCY IS THE PROXY; THE GUARD'S IDENTITY IS THE PURPOSE, AND BOTH ARE ASSERTED. That
    // nothing executable stands between the claim and a closed guard is sound and insufficient:
    // an unrelated guarded branch dropped into that gap satisfies it while the claim has stopped
    // standing inside the path of the thing it claims. So the guard is required to be the
    // PLACEMENT's — its condition names the path the ledger later reads.
    const commands = borrowCommands();
    const claim = theClaimIndex(commands);
    expect(commands[claim - 1]).toBe("fi");
    // SWEEP_RECORD_PATH rather than a literal, so the borrow and the sweep record's own producer
    // stay ONE fact: a path that moved in one and not the other reds instead of passing on two
    // agreeing strings (`sweepVerdictWiring` chases the upload by this same constant).
    expect(withEnv(commands[theOpeningIf(commands, claim - 1)]!, borrowStep().env)).toContain(
      SWEEP_RECORD_PATH,
    );
  });

  it("[SCN-MUT-018] lets a placement that guard could not make say why on stderr, place nothing, and exit 0 like every branch above it", () => {
    // The borrow is still not an arbiter (3F-2947's non-negotiable 1): the branch this Rule adds
    // behaves as every branch above it does. Its length is asserted because "places nothing" is
    // the claim — a command added inside it would be the branch doing something.
    const commands = borrowCommands();
    const claim = theClaimIndex(commands);
    const branch = commands.slice(theOpeningIf(commands, claim - 1) + 1, claim - 1);
    expect({ says: branch.at(-2)?.endsWith(">&2"), leaves: branch.at(-1), does: branch.length }).toEqual({
      says: true,
      leaves: "exit 0",
      does: 2,
    });
  });
});

/* ═══ @SCN-MUT-020 / @SCN-MUT-021 — THE ARMS THAT RUN THE STEP RATHER THAN READING IT ════════ */

/**
 * `gh`, answered at the two calls the borrow makes and refusing every other.
 *
 * THE BOUNDARY IS THE ONLY THING REPLACED. GitHub is the one thing this arm cannot have: a listing
 * of the sweep's runs and the artefact one of them left behind. Everything else in the step — the
 * `jq` filters, the date arithmetic, the future-dated path, the payload shape check, the `mkdir`
 * and `cp` that place the record, the cleared errexit and the terminal `exit 0` — is the real
 * script running for real. That is what makes this arm able to see a branch nobody enumerated.
 *
 * IT REFUSES ANY OTHER CALL RATHER THAN SHRUGGING. A stub that answered everything would let a
 * borrow that started asking GitHub something new pass silently on a stub's default.
 */
const GH_STUB = `#!/usr/bin/env bash
set -u
if [ "\${1:-}" = "run" ] && [ "\${2:-}" = "list" ]; then
  printf '%s' "\${STUB_RUN_LIST}"
  exit 0
fi
if [ "\${1:-}" = "run" ] && [ "\${2:-}" = "download" ]; then
  previous=""
  into=""
  for argument in "$@"; do
    if [ "\${previous}" = "--dir" ]; then into="\${argument}"; fi
    previous="\${argument}"
  done
  mkdir -p "\${into}"
  printf '%s' "\${STUB_MEASUREMENTS}" > "\${into}/measurements.json"
  exit 0
fi
echo "gh stub: the borrow asked for something this arm does not answer: $*" >&2
exit 1
`;

/**
 * A GNU `date` on this machine, REFUSED WHERE THERE IS NONE — never skipped.
 *
 * THE HAZARD THIS EXISTS FOR, MEASURED RATHER THAN ANTICIPATED (3F-3156). `date -u -d "<iso>"` is
 * GNU syntax. A BSD `date` refuses it, so the step takes its own "not a moment this runner can
 * read" path, places nothing and exits 0 — which is INDISTINGUISHABLE from the past-the-window
 * outcome. Measured at Analysis: with a BSD `date`, a run one hour old and a run forty hours old
 * both placed nothing, for the same wrong reason. `ubuntu-latest` has GNU `date` natively; a macOS
 * developer machine has it as `gdate` if coreutils is installed.
 *
 * AND A MISSING ONE THROWS RATHER THAN SKIPS. A skipped arm posts a credit saying the check ran
 * when it did not, which is the fault 3F-3162 closed one level up. An arm that cannot reach the
 * arithmetic it exists to witness must say so as a red.
 */
function gnuDate(): string {
  const directories = (process.env["PATH"] ?? "").split(path.delimiter).filter((entry) => entry !== "");
  for (const name of ["gdate", "date"]) {
    for (const directory of directories) {
      const candidate = path.join(directory, name);
      const probe = spawnSync(candidate, ["--version"], { encoding: "utf8" });
      if (probe.status === 0 && /GNU coreutils/.test(probe.stdout)) return candidate;
    }
  }
  throw new Error(
    "this arm runs the borrow's own age arithmetic, which is GNU `date -u -d` syntax, and no GNU " +
      "date is on PATH (`gdate`, or a `date` whose --version says GNU coreutils). Skipping would " +
      "leave the step on its unreadable-timestamp path — placing nothing, exiting 0, and proving " +
      "nothing about the window while looking like it had run.",
  );
}

/**
 * The window the step itself states, in seconds — read from the step's own `env:`, never typed here.
 *
 * A HARD-CODED 129600 WOULD BE A SECOND COPY OF THE WINDOW, and a fact surviving as a copy while
 * its witness went away is the whole finding this scenario closes. The timestamps below are derived
 * from this number, so retuning the window in `ci.yml` moves this arm with it.
 */
function statedWindow(): number {
  const stated = Number(borrowStep().env["MAX_AGE"]);
  if (!Number.isFinite(stated) || stated <= 0) {
    throw new Error(`the borrow step's env names no readable MAX_AGE; it holds ${borrowStep().env["MAX_AGE"]}.`);
  }
  return stated;
}

/** The scratch roots each run owns, cleared once the file's arms are done with them. */
const sandboxes: string[] = [];

afterAll(() => {
  for (const sandbox of sandboxes) rmSync(sandbox, { recursive: true, force: true });
});

/**
 * The payload the sweep left behind — ONE object, shared by both executing arms.
 *
 * BECAUSE THE PAIR'S WHOLE CLAIM IS THAT AGE IS THE ONLY INPUT THAT DIFFERS BETWEEN THEM. Written
 * as two literals that claim to be identical, they would be identical until the day one of them was
 * edited, and the arm that then went green would be green about something nobody meant to ask. That
 * is the same fact-surviving-as-a-copy this file's own window finding is about, one level down, so
 * the identity is held by there being one object rather than by a comment asserting two.
 */
const SWEPT = { measurements: [{ scnId: "SCN-MUT-011", checkTag: "mutation", measured: 774 }] };

/** What running the borrow left behind: what it said, how it ended, and what it placed. */
interface Borrowed {
  readonly stdout: string;
  readonly stderr: string;
  readonly status: number | null;
  readonly placed: string | undefined;
}

/**
 * Run the real borrow step over a sweep that finished at `createdAt` and left `payload` behind.
 *
 * THE EVIDENCE ROOT IS THIS RUN'S OWN, NEVER THE DEVELOPER'S. A warm root would let a previous
 * sweep's record read as this arm's placement — the confounder that made two of three probes wrong
 * on 3F-3162 — so both roots the step writes under are directories this arm creates and owns.
 *
 * IT IS INVOKED AS `bash -e`, WHICH IS HOW GITHUB INVOKES IT. A bare `run:` naming no `shell:` runs
 * as `bash -e {0}`, so the errexit the step clears out loud (@SCN-MUT-015) has to actually arrive.
 */
function borrow(createdAt: string, payload: unknown): Borrowed {
  const step = borrowStep();
  const sandbox = mkdtempSync(path.join(os.tmpdir(), "borrow-arm-"));
  sandboxes.push(sandbox);
  const evidence = path.join(sandbox, "evidence");
  const stubs = path.join(sandbox, "bin");
  for (const directory of [evidence, path.join(sandbox, "runner-temp"), stubs]) mkdirSync(directory);
  symlinkSync(gnuDate(), path.join(stubs, "date"));
  writeFileSync(path.join(stubs, "gh"), GH_STUB, { mode: 0o755 });
  const script = path.join(sandbox, "borrow.sh");
  writeFileSync(script, step.run ?? "");
  const ran = spawnSync("bash", ["-e", script], {
    encoding: "utf8",
    env: {
      ...process.env,
      ...step.env,
      PATH: `${stubs}${path.delimiter}${process.env["PATH"] ?? ""}`,
      SPEC_CONTROLLER_EVIDENCE_DIR: evidence,
      RUNNER_TEMP: path.join(sandbox, "runner-temp"),
      STUB_RUN_LIST: JSON.stringify([{ databaseId: 4242, createdAt }]),
      STUB_MEASUREMENTS: JSON.stringify(payload),
    },
  });
  const record = path.join(evidence, SWEEP_RECORD_PATH);
  return {
    stdout: ran.stdout,
    stderr: ran.stderr,
    status: ran.status,
    placed: existsSync(record) ? readFileSync(record, "utf8") : undefined,
  };
}

describe("[SCN-MUT-020] the measurement a push borrows is young enough to be about the code it will settle", () => {
  it("[SCN-MUT-020] places the measurement of a sweep that finished inside the window, and names the age it accepted against the window it accepted it against", () => {
    // COMFORTABLY INSIDE, AND DERIVED FROM THE STEP'S OWN WINDOW. Half the stated window is inside
    // it by construction whatever the number is retuned to, and far enough from both edges that no
    // clock skew between this process and the shell's `date` can reach either.
    const window = statedWindow();
    const inside = Math.floor(window / 2);
    const borrowed = borrow(new Date(Date.now() - inside * 1000).toISOString(), SWEPT);

    // EVERY OTHER PATH THROUGH THIS STEP SAYS WHY ON STDERR AND PLACES NOTHING (@SCN-MUT-018), so
    // a silent stderr is the assertion that the PLACING path is the one that ran — including the
    // unreadable-timestamp path a BSD `date` would have taken, which is the vacuous green this
    // scenario exists to make unreachable.
    expect({ status: borrowed.status, said: borrowed.stderr }).toEqual({ status: 0, said: "" });

    // The record is where the check that reports it reads it, and it carries what the sweep
    // measured — not merely a file of the right name in the right place.
    expect(borrowed.placed === undefined ? undefined : JSON.parse(borrowed.placed)).toEqual(SWEPT);
    expect(borrowed.stdout).toContain("borrow:   SCN-MUT-011 mutation = 774");

    // AND IT NAMES BOTH NUMBERS, WHICH IS WHAT MAKES THE ACCEPTANCE READABLE IN A LOG. An age
    // without its window is a number nobody can judge; the window without the age says nothing
    // about the run that crossed. The window is asserted to be the step's own stated one, so a
    // sentence rendering some other number reds rather than reading plausibly.
    const named = /measured (\d+)s ago, inside the (\d+)s window/.exec(borrowed.stdout);
    expect(named).not.toBeNull();
    expect(Number(named?.[2])).toBe(window);
    expect(Math.abs(Number(named?.[1]) - inside)).toBeLessThanOrEqual(60);
  });
});

describe("[SCN-MUT-021] a sweep that finished past the window has nothing placed", () => {
  it("[SCN-MUT-021] places nothing for a sweep that finished past the window, names the lapse it refused, and lets the push carry on", () => {
    // COMFORTABLY PAST, AND DERIVED FROM THE STEP'S OWN WINDOW — the same term @SCN-MUT-020 halves.
    // Twice the stated window is outside it by construction whatever the number is retuned to, so
    // this arm and its sibling move together when the cadence is retuned and neither can drift onto
    // the wrong side of a boundary that changed underneath them.
    const window = statedWindow();
    const past = window * 2;

    // THE SWEEP LEFT A PERFECTLY GOOD NUMBER BEHIND, AND IT IS STILL REFUSED. The payload is the
    // SAME OBJECT @SCN-MUT-020 has placed, so the single input that differs between the two arms
    // is when the run finished. A green here is therefore about the age and about nothing else —
    // and that is held by `SWEPT` being one object, not by these two arms being kept in step.
    const borrowed = borrow(new Date(Date.now() - past * 1000).toISOString(), SWEPT);

    // NOTHING PLACED, AND THE PUSH NOT STOPPED — the two halves of the same stance (@SCN-MUT-018).
    // The borrow is no arbiter: a lapsed cadence is not a fault in the code being pushed, so it
    // says what it did and exits as it would have on any other path. Asserting a stopped ladder
    // here would assert the opposite of the design.
    expect({ status: borrowed.status, placed: borrowed.placed }).toEqual({ status: 0, placed: undefined });
    expect(borrowed.stdout).not.toContain("borrow: placed");

    // AND THIS IS THE ASSERTION THAT KEEPS THIS ARM FROM PASSING FOR THE WRONG REASON, so it is the
    // one that must stay sharp. Four other paths through this step also place nothing and exit 0,
    // and one of them — a `date` that cannot read an ISO moment — is reachable on any runner
    // without GNU coreutils. Only the lapse names an age AND the window it was measured against, so
    // reading those two numbers out of the sentence is what tells the window firing apart from the
    // arithmetic never having run. The window is asserted to be the step's own stated one, and the
    // age to be the one this arm dated the run at, so a sentence rendering some other pair of
    // numbers reds rather than reading plausibly.
    const named = /measured (\d+)s ago, past the (\d+)s window/.exec(borrowed.stderr);
    expect(named).not.toBeNull();
    expect(Number(named?.[2])).toBe(window);
    expect(Math.abs(Number(named?.[1]) - past)).toBeLessThanOrEqual(60);
  });
});
