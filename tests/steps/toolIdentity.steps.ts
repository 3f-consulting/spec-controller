/**
 * Step definitions for @SCN-RPT-029 (features/report.feature) — WHICH spec-controller produced a
 * run, asked where a consumer asks it.
 *
 * WHY THIS ARM INSTALLS FOR REAL, AND WHY NO PROJECTION COULD HAVE CAUGHT THIS. The fault 3F-3418
 * states is a fact about a PATH: `import.meta.url` resolves to somewhere under the consumer's own
 * worktree, and `git -C` there walks up to the consumer's `.git` and answers with the consumer's
 * HEAD. A test that hands `resolveToolIdentity` a directory it invented is testing the predicate;
 * only a tarball really installed under a real repository is testing the premise the predicate is
 * about. That fault was invisible to 605 tests and thirteen gates for eleven weeks precisely
 * because every reading of it was a projection agreeing with itself.
 *
 * THREE ROOMS, AND THE THIRD IS THE ONE THAT KEEPS THE FIX HONEST. A guard answering `null`
 * everywhere would satisfy the first two and be exactly the symmetric failure the ticket names —
 * one wrong SHA traded for another, with nothing on the report to say which. So the third room is a
 * consumer reaching the tool through a `node_modules` SYMLINK to a checkout of itself, as `npm
 * link` really leaves it, and it must still report that checkout's commit. Node resolves module
 * symlinks, so the directory the tool sees is the checkout's own and carries no `node_modules`
 * segment; this arm is where that is measured rather than reasoned about.
 *
 * THE PACK-AND-INSTALL APPARATUS IS THIS ARM'S OWN, AND THAT IS A CHANGE OF OWNER RATHER THAN A
 * SECOND COPY (3F-3446). It was borrowed from the clean-room recipe, on the argument that a second
 * spelling of a tarball name or an install argv would agree with the one reading by diligence and
 * then drift. That argument was exactly right while there WAS another reading; the release now
 * smokes its tarball in shell and the recipe has left the tree, so there is one spelling of each and
 * it lives with its only consumer. A plan naming a tarball that is not on disk still fails as "no
 * such file", which reads exactly like a pack that never ran.
 *
 * WHAT IT ASKS IS ITS OWN, AND DELIBERATELY NOT `balance --help`. That ask resolves the whole module
 * graph and renders no provenance, which is what a smoke test wants and not what this is. This
 * scenario's whole subject is a rendered line, so it asks for a reconcile over a corpus each room
 * plants.
 *
 * EVERYTHING IT WRITES IS A `mkdtemp` OUTSIDE ANY SOURCE TREE, and every room is asserted to stand
 * outside this repository — a directory inside it resolves through this tree's own `node_modules`
 * and its workspace links whatever the tarball says.
 *
 * Parent: 3F-3419, under 3F-3418.
 */

import { After, Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { constants, tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** How a spawned command ended, in the two fields `spawnSync` reports it in. */
interface FinishedCommand {
  /** The code it exited with, or null where it never exited under its own power. */
  readonly status: number | null;
  /** The signal that killed it, or null where nothing did. */
  readonly signal: NodeJS.Signals | null;
}

/** What a signalled death is worth as an exit code, before the signal's own number. */
const SIGNAL_EXIT_CODE_BASE = 128;

/**
 * The code a spawned command's ending is worth, the way a shell would report it. It lived in
 * `tests/checks/measurementArtefact.ts`, the remnant of the measured producers, and moved here, to its
 * one caller, when that file left with the measured route (3F-3506).
 */
function exitCodeOf(command: FinishedCommand): number {
  if (command.status !== null) return command.status;
  // A command killed by a signal never exited and has no code of its own, so the shell's
  // arithmetic answers for it — 128 + n, the spelling a CI log's reader already knows.
  if (command.signal !== null) return SIGNAL_EXIT_CODE_BASE + constants.signals[command.signal];
  // Neither: it could not be started at all. The one reading that must be unreachable here is the
  // one that greens the build.
  return 1;
}

// @SCN-RPT-029

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** The two packages this release packs, as directories under the workspace. */
const PACKAGE_DIRS = ["packages/core", "packages/spec-controller"] as const;

/**
 * What the installed command is asked. A reconcile, because the line under test is rendered by one
 * — and over a corpus each room plants, because `--features` naming a directory that is not there
 * is a hard error at the CLI edge (@SCN-CLI-002) and would red this scenario in the vocabulary of a
 * mistyped flag.
 */
const ASK = ["balance", "--features", "features"] as const;

/** The two provenance lines each room is read for, and the answer an installed tool must give. */
const TOOL_SHA_LINE = "- Tool SHA: ";
const TOOL_VERSION_LINE = "- Tool version: ";
const NO_CHECKOUT = "unknown (not a git checkout)";

const planted: string[] = [];

/** A temporary directory this arm owns, removed when the scenario ends. */
function scratch(purpose: string): string {
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), `spec-controller-rpt029-${purpose}-`)));
  planted.push(dir);
  return dir;
}

After(function () {
  for (const dir of planted.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A finished command, keeping both streams — the rendered report arrives on one of them. */
type Ran = FinishedCommand & { stdout: string; stderr: string };

/** Run a command to completion. */
function finish(command: string, args: readonly string[], cwd: string): Ran {
  const done = spawnSync(command, [...args], { cwd, encoding: "utf8" });
  return { status: done.status, signal: done.signal, stdout: done.stdout ?? "", stderr: done.stderr ?? "" };
}

/** A git read that fails loudly — a fixture whose premise did not take is not a scenario result. */
function git(args: readonly string[]): string {
  const done = finish("git", args, repoRoot);
  assert.equal(
    exitCodeOf(done),
    0,
    `the fixture's own git command must succeed (git ${args.join(" ")}). It said:\n${done.stderr}`,
  );
  return done.stdout.trim();
}

/** Make `dir` a git repository with one commit of its own, and answer that commit. */
function repositoryAt(dir: string, subject: string): string {
  const inDir = (...args: string[]): string =>
    git(["-C", dir, "-c", "user.email=fixture@example.invalid", "-c", "user.name=Fixture", ...args]);
  inDir("init", "-q");
  inDir("add", ".");
  inDir("commit", "--allow-empty", "-q", "-m", subject);
  return inDir("rev-parse", "HEAD");
}

/**
 * A directory a consumer could be: its own manifest, and a corpus for the reconcile to read.
 *
 * THE "OUTSIDE THIS REPOSITORY" IS ASSERTED RATHER THAN INTENDED. The whole claim of this scenario
 * is about what the tool resolves where no checkout of this repository can help it, and a room that
 * had quietly acquired this tree as an ancestor would pass while proving the opposite.
 */
function consumerRoom(purpose: string): string {
  const dir = scratch(purpose);
  assert.ok(!dir.startsWith(repoRoot), `a consumer room must stand outside this repository, and ${dir} does not`);
  writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name: `consumer-${purpose}`, version: "0.0.0", private: true }, null, 2),
    "utf8",
  );
  mkdirSync(path.join(dir, "features"), { recursive: true });
  writeFileSync(
    path.join(dir, "features", "consumer.feature"),
    [
      "Feature: a corpus for the reconcile to read",
      "",
      "  Rule: the room names one behaviour",
      "",
      "    @unit @SCN-CNS-001",
      "    Scenario: the consumer names one behaviour",
      "      Given a corpus",
      "      Then it is reconciled",
      "",
    ].join("\n"),
    "utf8",
  );
  return dir;
}

/** A package this arm packs — the fields that decide what it becomes and what it installs. */
interface PackedPackage {
  /** The manifest name, scoped or not. */
  readonly name: string;
  /** The manifest version, verbatim — a prerelease suffix travels into the tarball's name. */
  readonly version: string;
  /** The command this package installs, where it installs one. */
  readonly bin?: string;
}

/** One command this arm runs, and the directory it is run in. */
interface RoomCommand {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
}

/**
 * The package a directory holds, as this arm would pack it.
 *
 * THE FIRST `bin` ENTRY, AND ONLY WHERE THERE IS ONE. A package installing no command is ordinary —
 * the engine is one — and which of the packed packages installs the command the rooms start is the
 * caller's to find and to refuse, one assertion below.
 */
function packedPackageAt(packageDir: string): PackedPackage {
  const manifest = JSON.parse(readFileSync(path.join(packageDir, "package.json"), "utf8")) as {
    name: string;
    version: string;
    bin?: Record<string, string>;
  };
  const [bin] = Object.keys(manifest.bin ?? {});
  return { name: manifest.name, version: manifest.version, ...(bin === undefined ? {} : { bin }) };
}

/**
 * The tarball a packed package becomes, spelled the way npm spells it.
 *
 * The leading sigil goes and the scope's slash flattens to a dash, which is the one thing here that
 * cannot come out right by accident: a scoped and an unscoped package sit side by side in this
 * release and only one of them keeps its own name.
 */
function packedTarballName(packed: PackedPackage): string {
  const unscoped = packed.name.startsWith("@") ? packed.name.slice(1) : packed.name;
  return `${unscoped.split("/").join("-")}-${packed.version}.tgz`;
}

/**
 * The installer is `npm` AND THAT IS NOT AN OVERSIGHT IN A pnpm WORKSPACE. A consumer installs with
 * whatever they have, and npm is the one that hoists — which is what lets the core tarball at the
 * top of the tree satisfy the CLI's concrete dependency on it, so each room resolves the core this
 * arm just packed rather than whatever the registry is currently serving under that version.
 * `--prefer-offline` keeps a warm cache out of the network's way; the three quiet flags keep a
 * registry audit and a funding banner out of a step whose subject is neither.
 */
const INSTALL_ARGV = ["install", "--prefer-offline", "--no-audit", "--no-fund", "--loglevel=error"] as const;

/** What one room takes: the tarballs installed into it, and the installed command started there. */
interface RoomPlan {
  readonly install: RoomCommand;
  readonly run: RoomCommand;
}

/**
 * Both commands for one room, derived together so nothing re-derives half of them — the install
 * places the command at a path only the tarball names decide, and the run starts it there.
 */
function roomPlan(
  packages: readonly PackedPackage[],
  packDir: string,
  room: string,
  started: string,
): RoomPlan {
  const tarballs = packages.map((packed) => path.join(packDir, packedTarballName(packed)));
  return {
    install: { command: "npm", args: [...INSTALL_ARGV, ...tarballs], cwd: room },
    run: { command: path.join(room, "node_modules", ".bin", started), args: [...ASK], cwd: room },
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

/** One room, arranged and ready to be run: what starts the tool there, and whose commit it sits on. */
interface Room {
  readonly where: string;
  readonly start: RoomCommand;
  /** The HEAD of the repository the room itself is, or null where it is not one. */
  readonly ownHead: string | null;
}

/** What one room reported once the tool had run in it. */
interface Provenance {
  readonly toolSha: string;
  readonly toolVersion: string;
}

interface Arrangement {
  readonly insideARepository: Room;
  readonly outsideEveryRepository: Room;
  readonly throughASymlink: Room;
  /** The commit of the checkout the third room reaches through its symlink. */
  readonly toolCheckoutHead: string;
  /** The version both packed packages carry — what every room must still report. */
  readonly packedVersion: string;
}

let arranged: Arrangement;
let reported: { insideARepository: Provenance; outsideEveryRepository: Provenance; throughASymlink: Provenance };

Given(
  "this release's packages installed into a directory that is a git repository, into a directory that is not one, and reached from a third through a node_modules symlink to a checkout of the tool",
  function () {
    // NO BUILD HERE (3F-3423): `builtCli.ts`'s freshness guard already refuses a run whose `dist`
    // is absent or older than `src`, by name, for every scenario — and a second step building the
    // same `repoRoot` under `parallel` is the one arrangement no scenario sharing it wanted.
    const packDir = scratch("pack");
    const packages: PackedPackage[] = PACKAGE_DIRS.map((dir) => {
      const packageDir = path.join(repoRoot, dir);
      pack(packageDir, packDir);
      return packedPackageAt(packageDir);
    });
    const cli = packages.find((packed): packed is PackedPackage & { bin: string } => packed.bin !== undefined);
    assert.ok(cli !== undefined, "one of the packed packages installs the command these rooms run");

    // ROOM 1 — the ordinary adopter, and the one that is wrong today. Every adopter installs into a
    // git repository, so this is the case every adopter sees and the only case a consumer ever does.
    // It is the arm the acceptance names, so it is a REAL npm install into a REAL repository.
    const gitRoom = consumerRoom("in-repo");
    const gitRoomHead = repositoryAt(gitRoom, "the consumer's own commit");
    const installed = roomPlan(packages, packDir, gitRoom, cli.bin);
    const install = finish(installed.install.command, installed.install.args, installed.install.cwd);
    assert.equal(exitCodeOf(install), 0, `the packed tarballs must install into ${gitRoom}. It said:\n${install.stderr}`);
    const installedModules = path.join(gitRoom, "node_modules");

    /**
     * THE OTHER TWO ROOMS ARE COPIES OF THAT ONE INSTALL, AND THE REASON IS BOTH BUDGET AND
     * ISOLATION. `SCN-FIT-013` gates the behavioural suite at 150s and the ladder was already
     * reading 140.4s on CI before this scenario existed, so three installs is a cost this suite
     * does not have. It is also the better arrangement: rooms 1 and 2 differ in exactly ONE thing
     * — whether the directory is a git repository — and deriving the second from the first is what
     * makes that the only difference rather than merely the intended one. What each room holds was
     * really installed by npm from the really packed tarball; `verbatimSymlinks` keeps npm's
     * relative `.bin` shim pointing where npm left it.
     */
    const copyInstall = (into: string): void =>
      cpSync(installedModules, path.join(into, "node_modules"), { recursive: true, verbatimSymlinks: true });

    // ROOM 2 — the control that was already right: the same artefact, outside any repository.
    const plainRoom = consumerRoom("no-repo");
    assert.ok(
      !existsSync(path.join(plainRoom, ".git")),
      "the second room must not be a git repository — that is what makes it the control",
    );
    copyInstall(plainRoom);

    // ROOM 3 — the symmetric failure this fix must not trade for. A checkout of the tool with its
    // own commit and its dependencies resolved inside it, as `npm link` really leaves one, reached
    // from a consumer repository through a `node_modules` symlink. The checkout is the installed
    // package lifted OUT of the tree that installed it, which is the whole difference: its own
    // directory then carries no `node_modules` segment.
    const toolCheckout = scratch("tool-checkout");
    cpSync(path.join(installedModules, cli.name), toolCheckout, { recursive: true, verbatimSymlinks: true });
    // COMMITTED BEFORE ITS DEPENDENCIES ARRIVE, which is both faster and what a real checkout looks
    // like: the tool's own files are tracked and its node_modules is not.
    const toolCheckoutHead = repositoryAt(toolCheckout, "the tool's own commit");
    copyInstall(toolCheckout);

    const linkingConsumer = consumerRoom("linked");
    const linkingConsumerHead = repositoryAt(linkingConsumer, "the linking consumer's own commit");
    mkdirSync(path.join(linkingConsumer, "node_modules"), { recursive: true });
    const linked = path.join(linkingConsumer, "node_modules", cli.name);
    symlinkSync(toolCheckout, linked, "dir");
    assert.notEqual(
      toolCheckoutHead,
      linkingConsumerHead,
      "the tool's checkout and the consumer linking it must sit on different commits, or the third room proves nothing",
    );

    arranged = {
      insideARepository: { where: "the room that is a git repository", start: installed.run, ownHead: gitRoomHead },
      outsideEveryRepository: {
        where: "the room that is not a git repository",
        start: roomPlan(packages, packDir, plainRoom, cli.bin).run,
        ownHead: null,
      },
      throughASymlink: {
        where: "the room reaching a checkout of the tool through a symlink",
        // NOT the recipe's `.bin` shim: nothing installed this tool into this room, which is the
        // whole arrangement. The entry is reached THROUGH the symlink deliberately — Node resolves
        // it, and that resolution is the fact under test.
        start: { command: process.execPath, args: [path.join(linked, "dist", "cli.js"), ...ASK], cwd: linkingConsumer },
        ownHead: linkingConsumerHead,
      },
      toolCheckoutHead,
      packedVersion: cli.version,
    };
  },
);

When("each one runs a reconcile and the provenance it renders is read", function () {
  const read = (room: Room): Provenance => {
    const ran = finish(room.start.command, room.start.args, room.start.cwd);
    // THE REPORT IS READ, NOT THE EXIT CODE. A reconcile over a corpus with no evidence is
    // legitimately out-of-balance and exits non-zero; what this scenario is about is a line in what
    // it printed. So the proof that the run happened at all is that the block is there.
    assert.ok(
      ran.stdout.includes("## Run provenance"),
      `the tool must render a report in ${room.where}. It said:\n${ran.stdout}\n${ran.stderr}`,
    );
    return { toolSha: factOf(ran.stdout, TOOL_SHA_LINE, room), toolVersion: factOf(ran.stdout, TOOL_VERSION_LINE, room) };
  };

  reported = {
    insideARepository: read(arranged.insideARepository),
    outsideEveryRepository: read(arranged.outsideEveryRepository),
    throughASymlink: read(arranged.throughASymlink),
  };
});

/** One `- <fact>: ` line off a rendered markdown report, or a refusal naming the room it was read in. */
function factOf(report: string, prefix: string, room: Room): string {
  const line = report.split("\n").find((candidate) => candidate.startsWith(prefix));
  assert.ok(
    line !== undefined,
    `the report from ${room.where} must carry a "${prefix.trim()}" line. It said:\n${report}`,
  );
  return line.slice(prefix.length).trim();
}

Then("the one installed inside a git repository reports no tool SHA, and does not name that repository's commit", function () {
  assert.equal(
    reported.insideARepository.toolSha,
    NO_CHECKOUT,
    "an installed tool has no checkout of its own, whatever repository it is sitting inside",
  );
  // THE STRONGER READING, AND NOT A RESTATEMENT OF THE LINE ABOVE. A guard answering with some OTHER
  // wrong SHA would tell a reader nothing true while looking exactly like a genuine tool identity,
  // and this is the assertion that refuses it.
  assert.notEqual(
    reported.insideARepository.toolSha,
    arranged.insideARepository.ownHead,
    "the reported tool SHA must not be the consumer's own commit",
  );
});

Then("the one installed outside any repository reports no tool SHA", function () {
  assert.equal(
    reported.outsideEveryRepository.toolSha,
    NO_CHECKOUT,
    "the arm that was already right must stay right",
  );
});

Then("the one reached from a checkout of the tool reports that checkout's commit, not the consumer's", function () {
  assert.equal(
    reported.throughASymlink.toolSha,
    arranged.toolCheckoutHead,
    "a tool reached through a node_modules symlink to a checkout of itself is still a checkout of itself",
  );
  assert.notEqual(
    reported.throughASymlink.toolSha,
    arranged.throughASymlink.ownHead,
    "and the commit it reports is its own, never the consumer's",
  );
});

Then("all three still report the tool's version", function () {
  for (const [room, provenance] of [
    [arranged.insideARepository, reported.insideARepository],
    [arranged.outsideEveryRepository, reported.outsideEveryRepository],
    [arranged.throughASymlink, reported.throughASymlink],
  ] as const) {
    assert.equal(
      provenance.toolVersion,
      arranged.packedVersion,
      `a run stays attributable by version even where no SHA can be read, and ${room.where} lost it`,
    );
  }
});
