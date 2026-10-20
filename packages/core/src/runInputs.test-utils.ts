import type { RunInput, RunInputName, RunInputs } from "./domain/runProvenance.js";

export const FEATURES: RunInputName = { name: "features", flag: "--features" };
export const VITEST: RunInputName = { name: "vitest", flag: "--vitest" };
export const PYTEST: RunInputName = { name: "pytest", flag: "--pytest" };
export const JEST: RunInputName = { name: "jest", flag: "--jest" };
export const JUNIT: RunInputName = { name: "junit", flag: "--junit" };
export const RSPEC: RunInputName = { name: "rspec", flag: "--rspec" };
export const CUCUMBER: RunInputName = { name: "cucumber", flag: "--cucumber" };
export const CI: RunInputName = { name: "ci", flag: "--ci" };
export const PACKAGE_JSON: RunInputName = { name: "packageJson", flag: "--package-json" };
export const CI_STEPS: RunInputName = { name: "ciSteps", flag: "--ci-steps" };

export const HANDED_INPUT_NAMES: readonly RunInputName[] = [
  FEATURES,
  VITEST,
  PYTEST,
  JEST,
  JUNIT,
  RSPEC,
  CUCUMBER,
  CI,
  PACKAGE_JSON,
  CI_STEPS,
];

export function handedInputs(paths: RunInputs): RunInput[] {
  return HANDED_INPUT_NAMES.map((input) => {
    const path = paths[input.name];
    return path === undefined ? input : { ...input, path };
  });
}
