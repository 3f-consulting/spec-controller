/**
 * Step definitions for features/release.feature (the @REL release artefact).
 *
 * @SCN-REL-001 — the bidirectional @integration evidence marker (Evidence Manifesto §9).
 *
 * WHY THIS ARM PACKS AND INSTALLS FOR REAL. The @unit arm next door asserts the RECIPE: which
 * tarball each package becomes, what is run where, and what the two outcomes mean. It cannot say
 * whether the artefact those commands produce actually works, and that is the only question this
 * scenario exists to answer — every gate in this repository resolves through the workspace
 * `exports` map, and npm REPLACES that map at publish time rather than merging it. The two
 * readings differ nowhere except inside an installed tarball, so an installed tarball is what this
 * arm builds.
 *
 * THE TARBALLS ARE PACKED ONCE AND READ MORE THAN ONCE. `pnpm pack` performs the whole manifest
 * transformation a publish would — `workspace:*` resolved to a concrete version, `publishConfig`
 * applied wholesale — so the files installed below are byte-for-byte what `npm publish` would
 * send. A second pack anywhere in the chain would make this a rehearsal of a different artefact.
 *
 * EVERYTHING IT WRITES IS A `mkdtemp` OUTSIDE ANY SOURCE TREE, which is both the sanctioned home
 * for a planted tree in this suite and the point of the scenario: a directory inside this
 * repository resolves through its own `node_modules` and its workspace links whatever the tarball
 * says. `resolveEvidenceRoot`'s own note records the convention — this repository's own OUTPUT
 * goes to the evidence root, and a planted tree goes to a temporary directory (3F-3099).
 *
 * Parent: 3F-3247, under 3F-2811 — one release process, over an artefact it verified first.
 */

import { After, Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import { exitCodeOf, type FinishedCommand } from "../checks/measurementArtefact.js";
import {
  CLEAN_ROOM_ASK,
  cleanRoomFaults,
  cleanRoomPlan,
  packedTarballName,
  type CleanRoomFault,
  type PackedPackage,
} from "../checks/cleanRoomInstall.js";
import { packedPackageAt } from "../checks/packedPackages.js";
import {
  packedManifestFaults,
  type CarriedFile,
  type ConsumedManifest,
  type PackedManifestFault,
  type PublishedPackage,
} from "../checks/packedManifest.js";
import {
  gateFaults,
  gateRunPlan,
  gatesAheadOfThePack,
  notAsked,
  refusedAt,
  standsOn,
  type GateAnswer,
  type GateFault,
  type ReleaseGate,
} from "../checks/releaseGates.js";
import {
  releaseFaults,
  type ReleaseFault,
  type StagedRelease,
  type StatedRelease,
} from "../checks/releaseWorkflow.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// @SCN-REL-001
/** The two packages this release packs, as directories under the workspace. */
const PACKAGE_DIRS = ["packages/core", "packages/spec-controller"] as const;

const planted: string[] = [];

/** A temporary directory this arm owns, removed when the scenario ends. */
function scratch(purpose: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), `spec-controller-rel001-${purpose}-`));
  planted.push(dir);
  return dir;
}

After(function () {
  for (const dir of planted.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** Run a command to completion, and report it the way `cleanRoomFaults` reads it. */
function finish(
  command: string,
  args: readonly string[],
  cwd: string,
  // THE ENVIRONMENT IS AN ARGUMENT BECAUSE ONE ARM'S WHOLE SUBJECT IS ONE VARIABLE IN IT
  // (@SCN-REL-004). Where a run posts and reads its evidence is `SPEC_CONTROLLER_EVIDENCE_DIR`, and
  // the difference between a release runner and this machine is that the runner's is empty. An
  // inherited environment would hand every command the warm root this session has been filling all
  // day, which is precisely the reading that let the fault ship.
  env: NodeJS.ProcessEnv = process.env,
): FinishedCommand & { stdout: string; stderr: string } {
  const done = spawnSync(command, [...args], { cwd, encoding: "utf8", env });
  return {
    status: done.status,
    signal: done.signal,
    stdout: done.stdout ?? "",
    stderr: done.stderr ?? "",
  };
}

/** Pack one package into a destination, failing loudly rather than leaving an absent tarball. */
function pack(packageDir: string, packDir: string): void {
  const packed = finish("pnpm", ["pack", "--pack-destination", packDir], packageDir);
  assert.equal(
    exitCodeOf(packed),
    0,
    `packing ${packageDir} must succeed before anything can be installed. It said:\n${packed.stderr}`,
  );
}

/** Pack both packages out of a workspace and answer where the tarballs landed and what they are. */
function packBoth(workspaceRoot: string, purpose: string): { packDir: string; packages: PackedPackage[] } {
  const packDir = scratch(purpose);
  const packages = PACKAGE_DIRS.map((dir) => {
    const packageDir = path.join(workspaceRoot, dir);
    pack(packageDir, packDir);
    return packedPackageAt(packageDir);
  });
  return { packDir, packages };
}

/** What driving one clean room left behind — the recipe it ran and how each half of it ended. */
interface CleanRoom {
  readonly dir: string;
  readonly install: FinishedCommand & { stderr: string };
  readonly run: FinishedCommand & { stdout: string; stderr: string };
  readonly faults: CleanRoomFault[];
}

/**
 * Build a directory holding nothing else, install the tarballs into it, and start the command.
 *
 * THE "NOTHING ELSE" IS ASSERTED RATHER THAN INTENDED. The whole claim of this scenario is that
 * the artefact resolves where no checkout of this repository can help it, so the one manifest the
 * clean room starts with is checked to be the only thing in it, and the directory is checked to
 * be outside the repository. A clean room that had quietly acquired a neighbour would pass this
 * scenario while proving the opposite of it.
 */
function driveCleanRoom(packages: readonly PackedPackage[], packDir: string, purpose: string): CleanRoom {
  const dir = scratch(purpose);
  writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "clean-room", version: "0.0.0", private: true }, null, 2),
    "utf8",
  );
  assert.deepEqual(
    readdirSync(dir),
    ["package.json"],
    "the clean room must hold nothing but its own manifest before the tarballs arrive",
  );
  assert.ok(
    !dir.startsWith(repoRoot) && !existsSync(path.join(dir, ".git")),
    `the clean room must stand outside this repository, and ${dir} does not`,
  );

  const plan = cleanRoomPlan({ packages, packDir, cleanRoom: dir, ask: CLEAN_ROOM_ASK });
  const install = finish(plan.install.command, plan.install.args, plan.install.cwd);
  const run = finish(plan.run.command, plan.run.args, plan.run.cwd);
  return { dir, install, run, faults: cleanRoomFaults(plan, install, run) };
}

let built: CleanRoom;

Given("the two packages packed from a tree whose build has run", function () {
  // THE BUILD IS RUN HERE RATHER THAN INHERITED FROM THE LADDER. `pnpm build` does precede
  // `pnpm cucumber` in ci.yml and in the derived local ladder, so this is usually a no-op — but a
  // scenario whose premise is "the build has run" and which relies on a neighbouring gate to have
  // run it is a scenario that reds for somebody typing `pnpm cucumber` on a fresh clone, and reds
  // in the vocabulary of a broken release rather than of an unbuilt tree.
  const build = finish("pnpm", ["-r", "build"], repoRoot);
  assert.equal(exitCodeOf(build), 0, `the tree must build before it can be packed. It said:\n${build.stderr}`);

  const { packDir, packages } = packBoth(repoRoot, "built");
  built = driveCleanRoom(packages, packDir, "consumer");
});

When("they are installed into a directory holding nothing else of this repository", function () {
  assert.equal(
    exitCodeOf(built.install),
    0,
    `the packed tarballs must install into an empty directory. It said:\n${built.install.stderr}`,
  );
});

Then("the reconciler starts there and describes what it reconciles", function () {
  assert.deepEqual(
    built.faults,
    [],
    `the artefact a consumer resolves must be the artefact this release verified. It said:\n${built.run.stderr}`,
  );
  // WHAT IT SAYS, NOT MERELY THAT IT EXITED. A command that started, printed nothing and exited 0
  // would satisfy the reading above while telling a consumer nothing, and the failure 3F-3086 shipped
  // was a module graph that could not be loaded — so the proof is that it resolved far enough to
  // describe its own subject.
  for (const said of ["Evidence Reconciliation", "--features"]) {
    assert.ok(
      built.run.stdout.includes(said),
      `the started command must describe what it reconciles, naming ${said}. It said:\n${built.run.stdout}`,
    );
  }
});

Then("the same two packages packed from a checkout that never built do not start there at all", function () {
  const checkout = unbuiltCheckout();
  const { packDir, packages } = packBoth(checkout, "unbuilt");
  const hollow = driveCleanRoom(packages, packDir, "hollow");

  // THE STATED REASON, READ OFF THE ARTEFACT. The tarball carries no build output — `files` selects
  // `dist` and no manifest in this workspace carries a `prepare`, `prepack` or `prepublishOnly` hook
  // that would produce it — so this arm reds for the fault it names rather than for an install that
  // happened to break.
  const command = packages.find((packed) => packed.bin !== undefined);
  assert.ok(command !== undefined, "one of the packed packages installs the command this arm starts");
  const carried = finish("tar", ["-tzf", path.join(packDir, packedTarballName(command))], packDir);
  assert.ok(
    !carried.stdout.includes("dist/"),
    `the unbuilt tarball must carry no build output — that is the fault. It carried:\n${carried.stdout}`,
  );
  // AND THE INSTALL SUCCEEDS, WHICH IS WHY THIS FAULT REACHES A CONSUMER AT ALL. npm is content to
  // install a package whose `files` selected a directory that is not there; nothing before the first
  // invocation notices.
  assert.equal(
    exitCodeOf(hollow.install),
    0,
    `the hollow tarballs still install — the fault is invisible to the install. It said:\n${hollow.install.stderr}`,
  );
  assert.deepEqual(
    hollow.faults.map((fault) => fault.kind),
    ["reconciler-did-not-run"],
    `a tarball packed without its build must red the clean room. It said:\n${hollow.run.stderr}`,
  );
});

/**
 * A checkout of this repository at HEAD, with no build output in it and no install run over it.
 *
 * `git archive` IS THE CHECKOUT. `dist/` is untracked and gitignored, so the tracked tree IS the
 * tree a fresh clone gets — which is the whole of P2: a clone followed by a pack ships a package
 * whose command names a file the tarball does not carry.
 *
 * THE ONE THING IT ADDS BACK IS THE WORKSPACE LINK, and it is added rather than installed on
 * purpose. `pnpm pack` resolves `workspace:*` out of the installed link, not out of the workspace
 * manifests, so a checkout with no `node_modules` cannot pack the CLI at all — a different fault
 * from the one under test, and one that would stop this arm ever reaching the hollow tarball. The
 * link written below is byte-for-byte the one a real `pnpm install` leaves there, and writing it
 * directly is what keeps a full install out of a scenario whose subject is the missing BUILD.
 */
function unbuiltCheckout(): string {
  const checkout = scratch("checkout");
  const archived = spawnSync("bash", ["-c", `git archive HEAD | tar -x -C ${JSON.stringify(checkout)}`], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(exitCodeOf(archived), 0, `the checkout must be reproducible. It said:\n${archived.stderr}`);
  assert.ok(
    !existsSync(path.join(checkout, "packages", "spec-controller", "dist")),
    "a checkout carries no build output — if it does, this arm is not testing what it says",
  );

  const links = path.join(checkout, "packages", "spec-controller", "node_modules", "@3f-consulting");
  mkdirSync(links, { recursive: true });
  symlinkSync("../../../core", path.join(links, "spec-controller-core"));
  return checkout;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// @SCN-REL-002 — the document a consumer resolves against, and the one this workspace develops.
//
// THE PACK HARNESS ABOVE IS REUSED WHOLE. `packBoth` already resolves which tarball each package
// becomes and where it lands, and a second harness spelling that itself would agree with it by
// diligence and then drift. What this arm adds is the reading: the tarballs are unpacked, and the
// manifest and the file list each one carries are handed to `packedManifestFaults`.
//
// NOTHING HERE BUILDS, AND THAT IS NOT AN OVERSIGHT. None of this Rule's four properties is about a
// file the build produces — a manifest's specifiers, its publish-time fields, its licence and its
// link back to source are all true or false of an unbuilt pack exactly as they are of a built one.
// The clean room next door needs the build and runs it; borrowing that need here would spend the
// cucumber budget on a premise this scenario does not have.
//
// THE NEGATIVE ARM READS THE PACKAGE DIRECTORIES THROUGH THE SAME FUNCTION. Three of the four
// properties are live faults in this workspace, permanently: the CLI's core dependency is a
// workspace specifier, core's map offers the `./internal` subpath its publish-time map drops, and
// neither package directory holds a licence — pnpm copies the workspace root's in as it packs. So
// the arm that shows this reading has teeth costs one directory walk and no second pack.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/** What one package looks like from a place, and what the workspace promised about it. */
function publishedPackageAt(
  packedFrom: string,
  root: string,
  manifest: ConsumedManifest & { publishConfig?: Record<string, unknown> },
): PublishedPackage {
  return {
    packedFrom,
    publishConfig: manifest.publishConfig ?? {},
    manifest,
    carries: filesUnder(root),
  };
}

/** Every file under a root, named relative to it, with `node_modules` left out. */
function filesUnder(root: string, prefix = ""): CarriedFile[] {
  return readdirSync(path.join(root, prefix), { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "node_modules" ? [] : filesUnder(root, relative);
    }
    return [{ path: relative, bytes: statSync(path.join(root, relative)).size }];
  });
}

/** The manifest at a root, as JSON, with whatever fields it happens to carry. */
function manifestAt(root: string): ConsumedManifest & { publishConfig?: Record<string, unknown> } {
  return JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as ConsumedManifest & {
    publishConfig?: Record<string, unknown>;
  };
}

/** Unpack one tarball and answer the package root inside it — the `package/` npm roots them at. */
function unpacked(tarball: string): string {
  const into = scratch("unpacked");
  const opened = finish("tar", ["-xzf", tarball, "-C", into], into);
  assert.equal(exitCodeOf(opened), 0, `the tarball must open before it can be read. It said:\n${opened.stderr}`);
  return path.join(into, "package");
}

/** Each package as its own tarball carries it, and the unpacked root it was read out of. */
let consumed: { readonly published: PublishedPackage; readonly root: string }[];
let consumedFaults: PackedManifestFault[];

Given("the two packages this release packs, as their tarballs carry them", function () {
  const { packDir, packages } = packBoth(repoRoot, "manifests");
  consumed = PACKAGE_DIRS.map((dir, at) => {
    const packed = packages[at];
    assert.ok(packed !== undefined, `${dir} must have been packed before its tarball can be read`);
    const root = unpacked(path.join(packDir, packedTarballName(packed)));
    return { published: publishedPackageAt(dir, root, manifestAt(root)), root };
  });
});

When("each packed manifest is read against what its own workspace manifest promised a consumer", function () {
  // THE PUBLISH-TIME DECLARATION TRAVELS IN THE TARBALL TOO, which is what lets one reading hold
  // both halves: `publishConfig` is not stripped as it is applied, so the artefact carries both the
  // promise and the thing promised and can be reconciled against itself by somebody holding only it.
  for (const { published } of consumed) {
    assert.ok(
      Object.keys(published.publishConfig).length > 0,
      `${published.manifest.name}'s tarball must carry the publish-time declaration it was packed under`,
    );
  }
  consumedFaults = consumed.flatMap(({ published }) => packedManifestFaults(published));
});

Then("no dependency is named by a specifier only this workspace could resolve", function () {
  assertNoFault(consumedFaults, "workspace-specifier-survived");
});

Then("every field these packages publish differently from the way they develop stands as published", function () {
  assertNoFault(consumedFaults, "publish-time-field-not-applied");
});

Then("the licence and the link back to the repository both travel with the artefact", function () {
  assertNoFault(consumedFaults, "licence-did-not-travel");
  assertNoFault(consumedFaults, "repository-absent");
  assertNoFault(consumedFaults, "repository-names-another-directory");

  // AND THE TERMS THEMSELVES, NOT A FILE OF THAT NAME. `licence-did-not-travel` refuses an empty
  // copy, which is what a copy step that ran and did nothing leaves behind; this refuses a
  // DIFFERENT one. The licence a consumer is held to is the licence this repository publishes under,
  // and pnpm reaching the workspace root for it is the only reason either package has one at all.
  const terms = readFileSync(path.join(repoRoot, "LICENSE"));
  for (const { published, root } of consumed) {
    const carried = readFileSync(path.join(root, "LICENSE"));
    assert.ok(
      carried.equals(terms),
      `${published.manifest.name} must carry this repository's own licence, byte for byte`,
    );
  }
});

Then(
  "reading the same packages as this workspace holds them, rather than as the tarballs carry them, reds instead",
  function () {
    const develops = PACKAGE_DIRS.map((dir) => {
      const root = path.join(repoRoot, dir);
      return publishedPackageAt(dir, root, manifestAt(root));
    });

    // THE FAULTS ARE PINNED PER PACKAGE AND IN FULL, never as "at least one". A count would be
    // satisfied by the wrong fault, and the interesting content of this arm is exactly WHICH of the
    // four properties this workspace violates and which it does not: `repository` is in the source
    // manifests as well as the tarballs, so it is absent from both lists below — its counter-case is
    // this scenario's own first run, which redded on real tarballs before the field existed.
    assert.deepEqual(
      develops.map((published) => packedManifestFaults(published).map((fault) => fault.kind)),
      [
        [
          "publish-time-field-not-applied",
          "publish-time-field-not-applied",
          "publish-time-field-not-applied",
          "licence-did-not-travel",
        ],
        ["workspace-specifier-survived", "licence-did-not-travel"],
      ],
      "the workspace this repository develops in must red the reading the tarballs pass",
    );
  },
);

/** Every fault of one kind, named in full, or nothing. */
function assertNoFault(faults: readonly PackedManifestFault[], kind: PackedManifestFault["kind"]): void {
  const found = faults.filter((fault) => fault.kind === kind);
  assert.deepEqual(found, [], `the packed artefacts must not ${kind}:\n${found.map((f) => f.message).join("\n")}`);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// @SCN-REL-003 — the order the two packages reach the registry in, and what stands between them.
//
// THE SUBJECT IS `.github/workflows/release.yml` AS PARSED, PLUS ONE PACK. Nothing below runs
// GitHub Actions, reaches a registry or stages anything, and the Rule says so before the scenario
// rather than after it: a live release is proven once, by the tag that cuts it, and its evidence is
// that run and the registry. What IS reachable from here is every fault that is a property of the
// document — which step stages which package, in what order, with what after it — and the one
// property of the artefact the document cannot hold, which is the version the CLI's PACKED manifest
// names its engine by.
//
// THE PACK HARNESS ABOVE IS REUSED WHOLE, for the third time and for the reason it was built:
// `packBoth` already resolves which tarball each package becomes and where it lands. This arm adds
// one read to it — the CLI's packed manifest, opened for a single specifier.
//
// AND THE THREE MUTANTS ARE DOCUMENTS, NOT DESCRIPTIONS. Each is built by moving the parsed
// workflow and writing it back out as YAML, then read through the SAME reader the real file goes
// through. A mutant assembled as a hand-built description would exercise the fault-finder over a
// shape no workflow file has, and would say nothing about whether the reader can see the fault in a
// document. One reader, four documents.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/** The workflow a tag on this repository would run, as the repository names the file. */
const RELEASE_WORKFLOW = ".github/workflows/release.yml";

/** The one dependency whose absence at the wrong moment is the whole of this Rule. */
const ENGINE = "@3f-consulting/spec-controller-core";

/** A workflow document, in exactly the shape this reading walks and the mutants move. */
interface WorkflowDocument {
  permissions?: Record<string, unknown>;
  jobs?: Record<string, { permissions?: Record<string, unknown>; steps?: WorkflowStep[] }>;
}

interface WorkflowStep {
  name?: string;
  uses?: string;
  run?: string;
}

/**
 * One release, read out of one document.
 *
 * IT REFUSES A WORKFLOW OF MORE THAN ONE JOB rather than reading the first. "Nothing runs after the
 * staging" is a claim about the whole release, and a second job is exactly where a step that ran
 * afterwards would sit — so a reading that quietly looked at one job would be answering a narrower
 * question than the one the scenario asks, and would answer it green.
 */
function statedRelease(text: string): StatedRelease {
  const document = parseYaml(text) as WorkflowDocument;
  const jobs = Object.values(document.jobs ?? {});
  assert.equal(jobs.length, 1, `${RELEASE_WORKFLOW} must state exactly one job; it states ${jobs.length}`);
  const [job] = jobs;
  assert.ok(job !== undefined, `${RELEASE_WORKFLOW} must state a job with steps in it`);

  return {
    permissions: { ...(document.permissions ?? {}), ...(job.permissions ?? {}) },
    steps: (job.steps ?? []).map((step) => ({
      name: step.name ?? step.uses ?? "",
      run: step.run ?? "",
    })),
    // THE PARSE RATHER THAN THE BYTES, so a workflow that EXPLAINS at length that it carries no
    // repository secret does not read as one that carries several. Comments are gone by here.
    body: JSON.stringify(document),
  };
}

/** The same document with one thing moved in it, written back out and read the same way. */
function movedRelease(text: string, move: (steps: WorkflowStep[]) => void): StatedRelease {
  const document = parseYaml(text) as WorkflowDocument;
  const [job] = Object.values(document.jobs ?? {});
  assert.ok(job?.steps !== undefined, `${RELEASE_WORKFLOW} must state a job with steps to move`);
  move(job.steps);
  return statedRelease(stringifyYaml(document));
}

/** Every step of a release that stages anything, in the order the release runs them. */
function stagingSteps(steps: WorkflowStep[]): WorkflowStep[] {
  return steps.filter((step) => (step.run ?? "").includes("stage publish"));
}

let release: StagedRelease;
let releaseText: string;
let releaseFaultsFound: ReleaseFault[];

// @SCN-REL-003
Given("the release this repository would cut, and the two packages it packs", function () {
  const workflow = path.join(repoRoot, RELEASE_WORKFLOW);
  assert.ok(
    existsSync(workflow),
    `this repository states no release at ${RELEASE_WORKFLOW}, so there is no order for the two ` +
      "packages to reach the registry in and nothing here can say a window is closed.",
  );
  releaseText = readFileSync(workflow, "utf8");

  const { packDir, packages } = packBoth(repoRoot, "staged");
  const [engine, dependent] = packages;
  assert.ok(engine !== undefined && dependent !== undefined, "this release packs an engine and a CLI");

  // THE SPECIFIER IS READ OUT OF THE TARBALL AND NOT OUT OF THE WORKSPACE, which is the whole
  // reason this arm packs at all. `workspace:*` is what the tree holds; a concrete version is what
  // `pnpm pack` writes, and it is the only one a consumer ever sees.
  const packed = manifestAt(unpacked(path.join(packDir, packedTarballName(dependent))));
  const dependencies = (packed["dependencies"] ?? {}) as Record<string, string>;

  release = { stated: statedRelease(releaseText), engine, dependent, resolvedEngine: dependencies[ENGINE] };
});

When("the release is read against the artefact it would stage", function () {
  releaseFaultsFound = releaseFaults(release);
});

Then("core is staged before the CLI that resolves it", function () {
  assertNoReleaseFault(releaseFaultsFound, "package-never-staged");
  assertNoReleaseFault(releaseFaultsFound, "dependent-staged-first");
  assertNoReleaseFault(releaseFaultsFound, "publishes-outright");
});

Then("nothing in the release runs after the staging", function () {
  assertNoReleaseFault(releaseFaultsFound, "acts-after-the-staging");
});

Then("the CLI's packed manifest names the exact core version this release stages", function () {
  assertNoReleaseFault(releaseFaultsFound, "engine-version-nobody-stages");

  // AND IT IS A VERSION RATHER THAN A SPECIFIER THAT HAPPENS TO EQUAL ONE. The comparison above is
  // an equality against the engine's version, which a range can never satisfy — but a range is what
  // the title names, so the shape is stated here too rather than left to be inferred from a number.
  assert.match(
    release.resolvedEngine ?? "",
    /^\d+\.\d+\.\d+(?:[-+].*)?$/,
    `${release.dependent.name} must name ${ENGINE} by a version, not by a range: ${String(release.resolvedEngine)}`,
  );
});

Then("the release proves who it is without carrying a repository secret", function () {
  assertNoReleaseFault(releaseFaultsFound, "no-identity-to-prove");
  assertNoReleaseFault(releaseFaultsFound, "carries-a-repository-secret");
});

Then(
  "a release that reverses the two, one that runs a step after staging, and one that publishes outright each red instead",
  function () {
    const reversed = movedRelease(releaseText, (steps) => {
      const [first, second] = stagingSteps(steps);
      assert.ok(first !== undefined && second !== undefined, "the release must stage two packages to reverse");
      const [at, behind] = [steps.indexOf(first), steps.indexOf(second)];
      steps[at] = second;
      steps[behind] = first;
    });
    const acting = movedRelease(releaseText, (steps) => {
      steps.push({ name: "Tell somebody it went out", run: "echo released" });
    });
    const outright = movedRelease(releaseText, (steps) => {
      for (const step of steps) {
        if (step.run !== undefined) step.run = step.run.replace("stage publish", "publish");
      }
    });

    assert.deepEqual(
      [reversed, acting, outright].map((stated) => releaseFaults({ ...release, stated }).map((f) => f.kind)),
      [
        ["dependent-staged-first"],
        ["acts-after-the-staging"],
        ["publishes-outright", "publishes-outright", "package-never-staged", "package-never-staged"],
      ],
      "each way the window opens must red, and must red for its own reason",
    );
  },
);

/** Every release fault of one kind, named in full, or nothing. */
function assertNoReleaseFault(faults: readonly ReleaseFault[], kind: ReleaseFault["kind"]): void {
  const found = faults.filter((fault) => fault.kind === kind);
  assert.deepEqual(found, [], `this release must not ${kind}:\n${found.map((f) => f.message).join("\n")}`);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// @SCN-REL-004 — what a release is allowed to ask before it packs, and a run that answers no.
//
// THE PLANT IS A COLD EVIDENCE ROOT, AND IT IS THE RUNNER'S OWN CONDITION RATHER THAN A CONTRIVANCE.
// Every measured row in this repository reads a report an earlier step of the same run left behind,
// and `SPEC_CONTROLLER_EVIDENCE_DIR` is where those land. A GitHub runner's is a temporary directory
// created for the run; a developer's machine keeps one under `TMPDIR` from one day to the next, with
// yesterday's sweep record still in it. 3F-3249's release was green on the fitness axis for exactly
// that reason and said so. So the directory below is made empty and handed to everything this arm
// runs, and the two things that are about THIS REPOSITORY refuse it while every gate the release
// states passes it.
//
// THE MEASUREMENT IS WHAT CLASSIFIES, NOT A LIST. That the self-reconciliation and the fitness axis
// are about this repository rather than about the artefact is not asserted here — it is MEASURED, by
// putting each to a run whose packed artefacts are unchanged and watching both refuse it. The gate
// list is then compared whole, in order, so a gate arriving tomorrow reds until somebody classifies
// it rather than slipping in behind a search for two names.
//
// AND FOUR GATES ARE NOT ASKED, WHICH THE TABLE SAYS RATHER THAN HIDES. This reading runs under the
// package manager one of them enables, out of the tree another produced, beside one suite and inside
// the other. Their rows carry the reason instead of an outcome; an absent row would read as a pass.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/** The fitness row whose input a scheduled sweep produces — the one that killed 3F-3249's release. */
const SWEEP_FED_ROW = "SCN-FIT-002";

/** A release's gates, put to one run, and what that run said to the two things it is not asked. */
interface ColdRun {
  readonly gates: readonly ReleaseGate[];
  readonly faults: readonly GateFault[];
  readonly answers: readonly GateAnswer[];
  readonly reconciliation: FinishedCommand & { stderr: string };
  readonly axis: FinishedCommand & { stderr: string };
}

let cold: ColdRun;
let coldRoot: string;
let coldRelease: string;

/** Run one shell command against the cold evidence root, from this repository's own root. */
function putToTheColdRun(shell: string): FinishedCommand & { stdout: string; stderr: string } {
  return finish("bash", ["-c", shell], repoRoot, {
    ...process.env,
    SPEC_CONTROLLER_EVIDENCE_DIR: coldRoot,
  });
}

/** The command a `specController.fitnessChecks` row runs, read out of the manifest, never retyped. */
function fitnessRowCommand(scn: string): string {
  const manifest = manifestAt(repoRoot) as unknown as {
    specController?: { fitnessChecks?: { scn: string; command: string }[] };
  };
  const row = (manifest.specController?.fitnessChecks ?? []).find((check) => check.scn === scn);
  assert.ok(row !== undefined, `${scn} must be a row of specController.fitnessChecks to be run here`);
  return row.command;
}

// @SCN-REL-004
Given("a run whose evidence is as cold as a release runner's, and the release this repository would cut", function () {
  const workflow = path.join(repoRoot, RELEASE_WORKFLOW);
  assert.ok(
    existsSync(workflow),
    `this repository states no release at ${RELEASE_WORKFLOW}, so it has no gates and nothing here ` +
      "can say what a release does or does not ask before it packs.",
  );
  coldRelease = readFileSync(workflow, "utf8");

  // EMPTY, AND ASSERTED EMPTY. The whole claim of this arm is that the run below stands where a
  // release runner stands, and a directory that had quietly acquired yesterday's sweep record would
  // pass this scenario while proving the opposite of it.
  coldRoot = scratch("cold-evidence-root");
  assert.deepEqual(readdirSync(coldRoot), [], "the evidence root must be as cold as a runner's");
});

When("the reconciliation, the axis beside it, and every gate the release states are all put to that run", function () {
  const gates = gatesAheadOfThePack(statedRelease(coldRelease));
  const answers = gateRunPlan(gates).map((planned) => {
    if ("notAsked" in planned) return { step: planned.step, answer: notAsked(planned.notAsked) };
    const done = putToTheColdRun(planned.shell);
    return { step: planned.step, answer: exitCodeOf(done) === 0 ? "passed" : "refused" };
  });

  cold = {
    gates,
    faults: gateFaults(gates),
    answers,
    reconciliation: putToTheColdRun("pnpm balance:self"),
    axis: putToTheColdRun(fitnessRowCommand(SWEEP_FED_ROW)),
  };
});

Then("the reconciliation refuses the run, and so does the axis that measures this repository", function () {
  // THE POSITIVE CONTROL, AND WITHOUT IT EVERY LINE BELOW IS VACUOUS. A gate list that passes a run
  // nothing objects to says nothing at all; these two are what make the run one a release could
  // have been blocked by, and they are measured here rather than believed.
  assert.notEqual(
    exitCodeOf(cold.reconciliation),
    0,
    "a run with no evidence in it must be one the self-reconciliation refuses, or the gates below " +
      `are passing a run that was never hard. It said:\n${cold.reconciliation.stderr}`,
  );
  assert.notEqual(
    exitCodeOf(cold.axis),
    0,
    `${SWEEP_FED_ROW} reads a record a scheduled sweep leaves behind, so a run that starts cold must ` +
      `refuse it — that is the fault this rule removed from the release path. It said:\n${cold.axis.stderr}`,
  );
});

Then("no gate the release states asks anything about this repository rather than about the artefact", function () {
  assert.deepEqual(
    cold.faults,
    [],
    `this release gates on something that is about this repository:\n${cold.faults.map((f) => f.message).join("\n")}`,
  );
});

Then("every gate the release states passes the run those two refused, so the release reaches the packing", function () {
  // THE WHOLE LIST, IN ORDER, AND THE FOUR UNASKED GATES CARRY THEIR REASON RATHER THAN A VERDICT.
  // A comparison of outcomes alone would be satisfied by a release that had lost half its gates, and
  // a search for the two forbidden names would be blind to a third arriving. This reds on any gate
  // added, removed, renamed or reordered — which is the only shape that can see a debit nobody raised.
  assert.deepEqual(
    cold.answers,
    [
      { step: "Enable corepack", answer: notAsked(standsOn("Enable corepack") ?? "") },
      { step: "Install dependencies", answer: notAsked(standsOn("Install dependencies") ?? "") },
      { step: "Build", answer: "passed" },
      { step: "Typecheck", answer: "passed" },
      { step: "Test", answer: notAsked(standsOn("Test") ?? "") },
      { step: "Cucumber", answer: notAsked(standsOn("Cucumber") ?? "") },
    ],
    "every gate this release states must be one this run asked and it passed, or one this run is " +
      "standing on and says so",
  );
  assert.equal(
    refusedAt(cold.answers),
    undefined,
    "no gate refused the run, so the release reaches the pack it exists to verify",
  );
});

Then("a release gating on either of them packs nothing at all", function () {
  const reconciling = gatingRelease("Reconcile this repository", "pnpm balance:self");
  const measuring = gatingRelease("Verify", "pnpm verify");

  assert.deepEqual(
    [reconciling, measuring].map((stated) =>
      gateFaults(gatesAheadOfThePack(stated)).map((fault) => fault.kind),
    ),
    [["gate-about-this-repository"], ["gate-about-this-repository"]],
    "a release that asked either of them would be one a cold runner, or a model skew, could stop " +
      "before it packed anything — and this reading has to be able to see it in a document",
  );
});

/**
 * This repository's own release with one more gate spliced in ahead of its pack.
 *
 * A DOCUMENT, NOT A DESCRIPTION, for the reason @SCN-REL-003 states one line up: a mutant assembled
 * by hand would exercise the reading over a shape no workflow file has. It is written back out as
 * YAML and read through the same reader the real file goes through — one reader, three documents.
 */
function gatingRelease(step: string, run: string): StatedRelease {
  return movedRelease(coldRelease, (steps) => {
    const at = steps.findIndex((existing) => / pack /.test(existing.run ?? ""));
    assert.notEqual(at, -1, "the release must pack something for a gate to stand ahead of");
    steps.splice(at, 0, { name: step, run });
  });
}
