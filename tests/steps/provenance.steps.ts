import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { constants } from "node:os";
import path, { join } from "node:path";
import { fileURLToPath } from "node:url";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";
import { entryText, shownEntry } from "./support/catalogue.js";
import { claimReconciliationsOf } from "./support/reportClaimReconciliations.js";
import { showsHeading } from "./support/reportLines.js";
import { temporaryDirectory } from "./support/temporaryDirectory.js";
import type { Provenance, Room, RoomCommand, SpecControllerWorld } from "./support/world.js";

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

function scratch(world: SpecControllerWorld, purpose: string): string {
  return realpathSync(temporaryDirectory(world, `spec-controller-rpt029-${purpose}-`));
}

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

function consumerRoom(world: SpecControllerWorld, purpose: string): string {
  const dir = scratch(world, purpose);
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
      "    @unit @CLM-CNS-001",
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

interface LinkedRoom {
  readonly toolCheckoutHead: string;
  readonly linkingConsumer: string;
  readonly linkingConsumerHead: string;
  readonly linked: string;
}

function copyInstall(installedModules: string, into: string): void {
  cpSync(installedModules, path.join(into, "node_modules"), { recursive: true, verbatimSymlinks: true });
}

function linkedRoom(world: SpecControllerWorld, installedModules: string, cliName: string): LinkedRoom {
  const toolCheckout = scratch(world, "tool-checkout");
  cpSync(path.join(installedModules, cliName), toolCheckout, { recursive: true, verbatimSymlinks: true });
  const toolCheckoutHead = repositoryAt(toolCheckout, "the tool's own commit");
  copyInstall(installedModules, toolCheckout);

  const linkingConsumer = consumerRoom(world, "linked");
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
  function (this: SpecControllerWorld) {
    const packDir = scratch(this, "pack");
    const packages: PackedPackage[] = PACKAGE_DIRS.map((dir) => {
      const packageDir = path.join(repoRoot, dir);
      pack(packageDir, packDir);
      return packedPackageAt(packageDir);
    });
    const cli = packages.find((packed): packed is PackedPackage & { bin: string } => packed.bin !== undefined);
    assert.ok(cli !== undefined, "one of the packed packages installs the command these rooms run");

    const gitRoom = consumerRoom(this, "in-repo");
    const gitRoomHead = repositoryAt(gitRoom, "the consumer's own commit");
    const installed = roomPlan(packages, packDir, gitRoom, cli.bin);
    const install = finish(installed.install.command, installed.install.args, installed.install.cwd);
    assert.equal(exitCodeOf(install), 0, `the packed tarballs must install into ${gitRoom}. It said:\n${install.stderr}`);
    const installedModules = path.join(gitRoom, "node_modules");

    const plainRoom = consumerRoom(this, "no-repo");
    assert.ok(
      !existsSync(path.join(plainRoom, ".git")),
      "the second room must not be a git repository — that is what makes it the control",
    );
    copyInstall(installedModules, plainRoom);

    const { toolCheckoutHead, linkingConsumer, linkingConsumerHead, linked } = linkedRoom(this, installedModules, cli.name);

    this.arranged = {
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

When("each one runs a reconcile and the provenance it renders is read", function (this: SpecControllerWorld) {
  const read = (room: Room): Provenance => {
    const ran = finish(room.start.command, room.start.args, room.start.cwd);
    assert.ok(
      showsHeading(ran.stdout, 2, "run-provenance-heading"),
      `the tool must render a report in ${room.where}. It said:\n${ran.stdout}\n${ran.stderr}`,
    );
    return {
      toolSha: factOf(ran.stdout, "provenance-tool-sha", "sha", room),
      toolVersion: factOf(ran.stdout, "provenance-tool-version", "version", room),
    };
  };

  this.reported = {
    insideARepository: read(this.arranged.insideARepository),
    outsideEveryRepository: read(this.arranged.outsideEveryRepository),
    throughASymlink: read(this.arranged.throughASymlink),
  };
});

function factOf(report: string, code: string, slot: string, room: Room): string {
  const fact = report
    .split("\n")
    .filter((candidate) => candidate.startsWith("- "))
    .map((candidate) => shownEntry(candidate.slice(2), code)?.[slot])
    .find((value) => value !== undefined);
  assert.ok(fact !== undefined, `the report from ${room.where} must carry a ${code} line. It said:\n${report}`);
  return fact.trim();
}

Then("the one installed inside a git repository reports no tool SHA, and does not name that repository's commit", function (this: SpecControllerWorld) {
  assert.equal(
    this.reported.insideARepository.toolSha,
    entryText("provenance-tool-sha-unknown"),
    "an installed tool has no checkout of its own, whatever repository it is sitting inside",
  );
  assert.notEqual(
    this.reported.insideARepository.toolSha,
    this.arranged.insideARepository.ownHead,
    "the reported tool SHA must not be the consumer's own commit",
  );
});

Then("the one installed outside any repository reports no tool SHA", function (this: SpecControllerWorld) {
  assert.equal(
    this.reported.outsideEveryRepository.toolSha,
    entryText("provenance-tool-sha-unknown"),
    "the arm that was already right must stay right",
  );
});

Then("the one reached from a checkout of the tool reports that checkout's commit, not the consumer's", function (this: SpecControllerWorld) {
  assert.equal(
    this.reported.throughASymlink.toolSha,
    this.arranged.toolCheckoutHead,
    "a tool reached through a node_modules symlink to a checkout of itself is still a checkout of itself",
  );
  assert.notEqual(
    this.reported.throughASymlink.toolSha,
    this.arranged.throughASymlink.ownHead,
    "and the commit it reports is its own, never the consumer's",
  );
});

Then("all three still report the tool's version", function (this: SpecControllerWorld) {
  for (const [room, provenance] of [
    [this.arranged.insideARepository, this.reported.insideARepository],
    [this.arranged.outsideEveryRepository, this.reported.outsideEveryRepository],
    [this.arranged.throughASymlink, this.reported.throughASymlink],
  ] as const) {
    assert.equal(
      provenance.toolVersion,
      this.arranged.packedVersion,
      `a run stays attributable by version even where no SHA can be read, and ${room.where} lost it`,
    );
  }
});

function writeTargetReports(repo: string): void {
  const vitestLocator = join(repo, "src", "widget.test.ts");
  writeFileSync(
    join(repo, "vitest.json"),
    JSON.stringify({
      testResults: [
        {
          name: vitestLocator,
          assertionResults: [
            { fullName: "[CLM-TGT-001] the target unit scenario is proven", status: "passed" },
            { fullName: "an ordinary unit test carrying no claim code", status: "passed" },
          ],
        },
      ],
    })
  );

  const cucumberLocator = join(repo, "features", "sample.feature");
  writeFileSync(
    join(repo, "cucumber.json"),
    JSON.stringify([
      {
        uri: cucumberLocator,
        elements: [{ tags: [{ name: "@smoke" }], steps: [{ result: { status: "passed" } }] }],
      },
    ])
  );
}

Given(
  "a target repo outside the run's working directory whose Vitest and Cucumber reports carry absolute test-file locators under that repo",
  function (this: SpecControllerWorld) {
    this.targetRepo = realpathSync(temporaryDirectory(this, "spec-controller-rpt016-target-"));
    mkdirSync(join(this.targetRepo, "features"), { recursive: true });

    writeFileSync(
      join(this.targetRepo, "features", "sample.feature"),
      [
        "@TGT",
        "Feature: a portable-paths fixture target",
        "",
        "  Rule: the target names a unit scenario",
        "",
        "    @unit @CLM-TGT-001",
        "    Scenario: the target names a unit-level scenario",
        "      Given the target repo's source",
        "",
      ].join("\n")
    );

    writeTargetReports(this.targetRepo);

    this.foreignCwd = realpathSync(temporaryDirectory(this, "spec-controller-rpt016-cwd-"));
    this.outDir = realpathSync(temporaryDirectory(this, "spec-controller-rpt016-out-"));
  }
);

When(
  "balance reconciles it from a foreign working directory and saves the reconciliation in markdown and JSON",
  function (this: SpecControllerWorld) {
    const mdPath = join(this.outDir, "spec-reconciliation.md");
    const jsonPath = join(this.outDir, "spec-reconciliation.json");
    const argv = [
      ...SPEC_CONTROLLER_ARGV,
      "balance",
      "--features", join(this.targetRepo, "features"),
      "--vitest", join(this.targetRepo, "vitest.json"),
      "--cucumber", join(this.targetRepo, "cucumber.json"),
      "--target", "cross-repo-target",
      "--format", `md:${mdPath}`,
      "--format", `json:${jsonPath}`,
    ];
    const result = spawnSync(NODE, argv, {
      cwd: this.foreignCwd,
      encoding: "utf8",
    });
    assert.equal(
      result.error,
      undefined,
      `expected the CLI subprocess to run; it failed to spawn: ${result.error?.message}`
    );
    assert.equal(
      result.status,
      1,
      `expected the CLI to exit 1 (out-of-balance); got exit ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
    );
    assert.ok(existsSync(mdPath) && existsSync(jsonPath), `expected both reports persisted in ${this.outDir}`);
    this.markdown = readFileSync(mdPath, "utf8");
    this.jsonText = readFileSync(jsonPath, "utf8");
  }
);

Then(
  "the saved reconciliation, in both markdown and JSON, carries none of the target's absolute paths — the evidence-observation locators are repo-relative and the input paths record relative to the target root",
  function (this: SpecControllerWorld) {
    assert.ok(
      !this.markdown.includes(this.targetRepo),
      `expected the persisted markdown to carry NONE of the target's absolute paths "${this.targetRepo}"; got:\n${this.markdown}`
    );
    assert.ok(
      !this.jsonText.includes(this.targetRepo),
      `expected the persisted JSON to carry NONE of the target's absolute paths "${this.targetRepo}"; got:\n${this.jsonText}`
    );

    assert.ok(
      this.markdown.includes("src/widget.test.ts"),
      `expected the markdown to carry the repo-relative locator "src/widget.test.ts"; got:\n${this.markdown}`
    );
    const parsed = JSON.parse(this.jsonText) as {
      runProvenance?: { inputs?: Record<string, string> };
    };
    assert.equal(
      parsed.runProvenance?.inputs?.features,
      "features",
      `expected runProvenance.inputs.features "features" (relative to the target root); got ${JSON.stringify(parsed.runProvenance?.inputs)}`
    );
    assert.equal(
      parsed.runProvenance?.inputs?.vitest,
      "vitest.json",
      `expected runProvenance.inputs.vitest "vitest.json" (relative to the target root); got ${JSON.stringify(parsed.runProvenance?.inputs)}`
    );
    const unnamedClaimRow = claimReconciliationsOf<{ claim: string; kind?: string; qualityCheckReconciliations: Array<{ outcome?: string; evidenceObservations?: Array<{ outcome: string; locator?: string }> }> }>(parsed).find((s) => s.kind === "unnamed-claim");
    assert.ok(unnamedClaimRow, `expected the unnamed claim's row carrying the uncited evidence observations; got:\n${this.jsonText}`);
    const locators = unnamedClaimRow!.qualityCheckReconciliations
      .flatMap((o) => o.evidenceObservations ?? [])
      .filter((o) => o.outcome === "cites-no-claim")
      .flatMap((o) => (typeof o.locator === "string" ? [o.locator] : []));
    assert.ok(
      locators.length > 0 && locators.every((l) => !l.startsWith("/")),
      `expected the unnamed claim's evidence observation locators to be repo-relative (none absolute); got ${JSON.stringify(locators)}`
    );
  }
);
