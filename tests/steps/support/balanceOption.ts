import assert from "node:assert/strict";

const OPTION_FLAG: Readonly<Record<string, string>> = {
  "Vitest report option": "--vitest",
  "pytest report option": "--pytest",
  "Jest report option": "--jest",
  "JUnit report option": "--junit",
  "RSpec report option": "--rspec",
  "Cucumber report option": "--cucumber",
  "feature corpus option": "--features",
  "CI workflows option": "--ci",
  "manifest option": "--package-json",
  "CI step record option": "--ci-steps",
  "target-name option": "--target",
  "source-commit option": "--source-sha",
  "format option": "--format",
  "strict option": "--strict",
  "report-only option": "--exit-zero",
};

export function optionFlag(intent: string): string {
  const flag = OPTION_FLAG[intent.replace(/^the /, "")];
  assert.ok(flag, `no option is named "${intent}"`);
  return flag;
}
