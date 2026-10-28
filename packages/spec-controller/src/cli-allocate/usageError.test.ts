import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resolveToolIdentity } from "../run-management/resolveRunInputs.js";
import { gitInRepository as git } from "./repository.test-utils.js";
import { allocateIn } from "./answered.test-utils.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

function headedOneCarryingThree(): string {
  const repo = realpathSync(temporaryDirectory("allocate-usage-error-"));
  git(repo, ["init", "-q", "-b", "main"]);
  mkdirSync(join(repo, "features"));
  writeFileSync(join(repo, "features/one.feature"), "@ONE\nFeature: part ONE\n\n  @SCN-ONE-003 @unit\n  Scenario: scenario 1\n    Given a step\n");
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", "the corpus"]);
  return repo;
}

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

const USAGE_ERROR = "spec-controller allocate: usage error — ";

type Malformed = readonly [request: string, argv: string[], why: (version: string) => string];

const MALFORMED_REQUEST: readonly Malformed[] = [
  ["no part", [], () => "no feature part was given: 'spec-controller allocate <FFF>' takes one, a feature file's header code."],
  ["the part fit, in lower case", ["fit"], () => "'fit' is not a feature part: two to five characters, each A-Z or 0-9."],
  ["the part F, one character long", ["F"], () => "'F' is not a feature part: two to five characters, each A-Z or 0-9."],
  [
    "the part TOOLONG, seven characters long",
    ["TOOLONG"],
    () => "'TOOLONG' is not a feature part: two to five characters, each A-Z or 0-9.",
  ],
  [
    "two parts, ONE and TWO",
    ["ONE", "TWO"],
    () =>
      "The argument 'TWO' is more than 'spec-controller allocate' takes: it takes <FFF> once, and its flags.\n" +
      "Run 'spec-controller allocate --help' to see what this version accepts.",
  ],
  [
    "the part ONE and a flag it does not take",
    ["ONE", "--bogus"],
    (version) =>
      `Unknown flag --bogus for 'spec-controller allocate' — this is spec-controller ${version}, and that flag is not in its allocate scope.\n` +
      "If this version is pinned, the pin and the tree it is reading have drifted apart: bump the pin to a version whose 'allocate' accepts --bogus.\n" +
      "Otherwise run 'spec-controller allocate --help' to see the flags this version accepts.",
  ],
  [
    "the part ONE and a host modifier given after the command",
    ["ONE", "--store", "runs"],
    () =>
      "The --store flag is a host modifier: it goes before the command, as in 'spec-controller --store <value> allocate …', never after it.\n" +
      "Run 'spec-controller --help' to see the host modifiers this version accepts.",
  ],
];

describe("[SCN-ALC-012] A request not in the scenario-code form is refused as a usage error, never as an unknown part", () => {
  it.each(MALFORMED_REQUEST)("refuses %s at the usage status, giving no code", (_request, argv, why) => {
    const answered = allocateIn(headedOneCarryingThree(), argv);

    expect(answered.stdout).toBe("");
    expect(answered.exitCode).toBe(2);
    expect(answered.stderr.startsWith(USAGE_ERROR)).toBe(true);
    expect(answered.stderr).not.toMatch(/unknown part/);
    expect(answered.stderr).toBe(`${USAGE_ERROR}${why(resolveToolIdentity().toolVersion)}\n`);
  });
});
