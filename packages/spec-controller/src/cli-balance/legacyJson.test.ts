import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { checkLegacyJson } from "./cli.js";
import { AppError } from "../messages.js";
import { message } from "../appText.js";
import { runBalanceCaptured } from "../runBalance.test-utils.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import { printedRefusal, shownText } from "../shownText.test-utils.js";

describe("[SCN-FMT-006] balance rejects the removed --json flag with a migration hint", () => {
  it("returns the typed migration-hint error naming --format json:<path> when --json is present", () => {
    const error = shownText(checkLegacyJson({ json: "out.json" }));
    expect(error).not.toBeNull();
    expect(error).toMatch(/--json/);
    expect(error).toMatch(/--format json:<path>/);
  });

  it("returns null when --json is absent, so the CLI proceeds", () => {
    expect(shownText(checkLegacyJson({}))).toBeNull();
    expect(shownText(checkLegacyJson({ format: "json:out.json" }))).toBeNull();
  });

  it("runBalance refuses --json at exit 2 with the hint alone, writing nothing and creating no file, over a target that would otherwise reconcile", () => {
    const dir = temporaryDirectory("legacy-json-");
    const destination = join(dir, "out.json");
    const { stdout, stderr, exitCode } = runBalanceCaptured([
      "--features", "tests/fixtures/balanced/features",
      "--vitest", "tests/fixtures/balanced/vitest.json",
      "--package-json", "tests/fixtures/balanced/package.json",
      "--ci", "tests/fixtures/balanced",
      "--json", destination,
    ]);

    expect(exitCode).toBe(2);
    expect(stderr).toBe(printedRefusal(AppError.LegacyJsonRemoved, message(AppError.LegacyJsonRemoved), "balance") + "\n");
    expect(stdout).toBe("");
    expect(existsSync(destination)).toBe(false);
  });
});
