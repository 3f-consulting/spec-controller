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

interface FinishedCommand {
  readonly status: number | null;
  readonly signal: NodeJS.Signals | null;
}

const SIGNAL_EXIT_CODE_BASE = 128;

function exitCodeOf(command: FinishedCommand): number {
  if (command.status !== null) return command.status;
  if (command.signal !== null) return SIGNAL_EXIT_CODE_BASE + constants.signals[command.signal];
  return 1;
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const PACKAGE_DIRS = ["packages/core", "packages/spec-controller"] as const;

const ASK = ["balance", "--features", "features"] as const;

const TOOL_SHA_LINE = "- Tool SHA: ";
const TOOL_VERSION_LINE = "- Tool version: ";
const NO_CHECKOUT = "unknown (not a git checkout)";

const planted: string[] = [];

function scratch(purpose: string): string {
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), `spec-controller-rpt029-${purpose}-`)));
  planted.push(dir);
  return dir;
}

After(function () {
  for (const dir of planted.splice(0)) rmSync(dir, { recursive: true, force: true });
});

type Ran = FinishedCommand & { stdout: string; stderr: string };

function finish(command: string, args: readonly string[], cwd: string): Ran {
  const done = spawnSync(command, [...args], { cwd, encoding: "utf8" });
  return { status: done.status, signal: done.signal, stdout: done.stdout ?? "", stderr: done.stderr ?? "" };
}

function git(args: readonly string[]): string {
  const done = finish("git", args, repoRoot);
  assert.equal(
    exitCodeOf(done),
    0,
    `the fixture's own git command must succeed (git ${args.join(" ")}). It said:\n${done.stderr}`,
  );
  return done.stdout.trim();
}

function repositoryAt(dir: string, subject: string): string {
  const inDir = (...args: string[]): string =>
    git(["-C", dir, "-c", "user.email=fixture@example.invalid", "-c", "user.name=Fixture", ...args]);
  inDir("init", "-q");
  inDir("add", ".");
  inDir("commit", "--allow-empty", "-q", "-m", subject);
  return inDir("rev-parse", "HEAD");
}

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

interface PackedPackage {
  readonly name: string;
  readonly version: string;
  readonly bin?: string;
}

interface RoomCommand {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
}

function packedPackageAt(packageDir: string): PackedPackage {
  const manifest = JSON.parse(readFileSync(path.join(packageDir, "package.json"), "utf8")) as {
    name: string;
    version: string;
    bin?: Record<string, string>;
  };
  const [bin] = Object.keys(manifest.bin ?? {});
  return { name: manifest.name, version: manifest.version, ...(bin === undefined ? {} : { bin }) };
}

function packedTarballName(packed: PackedPackage): string {
  const unscoped = packed.name.startsWith("@") ? packed.name.slice(1) : packed.name;
  return `${unscoped.split("/").join("-")}-${packed.version}.tgz`;
}

const INSTALL_ARGV = ["install", "--prefer-offline", "--no-audit", "--no-fund", "--loglevel=error"] as const;

interface RoomPlan {
  readonly install: RoomCommand;
  readonly run: RoomCommand;
}

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

function pack(packageDir: string, packDir: string): void {
  const packed = finish("pnpm", ["pack", "--pack-destination", packDir], packageDir);
  assert.equal(
    exitCodeOf(packed),
    0,
    `packing ${packageDir} must succeed before anything can be installed. It said:\n${packed.stderr}`,
  );
}

interface Room {
  readonly where: string;
  readonly start: RoomCommand;
  readonly ownHead: string | null;
}

interface Provenance {
  readonly toolSha: string;
  readonly toolVersion: string;
}

interface Arrangement {
  readonly insideARepository: Room;
  readonly outsideEveryRepository: Room;
  readonly throughASymlink: Room;
  readonly toolCheckoutHead: string;
  readonly packedVersion: string;
}

let arranged: Arrangement;
let reported: { insideARepository: Provenance; outsideEveryRepository: Provenance; throughASymlink: Provenance };

interface LinkedRoom {
  readonly toolCheckoutHead: string;
  readonly linkingConsumer: string;
  readonly linkingConsumerHead: string;
  readonly linked: string;
}

function copyInstall(installedModules: string, into: string): void {
  cpSync(installedModules, path.join(into, "node_modules"), { recursive: true, verbatimSymlinks: true });
}

function linkedRoom(installedModules: string, cliName: string): LinkedRoom {
  const toolCheckout = scratch("tool-checkout");
  cpSync(path.join(installedModules, cliName), toolCheckout, { recursive: true, verbatimSymlinks: true });
  const toolCheckoutHead = repositoryAt(toolCheckout, "the tool's own commit");
  copyInstall(installedModules, toolCheckout);

  const linkingConsumer = consumerRoom("linked");
  const linkingConsumerHead = repositoryAt(linkingConsumer, "the linking consumer's own commit");
  mkdirSync(path.join(linkingConsumer, "node_modules"), { recursive: true });
  const linked = path.join(linkingConsumer, "node_modules", cliName);
  symlinkSync(toolCheckout, linked, "dir");
  assert.notEqual(
    toolCheckoutHead,
    linkingConsumerHead,
    "the tool's checkout and the consumer linking it must sit on different commits, or the third room proves nothing",
  );
  return { toolCheckoutHead, linkingConsumer, linkingConsumerHead, linked };
}

Given(
  "this release's packages installed into a directory that is a git repository, into a directory that is not one, and reached from a third through a node_modules symlink to a checkout of the tool",
  function () {
    const packDir = scratch("pack");
    const packages: PackedPackage[] = PACKAGE_DIRS.map((dir) => {
      const packageDir = path.join(repoRoot, dir);
      pack(packageDir, packDir);
      return packedPackageAt(packageDir);
    });
    const cli = packages.find((packed): packed is PackedPackage & { bin: string } => packed.bin !== undefined);
    assert.ok(cli !== undefined, "one of the packed packages installs the command these rooms run");

    const gitRoom = consumerRoom("in-repo");
    const gitRoomHead = repositoryAt(gitRoom, "the consumer's own commit");
    const installed = roomPlan(packages, packDir, gitRoom, cli.bin);
    const install = finish(installed.install.command, installed.install.args, installed.install.cwd);
    assert.equal(exitCodeOf(install), 0, `the packed tarballs must install into ${gitRoom}. It said:\n${install.stderr}`);
    const installedModules = path.join(gitRoom, "node_modules");

    const plainRoom = consumerRoom("no-repo");
    assert.ok(
      !existsSync(path.join(plainRoom, ".git")),
      "the second room must not be a git repository — that is what makes it the control",
    );
    copyInstall(installedModules, plainRoom);

    const { toolCheckoutHead, linkingConsumer, linkingConsumerHead, linked } = linkedRoom(installedModules, cli.name);

    arranged = {
      insideARepository: { where: "the room that is a git repository", start: installed.run, ownHead: gitRoomHead },
      outsideEveryRepository: {
        where: "the room that is not a git repository",
        start: roomPlan(packages, packDir, plainRoom, cli.bin).run,
        ownHead: null,
      },
      throughASymlink: {
        where: "the room reaching a checkout of the tool through a symlink",
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
