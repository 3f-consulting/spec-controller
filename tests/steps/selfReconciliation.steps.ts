/**
 * Step definitions for features/self-reconciliation.feature — the @integration arm of
 * @SCN-SLF-001, the self-reconciliation gate.
 *
 * ANTI-WATERMELON. This runs the REAL `pnpm lint:self-balance` guard as a subprocess and
 * reads its actual outcome — never a re-run of the reconciler in isolation, which would
 * prove the engine agrees with itself and say nothing about whether the GATE is wired.
 * The @unit arm (packages/spec-controller/static-checks/lintSelfBalanceCli.test.ts) owns
 * the scan scope and the self-citation; this one owns the verdict.
 *
 * WHY PLANTED TREES RATHER THAN THIS ONE. The gate reads a Cucumber report, and this
 * scenario IS a Cucumber run — a live report of itself does not exist while it executes.
 * So both arms run over trees planted in a temp dir: two complete miniature targets, one
 * whose evidence obligations are all observed and one naming a tier nothing observes. The
 * gate's `--root` moves the whole scan scope to a tree; it never narrows which surfaces
 * are read, so the guard under test here is the guard that runs in CI. The LNT trio use
 * the same planted-fixture shape and for the same reason: a repository cannot keep a
 * permanent real out-of-balance in-tree to point a passing test at.
 *
 * @SCN-SLF-001 — bidirectional evidence marker. Grepping SCN-SLF-001 returns the
 * scenario, this step block, and the @unit blocks in lintSelfBalanceCli.test.ts.
 *
 * Parent: 3F-2354 (sub-issue 1 of 1 under 3F-2351, the CI gate).
 */

import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// @SCN-SLF-001
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** The outcome of one guard run over one planted tree. */
interface GuardRun {
  exitCode: number;
  output: string;
}

const plantedRoots: string[] = [];
let balancedRun: GuardRun;
let outOfBalanceRun: GuardRun;

/**
 * Plant a complete miniature target: a feature NAMING `@unit`, a CI config and a
 * package manifest, and the two runtime report streams. `observed` decides whether the
 * Vitest report carries a test citing the scenario — i.e. whether the obligation
 * has anything to settle against.
 */
// @SCN-SLF-001
function plantTree(observed: boolean): string {
  const root = mkdtempSync(path.join(tmpdir(), "spec-controller-slf001-"));
  plantedRoots.push(root);

  mkdirSync(path.join(root, "features"), { recursive: true });
  mkdirSync(path.join(root, ".github/workflows"), { recursive: true });
  mkdirSync(path.join(root, "runs/self-balance"), { recursive: true });

  writeFileSync(
    path.join(root, "features/planted.feature"),
    [
      "@PLT",
      "Feature: a planted target",
      "",
      "  Rule: the planted rule",
      "",
      "    @unit @SCN-PLT-001",
      "    Scenario: the planted behaviour holds",
      "      Given a planted precondition",
      "      Then the planted outcome follows",
      "",
    ].join("\n"),
  );

  writeFileSync(path.join(root, ".github/workflows/ci.yml"), "name: CI\njobs: {}\n");
  writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "planted" }) + "\n");

  // The Vitest stream. When `observed` is false the suite ran and cited nothing, which is
  // the one-way evidence claim the gate exists to catch: a tier named, never observed.
  const assertionResults = observed
    ? [
        {
          fullName: "[SCN-PLT-001] the planted behaviour holds",
          title: "the planted behaviour holds",
          status: "passed",
        },
      ]
    : [];
  writeFileSync(
    path.join(root, "runs/self-balance/vitest.json"),
    JSON.stringify({
      testResults: [{ name: path.join(root, "planted.test.ts"), assertionResults }],
    }) + "\n",
  );

  writeFileSync(
    path.join(root, "runs/self-balance/cucumber.json"),
    JSON.stringify([]) + "\n",
  );

  return root;
}

/** Run the REAL guard over a planted tree and capture its outcome. */
// @SCN-SLF-001
function runGuard(root: string): GuardRun {
  try {
    const output = execFileSync("pnpm", ["lint:self-balance", "--root", root], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    return { exitCode: 0, output };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return {
      exitCode: typeof e.status === "number" ? e.status : 1,
      output: `${e.stdout ?? ""}${e.stderr ?? ""}`,
    };
  }
}

// @SCN-SLF-001
Given("the self-balance gate, wired over spec-controller's own source", function () {
  // No fixture for the gate itself — the subprocess below invokes the very package.json
  // script the CI step invokes, so a gate that is not actually wired cannot pass this.
});

// @SCN-SLF-001
When(
  "the gate reconciles a tree whose named evidence is all observed, and a tree naming evidence that nothing observes",
  function () {
    balancedRun = runGuard(plantTree(true));
    outOfBalanceRun = runGuard(plantTree(false));
  },
);

// @SCN-SLF-001
Then("the gate passes over the tree whose accounts agree", function () {
  assert.equal(
    balancedRun.exitCode,
    0,
    `expected the self-balance gate to PASS over a tree whose named evidence is all ` +
      `observed; it exited ${balancedRun.exitCode}. A gate that reds on everything is as ` +
      `useless as one that reds on nothing. Output:\n${balancedRun.output}`,
  );
});

// @SCN-SLF-001
Then(
  "the gate fails over the tree carrying an obligation nothing settles, naming that obligation",
  function () {
    assert.notEqual(
      outOfBalanceRun.exitCode,
      0,
      `expected the self-balance gate to FAIL over a tree naming evidence nothing ` +
        `observes; it exited 0. A report that passes regardless is a non-check — the ` +
        `whole defect this scenario closes. Output:\n${outOfBalanceRun.output}`,
    );

    assert.match(
      outOfBalanceRun.output,
      /SCN-PLT-001/,
      `expected the failure to NAME the unsettled obligation's scenario, so the red is ` +
        `actionable rather than a bare exit code. Output:\n${outOfBalanceRun.output}`,
    );
  },
);

// ---------------------------------------------------------------------------
// @SCN-SLF-002 — the CREDIT side of the same gate.
//
// @SCN-SLF-001 above plants trees with NO static check at all, so the gate has never
// been driven over the static axis. These steps plant trees that RUN one, differing in
// exactly one tag: the named arm carries `@lint=lint:foo`, the uncited arm does not. One
// tag apart is the point — the uncited tree's only out-of-balance item is the check, so
// a passing assertion attributes the red to it and to nothing else.
//
// `plantTree` above is deliberately NOT generalised to serve both. Its `jobs: {}` and
// name-only manifest are what keep SLF-001's trees clean on the static axis; putting a
// parameter between that scenario and its own fixture invites a later change made for
// SLF-002's benefit to weaken SLF-001's assertions silently.
// ---------------------------------------------------------------------------

/** The planted static check both arms run — a script name, not vocabulary. */
// @SCN-SLF-002
const PLANTED_CHECK = "lint:foo";

let uncitedCheckRun: GuardRun;
let namedCheckRun: GuardRun;

/**
 * Plant a tree that RUNS `lint:foo`. `named` decides whether a scenario names the check
 * via `@lint=` — i.e. whether the running check has an Evidence Obligation to be credited
 * against, or folds onto the suspense row citing no scenario.
 *
 * The planted scenario carries `@unit` and is observed in the Vitest stream on BOTH arms,
 * so the obligation side is settled either way and cannot contribute a second reason to
 * red. In the named arm its tag shape (`@unit @lint=… @SCN-…`) is the one SLF-001 itself
 * carries in this repository — a real self-citing check, not an arrangement invented here.
 */
// @SCN-SLF-002
function plantStaticCheckTree(named: boolean): string {
  const root = mkdtempSync(path.join(tmpdir(), "spec-controller-slf002-"));
  plantedRoots.push(root);

  mkdirSync(path.join(root, "features"), { recursive: true });
  mkdirSync(path.join(root, ".github/workflows"), { recursive: true });
  mkdirSync(path.join(root, "runs/self-balance"), { recursive: true });

  const tags = named ? `@unit @lint=${PLANTED_CHECK} @SCN-PLT-002` : "@unit @SCN-PLT-002";
  writeFileSync(
    path.join(root, "features/planted.feature"),
    [
      "@PLT",
      "Feature: a planted target that runs a static check",
      "",
      "  Rule: the planted rule",
      "",
      `    ${tags}`,
      "    Scenario: the planted behaviour holds",
      "      Given a planted precondition",
      "      Then the planted outcome follows",
      "",
    ].join("\n"),
  );

  // The manifest is where a static check is observed to EXIST.
  writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ name: "planted", scripts: { [PLANTED_CHECK]: "node -e \"\"" } }) + "\n",
  );

  // The CI config is where it is observed to FIRE — the surface that separates a check
  // that EXISTS from one that RUNS. Only a firing check raises the Evidence Observation
  // that can then cite no scenario, which is why this `run:` step is the whole of this
  // scenario's green: withhold it and the tree balances however uncited the script is.
  writeFileSync(
    path.join(root, ".github/workflows/ci.yml"),
    ["name: CI", "jobs:", "  ci:", "    steps:", `      - run: pnpm ${PLANTED_CHECK}`, ""].join("\n"),
  );

  writeFileSync(
    path.join(root, "runs/self-balance/vitest.json"),
    JSON.stringify({
      testResults: [
        {
          name: path.join(root, "planted.test.ts"),
          assertionResults: [
            {
              fullName: "[SCN-PLT-002] the planted behaviour holds",
              title: "the planted behaviour holds",
              status: "passed",
            },
          ],
        },
      ],
    }) + "\n",
  );

  writeFileSync(path.join(root, "runs/self-balance/cucumber.json"), JSON.stringify([]) + "\n");

  return root;
}

// @SCN-SLF-002
When(
  "the gate reconciles a tree running a static check no scenario names, and a tree naming the check it runs",
  function () {
    uncitedCheckRun = runGuard(plantStaticCheckTree(false));
    namedCheckRun = runGuard(plantStaticCheckTree(true));
  },
);

// @SCN-SLF-002
Then(
  "the gate fails over the tree whose static check nothing names, naming that check",
  function () {
    assert.notEqual(
      uncitedCheckRun.exitCode,
      0,
      `expected the self-balance gate to FAIL over a tree running a static check no ` +
        `scenario names; it exited 0. A quality check that can be added to a repository ` +
        `and run green while nothing names it is a check kept off the books — the whole ` +
        `defect this scenario closes. Output:\n${uncitedCheckRun.output}`,
    );

    assert.match(
      uncitedCheckRun.output,
      new RegExp(PLANTED_CHECK),
      `expected the failure to NAME the uncited check, so the red is actionable rather ` +
        `than a bare exit code. Output:\n${uncitedCheckRun.output}`,
    );
  },
);

// @SCN-SLF-002
Then("the gate passes over the tree whose static check is named", function () {
  assert.equal(
    namedCheckRun.exitCode,
    0,
    `expected the self-balance gate to PASS over a tree whose static check a scenario ` +
      `names via @lint= — the same tree as the red arm but for that one tag. A gate that ` +
      `reds on everything is as useless as one that reds on nothing. ` +
      `Output:\n${namedCheckRun.output}`,
  );
});

// @SCN-SLF-001
After(function () {
  for (const root of plantedRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});
