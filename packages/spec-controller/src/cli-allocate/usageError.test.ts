import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveToolIdentity } from "../run-management/resolveRunInputs.js";
import { repositoryHeadedOneCarrying003 } from "./repository.test-utils.js";
import { allocateIn } from "./answered.test-utils.js";
import { APP_MESSAGES, AppMessage } from "../messages.js";

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

const ALLOCATE = "spec-controller allocate";

const usageError = (why: string): string => APP_MESSAGES[AppMessage.UsageError]("allocate", why);

type Malformed = readonly [request: string, argv: string[], why: (version: string) => string];

const MALFORMED_REQUEST: readonly Malformed[] = [
  ["no part", [], () => APP_MESSAGES[AppMessage.NoFeaturePartGiven]()],
  ["the part fit, in lower case", ["fit"], () => APP_MESSAGES[AppMessage.NotAFeaturePart]("fit")],
  ["the part F, one character long", ["F"], () => APP_MESSAGES[AppMessage.NotAFeaturePart]("F")],
  ["the part TOOLONG, seven characters long", ["TOOLONG"], () => APP_MESSAGES[AppMessage.NotAFeaturePart]("TOOLONG")],
  [
    "two parts, ONE and TWO",
    ["ONE", "TWO"],
    () =>
      `${APP_MESSAGES[AppMessage.ExtraArgument]("TWO", ALLOCATE, "<FFF>")}\n` + APP_MESSAGES[AppMessage.SeeArguments](ALLOCATE),
  ],
  [
    "the part ONE and a flag it does not take",
    ["ONE", "--bogus"],
    (version) =>
      `${APP_MESSAGES[AppMessage.UnknownFlag]("--bogus", ALLOCATE, version, "allocate")}\n` +
      `${APP_MESSAGES[AppMessage.PinDrifted]("allocate", "--bogus")}\n` +
      APP_MESSAGES[AppMessage.OtherwiseSeeFlags](ALLOCATE),
  ],
  [
    "the part ONE and a host modifier given after the command",
    ["ONE", "--store", "runs"],
    () => `${APP_MESSAGES[AppMessage.MisplacedModifier]("--store", "allocate")}\n` + APP_MESSAGES[AppMessage.SeeModifiers](),
  ],
];

describe("[SCN-ALC-012] A request not in the scenario-code form is refused as a usage error, never as an unknown part", () => {
  it.each(MALFORMED_REQUEST)("refuses %s at the usage status, giving no code", (_request, argv, why) => {
    const answered = allocateIn(repositoryHeadedOneCarrying003("allocate-usage-error-"), argv);

    expect(answered.stdout).toBe("");
    expect(answered.exitCode).toBe(2);
    expect(answered.stderr.startsWith(usageError(""))).toBe(true);
    expect(answered.stderr).not.toMatch(/unknown part/);
    expect(answered.stderr).toBe(`${usageError(why(resolveToolIdentity().toolVersion))}\n`);
  });
});
