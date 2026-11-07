import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveToolIdentity } from "../run-management/resolveRunInputs.js";
import { repositoryHeadedOneCarrying003 } from "./repository.test-utils.js";
import { allocateIn } from "./answered.test-utils.js";
import { AppError, AppMessage } from "../messages.js";
import { message } from "../appText.js";
import { errorCodesShown, printedRefusal } from "../shownText.test-utils.js";

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

const ALLOCATE = "spec-controller allocate";

type Malformed = readonly [request: string, argv: string[], code: AppError, why: (version: string) => string];

const MALFORMED_REQUEST: readonly Malformed[] = [
  ["no part", [], AppError.NoFeaturePartGiven, () => message(AppError.NoFeaturePartGiven)],
  ["the part fit, in lower case", ["fit"], AppError.NotAFeaturePart, () => message(AppError.NotAFeaturePart, { part: "fit" })],
  ["the part F, one character long", ["F"], AppError.NotAFeaturePart, () => message(AppError.NotAFeaturePart, { part: "F" })],
  ["the part TOOLONG, seven characters long", ["TOOLONG"], AppError.NotAFeaturePart, () => message(AppError.NotAFeaturePart, { part: "TOOLONG" })],
  [
    "two parts, ONE and TWO",
    ["ONE", "TWO"],
    AppError.ExtraArgument,
    () =>
      `${message(AppError.ExtraArgument, { token: "TWO", scope: ALLOCATE, takes: "<FFF>" })}\n` + message(AppMessage.SeeArguments, { scope: ALLOCATE }),
  ],
  [
    "the part ONE and a flag it does not take",
    ["ONE", "--bogus"],
    AppError.UnknownFlag,
    (version) =>
      `${message(AppError.UnknownFlag, { flag: "--bogus", scope: ALLOCATE, toolVersion: version, command: "allocate" })}\n` +
      `${message(AppMessage.PinDrifted, { command: "allocate", flag: "--bogus" })}\n` +
      message(AppMessage.OtherwiseSeeFlags, { scope: ALLOCATE }),
  ],
  [
    "the part ONE and a host modifier given after the command",
    ["ONE", "--store", "runs"],
    AppError.MisplacedModifier,
    () => `${message(AppError.MisplacedModifier, { modifier: "--store", command: "allocate" })}\n` + message(AppMessage.SeeModifiers),
  ],
];

describe("[CLM-ALC-012] A request not in the claim-code form is refused as a usage error, never as an unknown part", () => {
  it.each(MALFORMED_REQUEST)("refuses %s at the usage status, giving no code", (_request, argv, code, why) => {
    const answered = allocateIn(repositoryHeadedOneCarrying003("allocate-usage-error-"), argv);

    expect(answered.stdout).toBe("");
    expect(answered.exitCode).toBe(2);
    expect(answered.stderr.startsWith(printedRefusal(code, "", "allocate"))).toBe(true);
    expect(answered.stderr).not.toMatch(/unknown part/);
    expect(answered.stderr).toBe(`${printedRefusal(code, why(resolveToolIdentity().toolVersion), "allocate")}\n`);
  });
});

describe("[CLM-MSG-010] an error shows its reader the error code of what went wrong — a request for a claim code not in its form", () => {
  it.each([
    ["the part fit, in lower case", "fit"],
    ["the part F, one character long", "F"],
    ["the part TOOLONG, seven characters long", "TOOLONG"],
  ])("refuses %s with [not-a-feature-part] once, after allocate's usage-error prefix", (_request, part) => {
    const answered = allocateIn(repositoryHeadedOneCarrying003("allocate-coded-usage-error-"), [part]);

    expect(answered.exitCode).toBe(2);
    expect(errorCodesShown(answered.stderr)).toEqual({ opening: ["not-a-feature-part"], after: [] });
    expect(answered.stderr).toBe(`spec-controller allocate: usage error [not-a-feature-part] — ${message(AppError.NotAFeaturePart, { part })}\n`);
  });
});
