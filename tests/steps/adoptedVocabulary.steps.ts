/**
 * Step definitions for the @SCN-VOC-014 arm of features/vocabulary-audit.feature — the
 * adopted-vocabulary tree-enforcement gate.
 *
 * ANTI-WATERMELON. This runs the REAL `pnpm lint:adopted-vocabulary` as a subprocess and
 * reads its actual outcome — never a re-run of the filter in isolation, which would prove
 * the predicate agrees with itself and say nothing about whether the GATE is wired. The
 * @unit arm (tests/checks/lintAdoptedVocabularyCli.test.ts) owns
 * the filter's judgement; this one owns the verdict.
 *
 * WHY PLANTED TREES. The adopted terms measure ZERO occurrences in this repository — that
 * is what lets the gate land green — so the redding arm is unreachable over the real tree
 * and a repository cannot keep a permanent real violation in-tree to point a passing test
 * at. The LNT trio use the same planted-fixture shape for the same reason. `--root` moves
 * the whole scan to another tree; it never narrows which surfaces are read, so the guard
 * under test here is the guard that runs in CI.
 *
 * Each planted tree is a real `git init` work tree, because the gate asks GIT what the
 * project is (@SCN-VOC-008) rather than walking the filesystem itself.
 *
 * @SCN-VOC-014 — bidirectional evidence marker.
 *
 * Parent: 3F-2370 (sub-issue 1 of 2 under 3F-2343).
 */

import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// @SCN-VOC-014
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** The outcome of one gate run over one planted tree. */
interface GateRun {
  exitCode: number;
  output: string;
}

/**
 * A term the vendored table marks `adopted` — the `demand` family, retired by 3F-2281.
 * Read as a plain string rather than derived, so the fixture states what it is exercising.
 */
const ADOPTED_TERM = "demand";

const plantedRoots: string[] = [];
let violatingRun: GateRun;
let cleanRun: GateRun;

/** Plant a real git work tree containing one source file with the given body. */
// @SCN-VOC-014
function plantTree(body: string): string {
  const root = mkdtempSync(path.join(tmpdir(), "spec-controller-voc014-"));
  plantedRoots.push(root);

  mkdirSync(path.join(root, "src"), { recursive: true });
  writeFileSync(path.join(root, "src/module.ts"), body);

  // The gate asks git what the project is, so the fixture must be a work tree. `add` alone
  // is enough — `git ls-files --cached --others` sees staged and untracked files both.
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["add", "-A"], { cwd: root });

  return root;
}

/** Run the REAL gate over a planted tree and capture its outcome. */
// @SCN-VOC-014
function runGate(root: string): GateRun {
  try {
    const output = execFileSync("pnpm", ["lint:adopted-vocabulary", "--root", root], {
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

// @SCN-VOC-014
Given("a tree whose canon table adopts a retired term", function () {
  // No fixture table — the gate reads the REAL vendored blockedVocabulary.md, so the arms
  // below exercise the adoption statuses this repository actually ships.
});

// @SCN-VOC-014
When(
  "the adopted-vocabulary gate runs over a copy of that tree carrying the term in an ordinary source file",
  function () {
    violatingRun = runGate(
      plantTree(`export const ${ADOPTED_TERM}Count = 1;\n`),
    );
  },
);

// @SCN-VOC-014
Then("the gate fails, naming the file, the line and the term", function () {
  assert.notEqual(
    violatingRun.exitCode,
    0,
    `expected the adopted-vocabulary gate to FAIL over a tree carrying the adopted term ` +
      `"${ADOPTED_TERM}"; it exited 0. A report that passes regardless is the non-check ` +
      `this scenario closes. Output:\n${violatingRun.output}`,
  );

  // A bare exit code sends the reader back to run the audit by hand — the manual step the
  // gate exists to remove — so the red must say WHERE.
  assert.match(
    violatingRun.output,
    /src\/module\.ts/,
    `expected the failure to name the offending FILE. Output:\n${violatingRun.output}`,
  );
  assert.match(
    violatingRun.output,
    new RegExp(ADOPTED_TERM),
    `expected the failure to name the offending TERM. Output:\n${violatingRun.output}`,
  );
});

// @SCN-VOC-014
When(
  "the adopted-vocabulary gate runs over a copy carrying no adopted term at all",
  function () {
    cleanRun = runGate(plantTree("export const evidenceObligationCount = 1;\n"));
  },
);

// @SCN-VOC-014
Then("the gate passes, reporting nothing to enforce", function () {
  assert.equal(
    cleanRun.exitCode,
    0,
    `expected the adopted-vocabulary gate to PASS over a tree carrying no adopted term; ` +
      `it exited ${cleanRun.exitCode}. A gate that reds on everything is as useless as ` +
      `one that reds on nothing. Output:\n${cleanRun.output}`,
  );
});

/**
 * A term from the canon row this repository still marks `deferred` — the bare shortening,
 * whose 774 occurrences 3F-1852 pays. The gate must leave it alone, and the tree really does
 * carry it, so the green below is discriminating rather than vacuous.
 *
 * THE EXEMPLAR MOVED WHEN ITS ROW WAS PAID (3F-2329). It was the retired evidence family
 * until that ticket ADOPTED the row — at which point this arm redded, correctly and loudly,
 * rather than quietly proving nothing. Re-pointing it at the row still deferred is the fix;
 * relaxing the assertion would have been the erosion.
 */
const DEFERRED_TERM = "guard";
/** The term in a NAME the audit greens through its RULED QUALIFIER, so nothing else flags. */
const DEFERRED_PLANT = "bothMissingGuard";

let deferredRun: GateRun;
let deferredControlRun: GateRun;

// @SCN-VOC-015
Given(
  "a canon table whose retired terms are split between an adopted row and a deferred one",
  function () {
    // The REAL vendored table, not a fixture: the split under test is the one this
    // repository actually ships, and the @unit arm pins WHICH row is the deferred one.
  },
);

// @SCN-VOC-015
When(
  "the adopted-vocabulary gate runs over a tree carrying the deferred row's term",
  function () {
    deferredRun = runGate(plantTree(`export const ${DEFERRED_PLANT} = 1;\n`));
    // The control, over the SAME shape of tree with the ADOPTED term instead. Without it a
    // green proves only that this fixture cannot red — the gate could be enforcing nothing
    // at all and the deferred arm would still pass.
    deferredControlRun = runGate(plantTree(`export const ${ADOPTED_TERM}Tier = 1;\n`));
  },
);

// @SCN-VOC-015
Then(
  "the gate passes, because a deferred row records debt rather than an enforced ban",
  function () {
    assert.equal(
      deferredRun.exitCode,
      0,
      `expected the gate to PASS over a tree carrying the DEFERRED term "${DEFERRED_TERM}"; ` +
        `it exited ${deferredRun.exitCode}. A deferred row is dated, ticketed debt — the ` +
        `unadopted row carries 774 occurrences here, so enforcing it would block main ` +
        `permanently. Output:\n${deferredRun.output}`,
    );
  },
);

// @SCN-VOC-015
Then("the adopted row's term would still have failed that same tree", function () {
  assert.notEqual(
    deferredControlRun.exitCode,
    0,
    `expected the ADOPTED term "${ADOPTED_TERM}" to still red an otherwise identical tree. ` +
      `Without this the green above is vacuous: a gate enforcing nothing whatsoever would ` +
      `pass the deferred arm too. Output:\n${deferredControlRun.output}`,
  );
});

// @SCN-VOC-014 @SCN-VOC-015
After(function () {
  for (const root of plantedRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});
