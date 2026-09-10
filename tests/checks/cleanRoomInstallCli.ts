/**
 * THE CLEAN-ROOM SMOKE AS A RELEASE RUNS IT — `tsx tests/checks/cleanRoomInstallCli.ts --pack-dir
 * <dir> <package dir>…` (@SCN-REL-003's step 6, over @SCN-REL-001's recipe).
 *
 * IT PACKS NOTHING, AND THAT IS THE WHOLE REASON IT EXISTS. The release packs once and then reads
 * those files three times — here, and twice more as it stages them. A smoke test that packed for
 * itself would be a rehearsal of a different artefact, which is the fault in its purest form: the
 * dry run proves a thing nobody ships. So the tarballs arrive as a directory somebody else filled,
 * and this only installs them somewhere nothing can help them and starts what they installed.
 *
 * THE RECIPE IS @SCN-REL-001'S, IMPORTED WHOLE. Which tarball each package became, what installs
 * them and where, what is started afterwards, and what the two outcomes mean between them are all
 * `cleanRoomInstall.ts`'s, and the scenario asserts that reading by equality. A release spelling
 * any of it again would agree by diligence and then drift — and a release naming a tarball that is
 * not on disk fails as "no such file", which reads exactly like a pack that never ran.
 *
 * THE SCRIPT NAME CARRIES NO OBSERVED PREFIX AND IT IS NOT A `package.json` SCRIPT AT ALL, both
 * deliberate. `runningStaticChecks` observes a manifest script as a running static check when its
 * name starts with `lint:` or `guard:` and a CI `run:` step invokes it, and the reconciliation's
 * scan reaches every workflow in `.github/workflows`, not only `ci.yml`. A release invoking a
 * prefixed script would register a static check on spec-controller's own ledger that no scenario
 * cites, and the self-reconciliation would red on it. This is invoked by path, so the ledger never sees it —
 * the reasoning `verify` and `ladder` already carry, applied one workflow over.
 *
 * WHAT ITS GREEN DOES NOT ESTABLISH. It reports the install and the start; it does not read the
 * registry, and it says nothing about what happens after the staging steps behind it.
 *
 * @SCN-REL-003 — features/release.feature.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  CLEAN_ROOM_ASK,
  cleanRoomFaults,
  cleanRoomPlan,
  type CleanRoomCommand,
} from "./cleanRoomInstall.js";
import { exitCodeOf, type FinishedCommand } from "./measurementArtefact.js";
import { packedPackageAt } from "./packedPackages.js";

/** What this run was asked to smoke: the directory the release packed into, and what it packed. */
interface Asked {
  readonly packDir: string;
  readonly packageDirs: readonly string[];
}

/**
 * The request, or a usage fault.
 *
 * EXIT 2 RATHER THAN 1, the distinction the self-reconciliation and the ladder emitter both draw: a request
 * this script cannot read is a fault in how it was called, never a verdict about the artefact. A
 * release told the wrong directory must not report that its packages do not install.
 */
function askedBy(argv: readonly string[]): Asked {
  const flag = argv.indexOf("--pack-dir");
  const packDir = flag === -1 ? undefined : argv[flag + 1];
  if (packDir === undefined) {
    console.error("clean room: --pack-dir needs the directory the release packed into");
    process.exit(2);
  }
  const packageDirs = argv.filter((_, at) => at !== flag && at !== flag + 1);
  if (packageDirs.length === 0) {
    console.error("clean room: name the package directories this release packed; there is nothing to install");
    process.exit(2);
  }
  return { packDir, packageDirs };
}

/** Run one command of the recipe to completion, the way `cleanRoomFaults` reads it. */
function finish(command: CleanRoomCommand): FinishedCommand & { stdout: string; stderr: string } {
  const done = spawnSync(command.command, [...command.args], { cwd: command.cwd, encoding: "utf8" });
  return { status: done.status, signal: done.signal, stdout: done.stdout ?? "", stderr: done.stderr ?? "" };
}

/**
 * A directory holding one manifest and nothing else.
 *
 * OUTSIDE ANY CHECKOUT, WHICH IS THE POINT RATHER THAN TIDINESS. A directory inside this repository
 * resolves through its own `node_modules` and its workspace links whatever the tarball says; a
 * directory outside it resolves through the published map alone, which is where a consumer stands.
 */
function cleanRoom(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "spec-controller-release-clean-room-"));
  writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "clean-room", version: "0.0.0", private: true }, null, 2),
    "utf8",
  );
  return dir;
}

const asked = askedBy(process.argv.slice(2));
const plan = cleanRoomPlan({
  packages: asked.packageDirs.map(packedPackageAt),
  packDir: asked.packDir,
  cleanRoom: cleanRoom(),
  ask: CLEAN_ROOM_ASK,
});

console.log(`clean room: installing ${plan.tarballs.join(", ")} into ${plan.install.cwd}`);
const install = finish(plan.install);
const run = finish(plan.run);
const faults = cleanRoomFaults(plan, install, run);

if (faults.length > 0) {
  for (const fault of faults) console.error(`clean room: ${fault.message}`);
  console.error(install.stderr || run.stderr);
  console.error(
    "clean room: what a consumer would resolve is not what this release verified. Nothing is staged.",
  );
  process.exit(1);
}

console.log(run.stdout);
console.log(
  `clean room: the packed artefacts installed into a tree holding nothing else and ` +
    `${path.basename(plan.run.command)} started there (exit ${exitCodeOf(run)}).`,
);
