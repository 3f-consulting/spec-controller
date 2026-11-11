import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { message } from "./appText.js";
import { main } from "./main.js";
import { AppError } from "./messages.js";
import { forgetWhatTheProgramWrote, recordWhatTheProgramWrites, whatTheProgramWrote, type Written } from "./programOutput.test-utils.js";
import { resolveToolIdentity } from "./run-management/resolveRunInputs.js";
import { printedRefusal } from "./shownText.test-utils.js";
import { temporaryDirectory } from "./temporaryDirectory.test-utils.js";

recordWhatTheProgramWrites();

const balanced = (): string[] => [
  "--features", "tests/fixtures/balanced/features",
  "--vitest", "tests/fixtures/balanced/vitest.json",
  "--package-json", "tests/fixtures/balanced/package.json",
  "--ci", "tests/fixtures/balanced",
];

function ran(argv: string[]): Written {
  forgetWhatTheProgramWrote();
  process.exitCode = undefined;
  main(argv);
  return whatTheProgramWrote();
}

describe("a flag the command takes will take effect", () => {
  it("[CLM-CLI-121] a flag and its value as two arguments", () => {
    const written = ran(["balance", ...balanced(), "--target", "a-named-target", "--source-sha", "abc1234", "--format", "json"]);

    expect(written.stderr).toBe("");
    expect((JSON.parse(written.stdout) as { provenance: { target: string; sourceSha: string } }).provenance).toMatchObject({
      target: "a-named-target",
      sourceSha: "abc1234",
    });
  });

  it("[CLM-CLI-121] an input's flag and its path as two arguments", () => {
    const written = ran(["balance", ...balanced(), "--format", "json"]);

    expect(written.stderr).toBe("");
    const { inputs } = (JSON.parse(written.stdout) as { provenance: { inputs: { name: string; path?: string }[] } }).provenance;
    expect(inputs.find(({ name }) => name === "vitest")).toEqual({ name: "vitest", path: "tests/fixtures/balanced/vitest.json" });
  });

  it("[CLM-CLI-122] a flag that takes no value, --strict", () => {
    const dir = temporaryDirectory("spec-controller-strict-");
    mkdirSync(join(dir, "features"));
    writeFileSync(join(dir, "features", "one.feature"), "Feature: one\n\n  Rule: r\n    @wip @unit @CLM-ONE-001\n    Scenario: s\n      Given a step\n");
    writeFileSync(join(dir, "ci.yml"), "jobs: {}\n");
    const argv = ["balance", "--features", join(dir, "features"), "--ci", join(dir, "ci.yml"), "--format", "json"];
    const claimsRead = (written: Written): unknown[] => (JSON.parse(written.stdout) as { claimReconciliations: unknown[] }).claimReconciliations;

    expect(claimsRead(ran(argv))).toHaveLength(0);
    expect(claimsRead(ran([...argv, "--strict"]))).toHaveLength(1);
  });

  it("[CLM-CLI-122] a flag that takes no value", () => {
    const outOfBalance = [
      "--features", "tests/fixtures/evidence-observation/features",
      "--vitest", "tests/fixtures/evidence-observation/vitest.json",
      "--ci", "tests/fixtures/evidence-observation",
    ];
    const without = ran(["balance", ...outOfBalance]);
    const withIt = ran(["balance", ...outOfBalance, "--exit-zero"]);

    expect(without.exitCode).toBe(1);
    expect(withIt.exitCode).toBe(0);
    expect(withIt.stdout).toBe(without.stdout);
  });

  it("[CLM-CLI-123] --format twice", () => {
    const dir = temporaryDirectory("spec-controller-format-twice-");
    const json = join(dir, "report.json");
    const md = join(dir, "report.md");

    const written = ran(["balance", ...balanced(), "--format", `json:${json}`, "--format", `md:${md}`]);

    expect(written.stderr).toBe("");
    expect(written.exitCode).toBe(0);
    expect(existsSync(json)).toBe(true);
    expect(existsSync(md)).toBe(true);
    expect(() => JSON.parse(readFileSync(json, "utf8")) as unknown).not.toThrow();
    expect(readFileSync(md, "utf8")).not.toBe("");
  });

  it("[CLM-CLI-124] a command's flags in two different orders", () => {
    const groups = [
      ["--features", "tests/fixtures/balanced/features"],
      ["--vitest", "tests/fixtures/balanced/vitest.json"],
      ["--package-json", "tests/fixtures/balanced/package.json"],
      ["--ci", "tests/fixtures/balanced"],
      ["--target", "t"],
      ["--strict"],
      ["--format", "json"],
    ];
    const forward = ran(["balance", ...groups.flat()]);
    const reversed = ran(["balance", ...[...groups].reverse().flat()]);

    expect(forward.stderr).toBe("");
    expect(reversed).toEqual(forward);
  });
});

const BALANCE = "spec-controller balance";
const ALLOCATE = "spec-controller allocate";

describe("an argument the tool does not accept will stop the run", () => {
  it.each([
    [
      "CLM-CLI-125",
      "a command the tool does not have",
      (): string[] => ["blance"],
      (): string => printedRefusal(AppError.UnknownCommand, message(AppError.UnknownCommand, { command: "blance" })),
    ],
    [
      "CLM-CLI-126",
      "a flag the command does not take",
      (): string[] => ["balance", ...balanced(), "--bogus"],
      (): string =>
        printedRefusal(
          AppError.UnknownFlag,
          message(AppError.UnknownFlag, { flag: "--bogus", scope: BALANCE, toolVersion: resolveToolIdentity().toolVersion, command: "balance" }),
          "balance",
        ),
    ],
    [
      "CLM-CLI-127",
      "a flag that takes a value, given none",
      (): string[] => ["balance", ...balanced(), "--target"],
      (): string => printedRefusal(AppError.MissingValue, message(AppError.MissingValue, { flag: "--target", scope: BALANCE, arg: "<name>" }), "balance"),
    ],
    [
      "CLM-CLI-127",
      "a flag that takes a value, given another flag where its value goes",
      (): string[] => ["balance", ...balanced(), "--target", "--strict"],
      (): string => printedRefusal(AppError.MissingValue, message(AppError.MissingValue, { flag: "--target", scope: BALANCE, arg: "<name>" }), "balance"),
    ],
    [
      "CLM-CLI-128",
      "a value given to a flag that takes none",
      (): string[] => ["balance", ...balanced(), "--strict", "yes"],
      (): string => printedRefusal(AppError.TakesNoValue, message(AppError.TakesNoValue, { flag: "--strict", scope: BALANCE, value: "yes" }), "balance"),
    ],
    [
      "CLM-CLI-129",
      "an argument that is no flag and no value",
      (): string[] => ["balance", ...balanced(), "stray"],
      (): string => printedRefusal(AppError.NotAFlag, message(AppError.NotAFlag, { token: "stray", scope: BALANCE }), "balance"),
    ],
    [
      "CLM-CLI-130",
      "a flag that does not repeat, given twice",
      (): string[] => ["balance", ...balanced(), "--target", "a", "--target", "a"],
      (): string => printedRefusal(AppError.GivenTwice, message(AppError.GivenTwice, { flag: "--target", scope: BALANCE }), "balance"),
    ],
    [
      "CLM-CLI-131",
      "a flag and its value joined by an equals sign",
      (): string[] => ["balance", ...balanced(), "--format=json"],
      (): string =>
        printedRefusal(AppError.EqualsForm, message(AppError.EqualsForm, { token: "--format=json", scope: BALANCE, spelling: "--format json" }), "balance"),
    ],
    [
      "CLM-CLI-132",
      "a flag before the command",
      (): string[] => ["--exit-zero", "balance", ...balanced()],
      (): string => printedRefusal(AppError.FlagBeforeCommand, message(AppError.FlagBeforeCommand, { flag: "--exit-zero" })),
    ],
    [
      "CLM-CLI-133",
      "a report format the tool does not have",
      (): string[] => ["balance", ...balanced(), "--format", "xml"],
      (): string => printedRefusal(AppError.UnknownFormat, message(AppError.UnknownFormat, { formats: "xml", supported: "md, json" }), "balance"),
    ],
    [
      "CLM-CLI-134",
      "no feature code given to allocate",
      (): string[] => ["allocate"],
      (): string => printedRefusal(AppError.NoFeaturePartGiven, message(AppError.NoFeaturePartGiven), "allocate"),
    ],
    [
      "CLM-CLI-135",
      "two feature codes given to allocate",
      (): string[] => ["allocate", "AB", "CD"],
      (): string => printedRefusal(AppError.ExtraArgument, message(AppError.ExtraArgument, { token: "CD", scope: ALLOCATE, takes: "<FFF>" }), "allocate"),
    ],
  ])("[%s] %s", (_clm, _error, argv, complaint) => {
    const written = ran(argv());

    expect(written.stdout).toBe("");
    expect(written.exitCode).toBe(2);
    expect(written.stderr.split("\n")[0]).toBe(complaint());
  });
});
