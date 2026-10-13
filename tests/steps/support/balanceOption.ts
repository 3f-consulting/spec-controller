import assert from "node:assert/strict";

const OPTION_FLAG: Readonly<Record<string, string>> = {
  "Vitest report option": "--vitest",
  "pytest report option": "--pytest",
  "Cucumber report option": "--cucumber",
  "feature corpus option": "--features",
  "CI workflows option": "--ci",
  "manifest option": "--package-json",
  "CI step record option": "--ci-steps",
  "target-name option": "--target",
  "source-commit option": "--source-sha",
  "format option": "--format",
  "re-render option": "--render-from-json",
  "strict option": "--strict",
  "report-only option": "--exit-zero",
  "store modifier": "--store",
  "run-name modifier": "--run-id",
};

export function optionFlag(intent: string): string {
  const flag = OPTION_FLAG[intent.replace(/^the /, "")];
  assert.ok(flag, `no option is named "${intent}"`);
  return flag;
}
