/**
 * @SCN-SSM-006 (3F-2366) — the ONE planted-violation arm of the scn-subissue gate's EDGE
 * (3F-3236 / 3F-3218). The gate's DECISION is `scnSubIssueGate.ts`'s; what only this edge can
 * answer is what it reads out of a repository and a CI environment, and WHICH OF ITS THREE
 * ENDINGS a run leaves by. So: one planted repository, five runs of the REAL CLI over it, and
 * ONE expect over every exit status and every line said.
 *
 * WHY THIS CODE AND NOT @SCN-SSM-003, WHICH THIS FILE ALSO CREDITED. An arm credits exactly one
 * scenario, so collapsing seven arms into one spends six citations. Measured off the run's own
 * report with `parseVitestEvidenceObservations`: @SCN-SSM-006 drew all four of its `@unit`
 * observations HERE and none anywhere else, while @SCN-SSM-003 drew three here and two from
 * `scnSubIssueGate.test.ts`. Citing @SCN-SSM-003 would leave @SCN-SSM-006 with no observation at
 * all and its obligation reading missing. The choice is the measurement's, not a preference.
 *
 * THE THIRD ENDING IS THE ONE THE ROW CANNOT PROVE, and that is why a real-tree read is KEPT here
 * rather than dropped on Ruling B's account. @SCN-FIT-010 runs this CLI over the real diff on
 * every `pnpm verify`, and it was proved to REACH the CLI, the decision engine and the scenario-
 * text classifier alike — each neutered to report something that is not there, each time the row
 * reds. But a clean run exits 0 and never consults the row's `notExaminedExit`, so the ending
 * that field exists for is unexercised on a green tree: planted to exit 3, the row SKIPS rather
 * than reds, which is correct and silent. So the arm reads that field off the real manifest and
 * pins the planted not-examined run to leave by exactly the ending the row declares — the one
 * place the CLI's exit and the row's expectation are held to each other.
 *
 * FIVE RUNS, ONE CORPUS, AND THE ENVIRONMENT IS THE ONLY THING THAT MOVES between the first
 * three: a ticket handle on the branch, then no handle with a pull request body to read, then no
 * handle and no body at all. That is the whole point of the three endings — the same diff is a
 * pass, a violation and an unanswerable question depending on what CI hands the run.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tsxBin = path.join(repoRoot, "node_modules/.bin/tsx");
const cliPath = path.join(repoRoot, "tests/checks/lintScnSubIssuesCli.ts");

/** The ending the fitness row declares for "there was no pull request body to read". */
function rowNotExaminedExit(): unknown {
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8")) as {
    specController?: { fitnessChecks?: { command?: string; notExaminedExit?: number }[] };
  };
  return (manifest.specController?.fitnessChecks ?? []).find(
    (row) => row.command === "pnpm lint:scn-subissues"
  )?.notExaminedExit;
}

/** The planted corpus at the base commit: one scenario to update, one to delete. */
const FEATURE_BASE = `@SSM
Feature: a planted repository the scn-subissue gate is held over

  @unit @SCN-ZZZ-001
  Scenario: it is updated by the head commit
    Given a thing

  @unit @SCN-ZZZ-002
  Scenario: it is deleted by the head commit
    Given a thing
`;

/** The same corpus at the head commit: one updated, one deleted, one added, preamble edited. */
const FEATURE_HEAD = `@SSM
Feature: a planted repository the scn-subissue gate is held over, its preamble edited outside every scenario

  @unit @SCN-ZZZ-001
  Scenario: it is updated by the head commit
    Given a thing that changed

  @unit @SCN-ZZZ-003
  Scenario: it is added by the head commit
    Given a thing
`;

/** The unit-equivalent surface: one cited block, one that cites nothing. */
const TEST_BASE = `import { describe, it, expect } from "vitest";

describe("[SCN-ZZZ-001] the cited block", () => {
  it("is cited by its describe", () => {
    expect(1).toBe(1);
  });
});

describe("the block that cites nothing", () => {
  it("carries no scenario code", () => {
    expect(1).toBe(1);
  });
});
`;

/** The same file with an assertion changed INSIDE the block that cites nothing, and only there. */
const TEST_HEAD = TEST_BASE.replace(
  `it("carries no scenario code", () => {\n    expect(1).toBe(1);`,
  `it("carries no scenario code", () => {\n    expect(2).toBe(2);`
);

/** A fork-sourced PR event payload: the head repo is not the base repo. */
const FORK_EVENT = JSON.stringify({
  pull_request: {
    head: { repo: { full_name: "outside-contributor/spec-controller" } },
    base: { repo: { full_name: "3f-consulting/spec-controller" } },
  },
});

interface Planted {
  dir: string;
  /** The commit before the Gherkin surface moved. */
  featureBase: string;
  /** The commit after the Gherkin surface moved, before the unit-equivalent one did. */
  unitEquivalentBase: string;
  eventPath: string;
}

/** Write a file under the planted repository, creating its directory. */
function put(dir: string, relative: string, content: string): void {
  const file = path.join(dir, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

/**
 * The planted repository: a base commit, a commit moving the Gherkin surface, and a commit moving
 * ONLY the unit-equivalent surface. No commit message carries a `[3F-NNN]` prefix — the handle is
 * the environment's to supply, which is what makes the three endings a matter of environment.
 */
function plantRepository(): Planted {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `scn-ssm-006-${process.pid}-`));
  const git = (...args: string[]): string =>
    execFileSync("git", args, { cwd: dir, encoding: "utf8" }).trim();

  execFileSync("git", ["init", "-q", "-b", "main"], { cwd: dir });
  git("config", "user.email", "planted@example.com");
  git("config", "user.name", "Planted");
  git("config", "commit.gpgsign", "false");

  put(dir, "features/planted.feature", FEATURE_BASE);
  put(dir, "packages/app/src/thing.ts", "export const thing = 1;\n");
  put(dir, "tests/thing.test.ts", TEST_BASE);
  git("add", "-A");
  git("commit", "-q", "-m", "the planted base");
  const featureBase = git("rev-parse", "HEAD");

  put(dir, "features/planted.feature", FEATURE_HEAD);
  git("add", "-A");
  git("commit", "-q", "-m", "move the Gherkin surface, carrying no ticket handle");
  const unitEquivalentBase = git("rev-parse", "HEAD");

  put(dir, "packages/app/src/thing.ts", "export const thing = 2;\n");
  put(dir, "tests/thing.test.ts", TEST_HEAD);
  git("add", "-A");
  git("commit", "-q", "-m", "move only the unit-equivalent surface, carrying no ticket handle");

  const eventPath = path.join(dir, "event.json");
  fs.writeFileSync(eventPath, FORK_EVENT);
  return { dir, featureBase, unitEquivalentBase, eventPath };
}

/** What one run of the real CLI left behind: the status it exited, and every line it said. */
function run(
  planted: Planted,
  env: Record<string, string | undefined>
): { exit: number; said: string[] } {
  const base = { ...process.env, GITHUB_EVENT_PATH: undefined, PR_BODY: undefined };
  let exit = 0;
  let output: string;
  try {
    output = execFileSync(tsxBin, [cliPath], {
      cwd: planted.dir,
      encoding: "utf8",
      env: { ...base, ...env } as NodeJS.ProcessEnv,
      // The planted runs' stderr is CAPTURED, not inherited. Two of the five end in the CLI's
      // own "FAILED" / "NOT EXAMINED" report, and inherited they would print a page of findings
      // into the output of a gate that is passing — which is the same fault this module's own
      // `resolveMergeBase` discards git's stderr for. What the runs said is asserted below, so
      // nothing is lost by keeping it out of the console.
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    exit = typeof e.status === "number" ? e.status : -1;
    output = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
  return { exit, said: output.split("\n").filter((line) => line !== "") };
}

describe("[SCN-SSM-006] the scn-subissue gate's edge reads a repository and a CI environment, and leaves by one of three endings", () => {
  it("[SCN-SSM-006] reads the added, updated and deleted codes and the change no scenario accounts for, then passes on a handle, reds on a body it can read, and says it examined nothing when there is none — leaving by exactly the ending its fitness row declares", () => {
    const planted = plantRepository();
    const featureBase = { GITHUB_BASE_SHA: planted.featureBase };

    const ticketed = run(planted, {
      ...featureBase,
      GITHUB_HEAD_REF: "steven/3f-3236-planted",
      PR_BODY: "",
    });
    const forkExempt = run(planted, {
      ...featureBase,
      GITHUB_HEAD_REF: "community/contribution",
      GITHUB_EVENT_PATH: planted.eventPath,
      PR_BODY: "",
    });
    const violating = run(planted, {
      ...featureBase,
      GITHUB_HEAD_REF: "community/contribution",
      PR_BODY: "SCN-exempt: SCN-ZZZ-002 (regression)\nSCN-exempt: SCN-ZZZ-001 (not-a-reason)",
    });
    const notExamined = run(planted, {
      ...featureBase,
      GITHUB_HEAD_REF: "community/contribution",
    });
    const unitEquivalent = run(planted, {
      GITHUB_BASE_SHA: planted.unitEquivalentBase,
      GITHUB_HEAD_REF: "community/contribution",
      PR_BODY: "",
    });

    expect({
      ticketed,
      forkExempt,
      violating,
      notExamined,
      unitEquivalent,
      rowNotExaminedExit: rowNotExaminedExit(),
      leftByTheEndingTheRowDeclares: notExamined.exit === rowNotExaminedExit(),
    }).toEqual({
      ticketed: {
        exit: 0,
        said: [
          "scn-subissue lint: features/planted.feature changed OUTSIDE every scenario — no @SCN code accounts for that change. An empty updated set here means \"no scenario contains this change\", never \"nothing changed\". Reported, not a violation.",
          "scn-subissue lint: 1 added, 1 updated, 1 deleted @SCN code(s); unit-equivalent: inert, cited [], UNCITED changed block(s): tests/thing.test.ts: the block that cites nothing > carries no scenario code; ticket handle: present; pull request body: readable — checking: SCN-ZZZ-003, SCN-ZZZ-001, SCN-ZZZ-002",
          "scn-subissue lint: OK — every behaviour-bearing change carries its @SCN cite and is on a ticketed PR (or a recognised exemption); verified hermetically, no Linear call.",
        ],
      },
      forkExempt: {
        exit: 0,
        said: [
          "scn-subissue lint: features/planted.feature changed OUTSIDE every scenario — no @SCN code accounts for that change. An empty updated set here means \"no scenario contains this change\", never \"nothing changed\". Reported, not a violation.",
          "scn-subissue lint: 1 added, 1 updated, 1 deleted @SCN code(s); unit-equivalent: inert, cited [], UNCITED changed block(s): tests/thing.test.ts: the block that cites nothing > carries no scenario code; ticket handle: ABSENT; pull request body: readable — checking: SCN-ZZZ-003, SCN-ZZZ-001, SCN-ZZZ-002",
          "scn-subissue lint: OK — every behaviour-bearing change carries its @SCN cite and is on a ticketed PR (or a recognised exemption); verified hermetically, no Linear call.",
        ],
      },
      violating: {
        exit: 1,
        said: [
          "scn-subissue lint: features/planted.feature changed OUTSIDE every scenario — no @SCN code accounts for that change. An empty updated set here means \"no scenario contains this change\", never \"nothing changed\". Reported, not a violation.",
          "scn-subissue lint: 1 added, 1 updated, 1 deleted @SCN code(s); unit-equivalent: inert, cited [], UNCITED changed block(s): tests/thing.test.ts: the block that cites nothing > carries no scenario code; ticket handle: ABSENT; pull request body: readable — checking: SCN-ZZZ-003, SCN-ZZZ-001, SCN-ZZZ-002",
          "scn-subissue lint: FAILED",
          "  [missing-ticket-handle] Added scenario code @SCN-ZZZ-003 is a behaviour-bearing change on a PR that carries no ticket handle (no Linear-auto-named branch \"steven/3f-NNN-…\" and no \"[3F-NNN]\" commit-message prefix), so it can't be bound to a live tracked work-unit. Open the PR from its Linear-auto-named branch (or carry a [3F-NNN] commit prefix), or add a SCN-exempt: SCN-ZZZ-003 (<reason>) trailer with reason ∈ {renumber, regression, evidence-§8A}.",
          "  [malformed-exemption] Updated scenario code @SCN-ZZZ-001 carries a malformed SCN-exempt trailer — its reason is missing or not in {renumber, regression, evidence-§8A}. A malformed exemption is a failure, not a silent pass: correct the reason to one of {renumber, regression, evidence-§8A}, or remove the SCN-exempt trailer and put the change on a ticketed PR.",
        ],
      },
      notExamined: {
        exit: 3,
        said: [
          "scn-subissue lint: features/planted.feature changed OUTSIDE every scenario — no @SCN code accounts for that change. An empty updated set here means \"no scenario contains this change\", never \"nothing changed\". Reported, not a violation.",
          "scn-subissue lint: 1 added, 1 updated, 1 deleted @SCN code(s); unit-equivalent: inert, cited [], UNCITED changed block(s): tests/thing.test.ts: the block that cites nothing > carries no scenario code; ticket handle: ABSENT; pull request body: NONE TO READ — checking: SCN-ZZZ-003, SCN-ZZZ-001, SCN-ZZZ-002",
          "scn-subissue lint: NOT EXAMINED",
          "  [not-examined] Added scenario code @SCN-ZZZ-003 carries no ticket handle, and whether an exemption was claimed for it CANNOT BE ANSWERED on this run: SCN-exempt directives come from the pull request body as well as the commit messages, and there was no pull request body to read. So nothing was examined here — which is neither a pass nor a violation. On a pull request the body is always readable, and the same change there either carries its exemption or reds.",
          "  [not-examined] Updated scenario code @SCN-ZZZ-001 carries no ticket handle, and whether an exemption was claimed for it CANNOT BE ANSWERED on this run: SCN-exempt directives come from the pull request body as well as the commit messages, and there was no pull request body to read. So nothing was examined here — which is neither a pass nor a violation. On a pull request the body is always readable, and the same change there either carries its exemption or reds.",
          "  [not-examined] Deleted scenario code @SCN-ZZZ-002 carries no ticket handle, and whether an exemption was claimed for it CANNOT BE ANSWERED on this run: SCN-exempt directives come from the pull request body as well as the commit messages, and there was no pull request body to read. So nothing was examined here — which is neither a pass nor a violation. On a pull request the body is always readable, and the same change there either carries its exemption or reds.",
        ],
      },
      unitEquivalent: {
        exit: 1,
        said: [
          "scn-subissue lint: 0 added, 0 updated, 0 deleted @SCN code(s); unit-equivalent: behaviour-bearing, cited [], UNCITED changed block(s): tests/thing.test.ts: the block that cites nothing > carries no scenario code; ticket handle: ABSENT; pull request body: readable",
          "scn-subissue lint: FAILED",
          "  [uncited-unit-equivalent] A behaviour-bearing unit-equivalent change is proven by test block(s) that cite no scenario: tests/thing.test.ts: the block that cites nothing > carries no scenario code. Another test in the same file citing an @SCN does not vouch for these — a cite belongs to the block it annotates. Carry the scenario's feature-prefixed @SCN-<FFF>-<NNN> id in the changed test's own describe/it string (or in an enclosing describe's).",
        ],
      },
      rowNotExaminedExit: 3,
      leftByTheEndingTheRowDeclares: true,
    });
  });
});
