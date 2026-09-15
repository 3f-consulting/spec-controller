/**
 * Step definitions for features/self-reconciliation.feature (the @SLF feature).
 *
 * @SCN-SLF-008 — the bidirectional @integration evidence marker (Evidence Manifesto §9).
 *
 * WHY THIS ARM SPAWNS THE REAL BINARY RATHER THAN CALLING checkUnknownFlags. The claim is about
 * what a consumer SEES when their pin is behind their tree: the message, the stream it lands on,
 * and the exit status, together. A unit call would prove the string builder agrees with itself
 * and would say nothing about whether the caller still routes it to stderr, or still exits 2 —
 * which is precisely the half that must not move.
 *
 * AND IT SPAWNS THE WORKSPACE CLI BY PATH, as every other CLI arm in this corpus does. 3F-3105
 * later pins this repository to a published spec-controller; that pin moves what `pnpm
 * spec-controller` resolves to, and this arm must keep asserting the behaviour of the source
 * under change rather than of whatever version happens to be pinned.
 *
 * THE VERSION IS READ FROM THE PACKAGE MANIFEST, NOT HARD-CODED — a hard-coded version would red
 * on the next bump for a reason that has nothing to do with this behaviour. The teeth are that
 * the refusal must CONTAIN that version: a builder that forgets to interpolate it produces a
 * message without the string and reds here.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { readFileSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path, { join } from "node:path";
import { createRequire } from "node:module";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

/**
 * A flag THIS version's registry does not name — the shape any version skew produces, whichever
 * direction it runs in. `--fitness` is a real retired flag rather than an invented one: it was the
 * measured skew case on 3F-3105 when the pinned reader was behind the tree, and the @fitness
 * collapse then retired it, so today's tree is the side that does not accept it. Either way the
 * reader meets argv its own registry cannot bound, which is the one code path under test.
 *
 * Deliberately NOT `--ci-steps`: this tree ACCEPTS that flag, so it never reaches the refusal at
 * all — it falls through to the input-existence check, which is a different message entirely.
 */
const FLAG_THIS_VERSION_REFUSES = "--fitness";

let slf008Version = "";
let slf008Result: SpawnSyncReturns<string> | undefined;

// @SCN-SLF-008
Given(
  "a consumer runs a spec-controller pinned to a version that does not match the tree it is reading",
  function () {
    const manifest = join(
      process.cwd(),
      "packages",
      "spec-controller",
      "package.json",
    ) ;
    const pkg = JSON.parse(readFileSync(manifest, "utf8")) as { version?: unknown };
    assert.equal(
      typeof pkg.version,
      "string",
      "the spec-controller package manifest must carry a version for the refusal to name",
    );
    slf008Version = pkg.version as string;
    assert.notEqual(
      slf008Version,
      "",
      "an empty version would make the refusal's version claim vacuous",
    );
  },
);

// @SCN-SLF-008
When("that reader is handed a flag its own version does not accept", function () {
  const repoRoot = process.cwd();
  slf008Result = spawnSync(
    NODE,
    [
      ...SPEC_CONTROLLER_ARGV,
      "balance",
      "--features",
      "features",
      FLAG_THIS_VERSION_REFUSES,
      "a-report.json",
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.equal(slf008Result.error, undefined, "the CLI failed to spawn at all");
});

// @SCN-SLF-008
Then(
  "the refusal names the version that refused it, the flag, and the bump that cures it",
  function () {
    assert.ok(slf008Result !== undefined, "no run was made");
    const stderr = slf008Result.stderr;

    // THE REFUSAL GOES TO stderr, NOT stdout. stdout is where a verdict goes; a consumer piping
    // the report must not find a usage refusal inside it.
    assert.equal(
      slf008Result.stdout,
      "",
      "a refusal must not be written to stdout, where the reconciliation report goes",
    );

    // The flag — which the message already named before this scenario, and must keep naming.
    assert.ok(
      stderr.includes(FLAG_THIS_VERSION_REFUSES),
      `the refusal must name the flag it refused; got: ${stderr}`,
    );

    // The version doing the refusing — this is what makes skew legible from the log alone.
    assert.ok(
      stderr.includes(slf008Version),
      `the refusal must name the version that refused (${slf008Version}); got: ${stderr}`,
    );

    // The cure. A reader who can tell skew from a typo still has to be told what to do about it.
    assert.match(
      stderr,
      /bump the pin/i,
      `the refusal must name the bump as the cure; got: ${stderr}`,
    );
  },
);

// @SCN-SLF-008
Then("the run exits with the usage status, not a reconciliation verdict", function () {
  assert.ok(slf008Result !== undefined, "no run was made");
  // EXIT 2 AND NOT 1, DELIBERATELY. 1 is out-of-balance — a verdict about the target's books. An
  // argv the reader cannot read produced no verdict at all, and reporting one would be a lie. 2
  // is the usage status in the enumerated taxonomy (0 balanced / 1 out-of-balance / 2 usage / 3
  // pending-under-strict / 4 unsound / 5 nothing to reconcile), and it stays 2 because a genuine
  // typo is still a usage fault: naming the skew must not cost every adopter the ordinary reading.
  assert.equal(
    slf008Result.status,
    2,
    `expected the usage status 2, got ${String(slf008Result.status)}`,
  );
});

/* ---------------------------------------------------------------------------------------------
 * @SCN-SLF-009 — the pin, and the reader that actually reaches the verdict.
 *
 * THE TWO ARMS ASK DIFFERENT QUESTIONS AND NEITHER IS SUFFICIENT. The `@unit` arm
 * (tests/checks/bootstrapPin.test.ts) reads the MANIFEST and proves the declaration is one exact
 * published version. This arm reads the reader's OWN PROVENANCE and proves the binary that ran is
 * that version rather than this checkout — because a manifest can be exact while `pnpm
 * spec-controller` still resolves the workspace copy, which is precisely the state this slice found
 * the repository in.
 *
 * THE DISCRIMINATOR IS THE RESOLVED PATH, AND IT IS NOT THE ONE 3F-3105 EXPECTED. The parent's
 * acceptance says the pinned reader proves itself by reporting its tool SHA as "not a git checkout".
 * When this arm was written it did not: `resolveToolSha` ran `git -C <toolDir> rev-parse HEAD`, and
 * an installed package lives under the CONSUMER's `node_modules`, which is inside the consumer's
 * git worktree — so git walked up, answered with the CONSUMER's commit, and provenance reported it
 * as the TOOL's SHA. Both readers carried the same version and both reported this repository's
 * HEAD, so the report could not tell them apart and an arm asserting "not a git checkout" would
 * have been asserting something false. This arm therefore used the discriminator that actually
 * discriminated: WHERE the reader resolved from.
 *
 * THAT DEFECT IS FIXED, PUBLISHED AND PINNED, SO THE SENTENCE ABOVE IS HISTORY RATHER THAN A
 * STANDING FACT. 3F-3418 landed the guard — a tool resolved out of a `node_modules` tree has no
 * checkout of itself whatever repository it sits inside — and 0.1.0-alpha.3 was promoted and pinned
 * on 2026-09-15. The two readers ARE now distinguishable by the report: the pinned one says
 * "unknown (not a git checkout)" and one run from this tree says this repository's HEAD.
 *
 * THE ARM HAS NOT MOVED WITH IT, DELIBERATELY. Changing what this scenario asserts is a scenario
 * touch and it discharges 3F-3105's acceptance item 1 by its originally stated evidence, so it
 * belongs to 3F-3420 rather than to the release mechanics that bumped the pin. Until then the
 * resolved path stands and is still true: undo the pin and the resolution moves to
 * `packages/spec-controller`, which is the whole of what this scenario claims.
 * ------------------------------------------------------------------------------------------- */

/**
 * Where the pinned reader resolves from — asked of Node, and asked in ONE place.
 *
 * Two arms need this answer: @SCN-SLF-009 asserts on the path itself, and @SCN-SLF-007 plants a
 * defect in the core that reader loads. A second spelling would agree with this one by diligence
 * and then drift, and the drift would present as a plant landing in an artefact nothing resolves.
 */
function pinnedReaderManifest(): string {
  return createRequire(join(process.cwd(), "package.json")).resolve("spec-controller/package.json");
}

/** Where a resolved package lives, and where this repository's own source does not. */
const INSTALLED = `${path.sep}node_modules${path.sep}`;
const OWN_SOURCE = `packages${path.sep}spec-controller${path.sep}`;

let slf009Declared: string | undefined;
let slf009Provenance = "";

// @SCN-SLF-009
Given("this repository declares the spec-controller it reconciles itself with", function () {
  const manifest = JSON.parse(
    readFileSync(join(process.cwd(), "package.json"), "utf8"),
  ) as { devDependencies?: Record<string, string> };
  slf009Declared = manifest.devDependencies?.["spec-controller"];
  assert.ok(
    slf009Declared !== undefined,
    "the root manifest must declare spec-controller — it is the reader that reaches this repository's verdict",
  );
});

// @SCN-SLF-009
When("the declaration is read", function () {
  // THE RESOLVED BINARY IS RUN, NOT THE ONE THE MANIFEST NAMES. `pnpm spec-controller` is exactly
  // what ci.yml's two steps invoke, so this arm exercises the resolution path CI uses rather than a
  // re-derivation of it. `--help` needs no evidence and no corpus, so the provenance it is asked
  // for is the cheapest honest observation of WHICH reader answered.
  const run = spawnSync(
    "pnpm",
    ["--silent", "spec-controller", "balance", "--features", "features", "--target", "pin-probe"],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.equal(run.error, undefined, "the pinned reconciler failed to spawn at all");
  slf009Provenance = run.stdout + run.stderr;
});

// @SCN-SLF-009
Then(
  "it names one exact published version, and a range, a dist-tag or a wildcard each red",
  function () {
    assert.match(
      slf009Declared ?? "",
      /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/,
      `spec-controller is pinned to "${String(slf009Declared)}", which is not one exact published version`,
    );
    for (const floating of ["^1.0.0", "~1.0.0", "1.x", "*", "latest", "alpha", "workspace:*"]) {
      assert.ok(
        !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(floating),
        `${floating} must not read as an exact pin`,
      );
    }
  },
);

// @SCN-SLF-009
Then(
  "the reader that reaches the verdict resolves from the installed package, not from this repository's own source",
  function () {
    assert.match(
      slf009Provenance,
      new RegExp(`Tool version: ${(slf009Declared ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
      `the reader that answered does not report itself as the pinned version ${String(slf009Declared)}`,
    );

    // WHERE `spec-controller` RESOLVES FROM IS THE CLAIM. Not a re-reading of the manifest: this
    // asks Node the same question `pnpm spec-controller` asks when ci.yml invokes it, and the
    // answer moves to `packages/spec-controller/src` the moment the pin is undone.
    const resolved = pinnedReaderManifest();
    assert.ok(
      resolved.includes(INSTALLED),
      `the reconciler resolves from ${resolved}, which is not an installed package — the pin is declared but not in force`,
    );
    assert.ok(
      !resolved.includes(OWN_SOURCE),
      `the reconciler resolves from this repository's own source (${resolved}), which is the arrangement 3F-3105 ends`,
    );
  },
);

/* ---------------------------------------------------------------------------------------------
 * @SCN-SLF-007 — the slice's whole claim, made mechanical.
 *
 * WHY THE PLANT IS REAL AND IN PLACE RATHER THAN IN A COPY. The claim is about the arrangement THIS
 * repository actually runs: the binary `pnpm spec-controller` resolves, reading the files it
 * actually reads. A copied tree would be a re-implementation of that arrangement, and a
 * re-implementation can only measure itself. Both plants are restored in a `finally` and the restore
 * is verified by hash, because a plant left behind silently poisons every arm after it.
 *
 * AND WHY THE PLANTED DEFECT IS SWITCHED ON PER PROCESS RATHER THAN FOR EVERY READER ALIVE
 * (3F-3421). In place means in a file every other scenario's reader loads too. `restored in a
 * finally` bounds the plant in TIME, not in AUDIENCE: for the ~900ms the two source plants are
 * live, any reader another scenario spawns off `packages/` loads the planted predicate and returns
 * the planted verdict. Measured, not reasoned — five reproductions under `--parallel 4` each left
 * five to eight scenarios of `uncited-static-checks.feature` reading exit 0 over a fixture that is
 * out of balance, and the predicate their process had loaded, printed from the running module, was
 * this plant's: `length === 0` replaced by the always-true edit. The serial runner hid it by
 * leaving no other reader alive at the same time as the plant.
 *
 * SO THE PLANTED LINE IS INERT UNLESS THE PROCESS READING IT WAS SPAWNED BY THIS SCENARIO, which
 * `slf007Run` says by putting `SLF007_SWITCH` in the environment of every reader it spawns — the
 * clean runs included, so the ONLY difference between a clean observation and a planted one stays
 * the file's content. Nothing in the product reads that name, so the switch is inert in every
 * process but one carrying a planted file.
 *
 * THE TEETH ARE UNCHANGED, WHICH IS THE POINT OF PUTTING THE SWITCH ON THE OBSERVER RATHER THAN ON
 * THE FIXTURE. Both observations below run WITH the switch set, so a gate that had resolved this
 * repository's own source would load the planted predicate and its verdict would move — which is
 * the assertion. The plant is weaker only for a process that was never part of this scenario, and
 * that process is exactly the bystander it must not reach. It also makes a LEAKED plant survivable:
 * a crash between write and restore no longer silently rebalances every run on the machine.
 *
 * THE CONTROL IS THE POINT, NOT A FORMALITY. "The gate's verdict did not move" is exactly what a
 * plant that reached nothing also produces. So the same edit is first put to a reader run FROM that
 * source and must move its verdict; only then does the gate's silence mean the gate is not reading
 * that source.
 * ------------------------------------------------------------------------------------------- */

/** The fixture whose reconciliation is out-of-balance, so a flip to balanced is unmistakable. */
const SLF007_FIXTURE = "tests/fixtures/evidence-observation";

/** The verdict predicate in this repository's own source. */
const SLF007_SOURCE = join("packages", "core", "src", "domain", "ledger.ts");

/**
 * The same predicate inside the core the PINNED reader loads — RESOLVED, never spelled.
 *
 * THE VERSION IS NOT TYPED HERE, AND THAT IS THE WHOLE OF THE CHANGE. This was written out in
 * full — `node_modules/.pnpm/spec-controller@<version>/node_modules/@3f-consulting/…` — which made
 * it a SECOND statement of the pin, in a second file, kept true only by whoever bumped the first
 * one remembering this one existed. `dry`'s "a rule stated twice is a rule obeyed in its laxest
 * form", and the laxest form of a path is one that points somewhere real and wrong.
 *
 * IT IS ASKED OF NODE INSTEAD, FROM THE PINNED READER'S OWN CONTEXT. Resolving the core barrel from
 * THIS repository would answer `packages/core` — the workspace link, the arrangement 3F-3105 ends —
 * so the question is put to the CLI's own require context, which is by construction the module that
 * CLI loads. It also knows nothing about pnpm's store layout, so a change of package manager moves
 * it without an edit.
 *
 * AND THE STALE LITERAL WOULD NOT HAVE FAILED THE WAY IT LOOKED LIKE IT WOULD. On CI's cold install
 * only the pinned version exists, so the old path would ENOENT — loud, if worded as a missing file
 * rather than a stale pin. On a developer's WARM store the PREVIOUS version's directory is still
 * there, so the same line finds a file, plants the defect in an artefact nothing resolves any more,
 * and reds on the arm below instead. Two different reds, neither naming the cause; measured at the
 * 0.1.0-alpha.3 bump, where both directories sat side by side.
 */
function slf007Artefact(): string {
  const coreBarrel = createRequire(pinnedReaderManifest()).resolve(
    "@3f-consulting/spec-controller-core",
  );
  return join(path.dirname(coreBarrel), "domain", "ledger.js");
}

/**
 * The name whose presence in a reader's environment arms the planted line below. Nothing in the
 * product reads it; it exists so a planted file changes the verdict of the readers THIS scenario
 * spawned and of no other process on the machine (3F-3421).
 */
const SLF007_SWITCH = "SPEC_CONTROLLER_SLF007_PLANT";

/**
 * The edit: make every row read as balanced, whatever it carries — for a reader this scenario
 * spawned.
 *
 * THE UNSWITCHED HALF IS THE SOUND PREDICATE, CHARACTER FOR CHARACTER, and that is what makes a
 * bystander's behaviour identical rather than merely similar: with the switch absent the `||`
 * falls through to the line that was already there, so a reader another scenario spawned during
 * the window evaluates exactly the code it would have evaluated with no plant at all.
 */
const SLF007_SOUND = "(row) => row.reconcilingItems.length === 0";
const SLF007_DEFECT =
  `(row) => process.env[${JSON.stringify(SLF007_SWITCH)}] !== undefined || ` +
  "row.reconcilingItems.length === 0";

let slf007GateClean = -1;
let slf007SourceClean = -1;
let slf007SourcePlanted = -1;
let slf007GateWithSourcePlanted = -1;
let slf007GateWithArtefactPlanted = -1;

/** Run a reader over the fixture and return only its exit status — the verdict the gate acts on. */
function slf007Run(argv: readonly string[]): number {
  const f = SLF007_FIXTURE;
  const run = spawnSync(
    argv[0]!,
    [
      ...argv.slice(1),
      "balance",
      "--features", `${f}/features`,
      "--vitest", `${f}/vitest.json`,
      "--cucumber", `${f}/cucumber.json`,
      "--target", "slf-007-plant",
    ],
    // The switch rides on EVERY reader this scenario spawns, planted or clean, so the file's
    // content stays the single difference between the two observations (3F-3421). It names
    // nothing the product reads, so the gate is still exactly the command ci.yml invokes.
    { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, [SLF007_SWITCH]: "1" } },
  );
  assert.equal(run.error, undefined, `reader failed to spawn: ${String(run.error)}`);
  assert.ok(typeof run.status === "number", "reader produced no exit status");
  return run.status;
}

/** The gate: exactly what ci.yml invokes. */
const slf007Gate = (): number => slf007Run(["pnpm", "--silent", "spec-controller"]);
/**
 * A reader run from this repository's own source.
 *
 * THE ONE SPAWN 3F-3424 LEFT ON `tsx`, AND IT HAS TO BE. Every other spec-controller spawn in this
 * suite now runs `node packages/spec-controller/dist/cli.js` (tests/steps/support/builtCli.ts).
 * This one cannot: the scenario plants a defect into `packages/core/src/domain/ledger.ts` and this
 * reader's whole job is to SEE it — "a reader run from that source changes its verdict, so the
 * defect is known to be live". A built reader would read a `dist` compiled before the plant, report
 * no change, and the control would be unable to move. An arm that cannot move is not a control, and
 * a defect nobody read and a defect nobody compiled produce the same silence.
 */
const slf007FromSource = (): number =>
  slf007Run([join("node_modules", ".bin", "tsx"), join("packages", "spec-controller", "src", "cli.ts")]);

/** Plant the defect in `file`, run `observe`, and restore — verifying the restore by hash. */
function slf007WithDefectIn(file: string, observe: () => number): number {
  const before = readFileSync(file, "utf8");
  // THE TIMESTAMPS ARE PART OF WHAT IS RESTORED (3F-3424). The content restore below is
  // hash-verified, so the file that comes back is byte-for-byte the one that was there — but a
  // write moves mtime, and after 3F-3424 this suite has a reader of that mtime: the built-CLI
  // freshness guard refuses a run whose `packages/*/src` is newer than its `dist`. Left alone,
  // this plant would hand the NEXT `pnpm cucumber` a source tree stamped after the build it is
  // about to spawn, and the guard would red on a file whose content never changed. A restore that
  // leaves the file looking edited has not restored it.
  const beforeTimes = statSync(file);
  assert.equal(
    (before.match(new RegExp(SLF007_SOUND.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length,
    1,
    `${file} no longer carries the verdict predicate this plant edits — the plant would be inert`,
  );
  try {
    writeFileSync(file, before.replace(SLF007_SOUND, SLF007_DEFECT));
    return observe();
  } finally {
    writeFileSync(file, before);
    assert.equal(
      createHash("sha256").update(readFileSync(file)).digest("hex"),
      createHash("sha256").update(before).digest("hex"),
      `${file} was NOT restored after the plant — every arm after this one is now unsound`,
    );
    utimesSync(file, beforeTimes.atime, beforeTimes.mtime);
  }
}

// @SCN-SLF-007
Given("a fixture corpus whose reconciliation the gate reports out-of-balance", function () {
  slf007GateClean = slf007Gate();
  slf007SourceClean = slf007FromSource();
  assert.equal(slf007GateClean, 1, "the fixture must start out-of-balance for a flip to be visible");
  assert.equal(slf007SourceClean, 1, "both readers must agree on the clean fixture, or they are not comparable");
});

// @SCN-SLF-007
When("the verdict function in this repository's own source is made to always balance", function () {
  slf007SourcePlanted = slf007WithDefectIn(SLF007_SOURCE, slf007FromSource);
  slf007GateWithSourcePlanted = slf007WithDefectIn(SLF007_SOURCE, slf007Gate);
});

// @SCN-SLF-007
Then(
  "a reader run from that source changes its verdict, so the defect is known to be live",
  function () {
    assert.notEqual(
      slf007SourcePlanted,
      slf007SourceClean,
      "the plant did not move the verdict of a reader that READS the planted file, so it is inert — " +
        "and an inert plant makes the next assertion meaningless",
    );
    assert.equal(slf007SourcePlanted, 0, "the planted predicate should report everything balanced");
  },
);

// @SCN-SLF-007
Then("the gate's own verdict does not move", function () {
  assert.equal(
    slf007GateWithSourcePlanted,
    slf007GateClean,
    "a defect planted in this repository's own source MOVED the gate's verdict — the arbiter is still " +
      "the code under change, which is the whole arrangement 3F-3105 exists to end",
  );
});

// @SCN-SLF-007
Then("the same defect planted in the resolved artefact does move the gate's verdict", function () {
  slf007GateWithArtefactPlanted = slf007WithDefectIn(slf007Artefact(), slf007Gate);
  assert.notEqual(
    slf007GateWithArtefactPlanted,
    slf007GateClean,
    "planting the defect in the RESOLVED ARTEFACT left the gate's verdict unchanged, so this arm " +
      "proves nothing about where the verdict comes from — the instrument has no teeth",
  );
  assert.equal(slf007GateWithArtefactPlanted, 0, "the planted artefact should report everything balanced");
});
