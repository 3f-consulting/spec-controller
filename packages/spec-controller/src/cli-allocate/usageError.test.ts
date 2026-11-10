import { afterEach, describe, expect, it, vi } from "vitest";
import { repositoryHeadedOneCarrying003 } from "./repository.test-utils.js";
import { allocateIn } from "./answered.test-utils.js";
import { AppError } from "../messages.js";
import { message } from "../appText.js";
import { errorCodesShown } from "../shownText.test-utils.js";

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
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
