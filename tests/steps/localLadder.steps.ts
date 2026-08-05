/**
 * Step definitions for features/local-ladder.feature (the @LAD derived local ladder).
 *
 * @SCN-LAD-001 — the bidirectional @integration evidence marker (Evidence Manifesto §9).
 *
 * WHY THIS ARM PLANTS A TREE. The @unit arm injects two source strings; this one writes a
 * real CI config and a real package manifest to disk and derives the ladder from what it
 * reads back, so the YAML parse, the file encoding and the manifest shape are exercised
 * rather than assumed. Planting rather than pointing at this repository's own ci.yml is
 * deliberate: the real tree's ladder is @SCN-LAD-006's subject, and a scenario that asserted
 * a fixed order over a file other slices edit would red on unrelated work.
 *
 * THE DECISION IS IMPORTED, NEVER RE-IMPLEMENTED. This arm calls the same exported function
 * the CLI calls, so it cannot agree with the derivation by coincidence and then drift the
 * moment either side changes.
 *
 * Parent: @SCN-LAD-001 (3F-2448) — the derived local ladder.
 */

import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CI_ONLY_EXCLUSIONS,
  deriveLocalLadder,
} from "../../packages/spec-controller/static-checks/localLadder.js";
import type { LocalLadder } from "../../packages/spec-controller/static-checks/localLadder.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// @SCN-LAD-001
/** The scripts the planted CI config runs, in the order it runs them. */
const PLANTED_ORDER = ["lint:third", "typecheck", "lint:first"] as const;

/** The one step this repository runs in CI and does not gate locally. */
const EXCLUDED_SCRIPT = "lint:scn-subissues";

const plantedRoots: string[] = [];
let plantedRoot: string;
let ladder: LocalLadder;

/** Plant a miniature target: a CI workflow and a package manifest, both real files. */
function plant(commands: readonly string[], scripts: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), "local-ladder-"));
  plantedRoots.push(root);
  mkdirSync(path.join(root, ".github", "workflows"), { recursive: true });
  writeFileSync(
    path.join(root, ".github", "workflows", "ci.yml"),
    ["name: CI", "jobs:", "  ci:", "    steps:", ...commands.map((c) => `      - run: ${c}`)].join(
      "\n",
    ),
    "utf8",
  );
  writeFileSync(path.join(root, "package.json"), JSON.stringify({ scripts }, null, 2), "utf8");
  return root;
}

After(function () {
  for (const root of plantedRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

Given(
  "a CI config whose steps invoke three package.json scripts in a fixed order",
  function () {
    plantedRoot = plant(
      PLANTED_ORDER.map((script) => `pnpm ${script}`),
      {
        "lint:first": "tsx first.ts",
        typecheck: "tsc --noEmit",
        "lint:third": "tsx third.ts",
        // Present in the manifest, absent from CI — the manifest is not the source.
        "lint:unrun": "tsx unrun.ts",
      },
    );
  },
);

When("the local ladder is derived from it", function () {
  ladder = deriveLocalLadder(
    readFileSync(path.join(plantedRoot, ".github", "workflows", "ci.yml"), "utf8"),
    JSON.parse(readFileSync(path.join(plantedRoot, "package.json"), "utf8")),
    [],
  );
});

Then("the ladder gates exactly those three scripts, in the CI config's order", function () {
  assert.deepEqual(
    ladder.gates.map((gate) => gate.script),
    [...PLANTED_ORDER],
    "the ladder must be the CI config's script steps, in the CI config's order",
  );
});

// @SCN-LAD-004
/**
 * THIS ARM RUNS THE REAL EMITTER, not the decision. `pnpm ladder` is what `scripts/verify.sh`
 * consumes, so what matters here is that the omission reaches a human through the script's
 * own output — a reason held only in a returned object would satisfy the @unit arm and still
 * leave the gap unexplained where anybody would look for it.
 */
interface EmitterRun {
  exitCode: number;
  stdout: string;
  stderr: string;
}

let emitterRun: EmitterRun;

/**
 * Run `pnpm ladder` over a planted root, capturing both streams and the exit code.
 *
 * spawnSync, not execFileSync: the latter returns stdout and hands back stderr only when the
 * command FAILS, so a passing run's omission notice would read as an empty string and this
 * arm would assert nothing on the successful path — the one it exists to check.
 */
function runEmitter(root: string): EmitterRun {
  const run = spawnSync("pnpm", ["--silent", "ladder", "--root", root], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return {
    exitCode: run.status ?? 1,
    stdout: run.stdout ?? "",
    stderr: run.stderr ?? "",
  };
}

Given(
  "a CI config running a step this repository excludes from the local ladder",
  function () {
    // The real exclusion, run by the planted CI — so the entry is satisfied rather than
    // stale, and this scenario says nothing about staleness (that is @SCN-LAD-005's).
    plantedRoot = plant(
      ["pnpm typecheck", `pnpm ${EXCLUDED_SCRIPT}`, "pnpm lint:alpha"],
      {
        typecheck: "tsc --noEmit",
        [EXCLUDED_SCRIPT]: "tsx lintScnSubIssuesCli.ts",
        "lint:alpha": "tsx alpha.ts",
      },
    );
  },
);

When("the local ladder is built over it", function () {
  emitterRun = runEmitter(plantedRoot);
});

Then("the excluded step is not a gate", function () {
  assert.equal(emitterRun.exitCode, 0, `the emitter must succeed. Output:\n${emitterRun.stderr}`);
  const gated = emitterRun.stdout
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => line.split("\t")[0]);

  assert.deepEqual(
    gated,
    ["typecheck", "lint:alpha"],
    `${EXCLUDED_SCRIPT} must not be gated locally, and the gates around it must survive`,
  );
});

Then("the ladder names it, with the reason it cannot run locally", function () {
  const reason = CI_ONLY_EXCLUSIONS.find((e) => e.script === EXCLUDED_SCRIPT)?.reason ?? "";
  assert.ok(reason !== "", `${EXCLUDED_SCRIPT} must carry a reason`);
  assert.ok(
    emitterRun.stderr.includes(EXCLUDED_SCRIPT) && emitterRun.stderr.includes(reason),
    `the emitter must name the omission AND its reason. It said:\n${emitterRun.stderr}`,
  );
});

// @SCN-LAD-005
Given("a CI config that no longer runs the step the exclusion excuses", function () {
  // The planted CI runs real gates and NOT the excluded step — the shape a workflow takes
  // the day someone removes a CI step and leaves its exclusion behind. This repository's
  // own exclusion entry is what is being judged; nothing about the entry is planted.
  plantedRoot = plant(["pnpm typecheck", "pnpm lint:alpha"], {
    typecheck: "tsc --noEmit",
    "lint:alpha": "tsx alpha.ts",
    // The excused script still EXISTS in the manifest; only the CI step is gone. That is
    // the case a "does the script exist?" check would miss.
    [EXCLUDED_SCRIPT]: "tsx lintScnSubIssuesCli.ts",
  });
});

Then("the ladder reds, naming the stale entry", function () {
  // TEETH, NOT A COMPLAINT. A check that printed this and exited 0 would leave `pnpm verify`
  // green over a narrowed ladder — the exact watermelon shape. Asserted first, so a
  // zero-exit emitter cannot be rescued by the message assertion below.
  assert.notEqual(
    emitterRun.exitCode,
    0,
    `a stale exclusion must RED the ladder, not warn about it. It exited 0 with:\n` +
      `${emitterRun.stderr}`,
  );
  assert.ok(
    emitterRun.stderr.includes(EXCLUDED_SCRIPT),
    `the red must name the stale entry. It said:\n${emitterRun.stderr}`,
  );
  assert.equal(
    emitterRun.stdout.trim(),
    "",
    "a ladder that cannot be trusted emits no gates — running a subset is what this stops",
  );
});

// @SCN-LAD-006
/**
 * THE SCENARIO THAT CLOSES 3F-2444, and the only one that speaks about THIS repository.
 *
 * It asserts against `scripts/verify.sh --list` rather than against the emitter, because the
 * claim is that the GREEN-CHECK consumes the derivation. Reading the script to satisfy
 * yourself of that is exactly the move 3F-2444 exists to stop: the previous ladder was
 * verified by reading too, and it had been a proper subset of CI for four commits.
 *
 * The full `pnpm verify` is deliberately not run here — it would re-enter Cucumber, inside
 * Cucumber. The listing mode makes the assertion cheap and terminating, and answers a
 * question a human has of a green-check anyway: what are you about to run?
 */
let listing: EmitterRun;

Given("the real spec-controller repository", function () {
  // No plant. The subject is the tree this test is running in.
  assert.ok(
    readFileSync(path.join(repoRoot, ".github", "workflows", "ci.yml"), "utf8").length > 0,
    "the real CI workflow must be readable for this scenario to mean anything",
  );
});

When("the local green-check lists the ladder it would run", function () {
  listing = ((): EmitterRun => {
    // THE TIMEOUT IS PART OF THE ASSERTION. Listing must not RUN the ladder: doing so from
    // here would re-enter Cucumber from inside Cucumber and hang rather than fail, and a
    // scenario that hangs reports nothing at all. Sixty seconds is far longer than printing
    // thirteen lines can take and far shorter than running them.
    const run = spawnSync("bash", ["scripts/verify.sh", "--list"], {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 60_000,
    });
    return { exitCode: run.status ?? 1, stdout: run.stdout ?? "", stderr: run.stderr ?? "" };
  })();
});

Then(
  "it lists every script the real CI runs but the one excluded step, in CI's order",
  function () {
    assert.equal(listing.exitCode, 0, `--list must succeed. It said:\n${listing.stderr}`);

    const expected = deriveLocalLadder(
      readFileSync(path.join(repoRoot, ".github", "workflows", "ci.yml"), "utf8"),
      JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8")),
      CI_ONLY_EXCLUSIONS,
    ).gates.map((gate) => gate.script);

    // VACUITY FLOOR. Both sides of the comparison below are computed, so two empty lists
    // would agree perfectly and prove nothing. The real ci.yml runs 14 script steps and one
    // is excluded; anything else means the workflow changed and this scenario is the place
    // that should say so.
    assert.equal(
      expected.length,
      13,
      `the real ci.yml must yield 13 local gates; it yielded ${expected.length}: ${expected.join(", ")}`,
    );

    assert.deepEqual(listedGates(listing.stdout), expected, "--list must be the derived ladder");
  },
);

Then("lint:anemic-domain is one of them", function () {
  // The gate 3F-2444 was filed for. Named explicitly rather than left to the equality above,
  // so the ticket's first acceptance line has an assertion of its own to point at.
  assert.ok(
    listedGates(listing.stdout).includes("lint:anemic-domain"),
    `lint:anemic-domain must be gated locally. The ladder was:\n${listing.stdout}`,
  );
});

Then("the count it reports is the number of gates it listed", function () {
  const stated = /all (\d+) local gates/.exec(listing.stdout)?.[1];
  assert.ok(stated !== undefined, `the closing line must state a count. It said:\n${listing.stdout}`);
  assert.equal(
    Number(stated),
    listedGates(listing.stdout).length,
    "the stated count must be the length of the ladder, not a number anyone maintains",
  );
});

/** The gate names in a `--list` run's output — the lines it marks as gates. */
function listedGates(stdout: string): string[] {
  return stdout
    .split("\n")
    .filter((line) => line.startsWith("gate "))
    .map((line) => line.slice("gate ".length).trim());
}
