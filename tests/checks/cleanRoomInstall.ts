/**
 * THE CLEAN-ROOM RECIPE — what a stranger runs, and what the running of it means (@SCN-REL-001;
 * features/release.feature).
 *
 * WHY A CLEAN ROOM IS THE ONLY PLACE THIS CAN BE ASKED. Every gate in this repository resolves
 * through the WORKSPACE manifest, and npm REPLACES that manifest's `exports` map with
 * `publishConfig.exports` wholesale at publish time rather than merging the two. A module reaching
 * a workspace-only subpath is correct in-repo and unresolvable once installed, and the two readings
 * differ nowhere else — which is how 3F-3086's published CLI threw ERR_PACKAGE_PATH_NOT_EXPORTED on
 * its first command with 605 tests and thirteen gates green behind it. `publishedImports.ts` reads
 * that boundary off the manifests, statically, and it is the cheaper half. This is the other half:
 * install the tarball where no workspace can help it and start the thing.
 *
 * THE RECIPE IS DERIVED ONCE AND HANDED ON WHOLE. Which tarball each package becomes, what installs
 * them and where, and what is started afterwards are one derivation, so nothing downstream re-derives
 * half of it. A caller that spelled the tarball name itself would agree with `pnpm pack` by diligence
 * and then drift — and a plan naming a tarball that is not on disk fails as "no such file", which
 * reads exactly like a pack that never ran.
 *
 * NOTHING HERE PACKS, INSTALLS OR STARTS ANYTHING. It says what to run and what the running meant;
 * the running is the caller's, and this module never touches a disk. That is what lets the whole
 * recipe be asserted by equality in one `@unit` arm while the `@integration` arm spends the seconds
 * a real install costs.
 *
 * A REQUEST WITH NO CLEAN ROOM IN IT RAISES RATHER THAN ANSWERING. No packages, no installed
 * command, or two of them: each of those could be answered with something runnable that installs
 * nothing, starts nothing, and reports a clean room. That is the vacuous green this repository is
 * named for, and the three refusals below are what keep it out of a check whose whole subject is an
 * artefact nobody has looked inside.
 */

import { basename, join } from "node:path";

import { exitCodeOf, type FinishedCommand } from "./measurementArtefact.js";

/** A package this release packs — the fields that decide what it becomes and what it installs. */
export interface PackedPackage {
  /** The manifest name, scoped or not. */
  readonly name: string;
  /** The manifest version, verbatim — a prerelease suffix travels into the tarball's name. */
  readonly version: string;
  /** The command this package installs, where it installs one. */
  readonly bin?: string;
}

/** One command of the recipe, and the directory it is run in. */
export interface CleanRoomCommand {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
}

/** What a clean room is asked to do with a release's packed artefacts. */
export interface CleanRoomRequest {
  /** The packages this release packed. */
  readonly packages: readonly PackedPackage[];
  /** Where their tarballs landed. */
  readonly packDir: string;
  /** The directory holding nothing else, which the tarballs are installed into. */
  readonly cleanRoom: string;
  /** What the installed command is asked, once it is there. */
  readonly ask: readonly string[];
}

/** The whole recipe, derived once so nothing downstream re-derives half of it. */
export interface CleanRoomPlan {
  /** The tarballs, in the order the packages were given. */
  readonly tarballs: readonly string[];
  readonly install: CleanRoomCommand;
  readonly run: CleanRoomCommand;
}

/** One way a clean room can say the artefact is not what the release verified. */
export interface CleanRoomFault {
  readonly kind: "install-refused" | "reconciler-did-not-run";
  readonly message: string;
}

/**
 * The installer is `npm` AND THAT IS NOT AN OVERSIGHT IN A pnpm WORKSPACE. A consumer installs with
 * whatever they have, and npm is the one that hoists — which is what lets the core tarball at the
 * top of the tree satisfy the CLI's concrete dependency on it, so the release is verified against
 * the core it just packed rather than against whatever the registry is currently serving under that
 * version. `--prefer-offline` keeps a warm cache out of the network's way; the three quiet flags
 * keep a registry audit and a funding banner out of a step whose subject is neither.
 */
const INSTALL_ARGV = [
  "install",
  "--prefer-offline",
  "--no-audit",
  "--no-fund",
  "--loglevel=error",
] as const;

/**
 * The least the installed command can be asked and still have had to resolve its whole module graph
 * — the recipe's own default for `ask`.
 *
 * IT SITS WITH THE RECIPE BECAUSE IT IS PART OF IT (3F-3249). Two callers drive this clean room —
 * the scenario, and the release running the smoke over the tarballs it is about to stage — and a
 * release asking something different from the arm that proves the reading would be a smoke test of
 * a question nobody checked.
 */
export const CLEAN_ROOM_ASK = ["balance", "--help"] as const;

/**
 * The tarball a packed package becomes, spelled the way npm spells it.
 *
 * The leading sigil goes and the scope's slash flattens to a dash, which is the one thing about this
 * recipe that cannot come out right by accident: a scoped and an unscoped package sit side by side
 * in this release and only one of them keeps its own name.
 *
 * WRITTEN THIS WAY RATHER THAN AS AN ANCHORED REPLACE, and the reason is a guard rather than taste.
 * @SCN-TRM-001 scans this repository's source for a second reading of what a TERM bare is, and its
 * needle is exactly an anchored replace of the sigil — a package name is not a term, but the scan is
 * a scan by design and holds no list of files allowed to spell it. This is the spelling that check's
 * own must-not-move fixture blesses.
 */
export function packedTarballName(packed: PackedPackage): string {
  return `${packedTarballPrefix(packed)}${packed.version}.tgz`;
}

/**
 * Everything of a tarball's name that a package decides, with the version it decides left off.
 *
 * SPLIT OUT RATHER THAN SPELLED A SECOND TIME (3F-3249). @SCN-REL-003 reads a release step to find
 * which package it stages, and a release names its tarballs by a pattern rather than by a version
 * nobody can know before the pack. A second flattening written there would agree with this one by
 * diligence and then drift, and the drift would present as a release step matching no package —
 * which is indistinguishable from a release that stages nothing.
 */
export function packedTarballPrefix(packed: Pick<PackedPackage, "name">): string {
  const unscoped = packed.name.startsWith("@") ? packed.name.slice(1) : packed.name;
  return `${unscoped.split("/").join("-")}-`;
}

/** The whole recipe for one clean room, or a refusal where the request has no clean room in it. */
export function cleanRoomPlan(request: CleanRoomRequest): CleanRoomPlan {
  const { packages, packDir, cleanRoom, ask } = request;
  if (packages.length === 0) {
    throw new Error("a clean room over no packages would install nothing and report nothing");
  }

  const started = startedCommandOf(packages);
  const tarballs = packages.map((packed) => join(packDir, packedTarballName(packed)));
  return {
    tarballs,
    install: { command: "npm", args: [...INSTALL_ARGV, ...tarballs], cwd: cleanRoom },
    run: { command: join(cleanRoom, "node_modules", ".bin", started), args: [...ask], cwd: cleanRoom },
  };
}

/**
 * What the install's outcome and the run's outcome say about the artefact between them.
 *
 * A REFUSED INSTALL STOPS THE READING, because nothing behind it has been established: the run was
 * launched at a command the install never placed, and reporting its failure beside the install's
 * would name two faults where there is one and send a reader to the second of them.
 */
export function cleanRoomFaults(
  plan: CleanRoomPlan,
  install: FinishedCommand,
  run: FinishedCommand,
): CleanRoomFault[] {
  const installed = exitCodeOf(install);
  if (installed !== 0) {
    return [
      {
        kind: "install-refused",
        message:
          `the packed tarballs would not install into a tree holding nothing else (exit ${installed}). ` +
          "Nothing downstream of the install has been established.",
      },
    ];
  }

  const started = exitCodeOf(run);
  if (started !== 0) {
    return [
      {
        kind: "reconciler-did-not-run",
        message:
          `the installed ${basename(plan.run.command)} command did not run in the clean room (exit ${started}). ` +
          "The tarballs installed, so what a consumer resolves is not what this release verified.",
      },
    ];
  }

  return [];
}

/**
 * The one command the clean room starts, or a refusal naming why there is not exactly one.
 *
 * Sorted, so the refusal reads the same however the packages were ordered — a message whose text
 * depends on the caller's argument order is a message two runs disagree about.
 */
function startedCommandOf(packages: readonly PackedPackage[]): string {
  const bins = packages
    .map((packed) => packed.bin)
    .filter((bin): bin is string => bin !== undefined)
    .sort();
  const [started] = bins;
  if (started === undefined) {
    throw new Error(
      "none of the packed packages installs a command, so nothing can be started in the clean room",
    );
  }
  if (bins.length > 1) {
    throw new Error(
      `${bins.length} of the packed packages install a command (${bins.join(", ")}); ` +
        "the clean room starts exactly one",
    );
  }

  return started;
}
