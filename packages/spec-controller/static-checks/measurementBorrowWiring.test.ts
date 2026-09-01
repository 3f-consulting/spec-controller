/**
 * Unit arms for the two scenarios about WHICH run of the sweep a push borrows from
 * (features/mutation-score.feature):
 *
 *   @SCN-MUT-015 — the night that found a regression is the night whose measurement crosses, so
 *                  the selection asks whether a run FINISHED and never what verdict followed it
 *                  (3F-2956).
 *   @SCN-MUT-017 — the number that settles this repository's row was measured on the branch this
 *                  ladder gates, so a hand-dispatch on a feature branch is not a run the selection
 *                  can reach (3F-2963).
 *
 * TWO SCENARIOS, ONE FILE, BECAUSE THEY READ ONE LINE. Both narrow the same `gh run list`, along
 * axes that do not touch: one asks WHICH VERDICT it must not read, the other WHICH LINE the run
 * was taken on. They share every helper below, and an edit that broke the walk would otherwise
 * have to be caught twice.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the `[SCN-MUT-015]` / `[SCN-MUT-017]` ids in the
 * describe / it strings below match their scenarios' tags, so a grep of either id returns both
 * halves of that pair. `@unit`-only — Cucumber skips them; these Vitest arms ARE the observed
 * evidence.
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

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, it, expect } from "vitest";
import { parse } from "yaml";

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
