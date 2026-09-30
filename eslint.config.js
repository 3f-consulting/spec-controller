import tseslint from "typescript-eslint";
import sonarjs from "eslint-plugin-sonarjs";

const PRODUCTION_THRESHOLD = {
  cognitiveComplexity: 15,
  maxLinesPerFunction: 40,
};

const TEST_THRESHOLD = {
  cognitiveComplexity: 15,
  maxLinesPerFunction: "off",
};

const ruleAtCeiling = (rule, ceiling) => {
  if (ceiling === "off") return "off";
  return rule === "sonarjs/cognitive-complexity"
    ? ["warn", ceiling]
    : ["warn", { max: ceiling, skipBlankLines: true, skipComments: true }];
};

const thresholdRules = (threshold) => ({
  "sonarjs/cognitive-complexity": ruleAtCeiling(
    "sonarjs/cognitive-complexity",
    threshold.cognitiveComplexity,
  ),
  "max-lines-per-function": ruleAtCeiling(
    "max-lines-per-function",
    threshold.maxLinesPerFunction,
  ),
});

const tsLanguageOptions = {
  parser: tseslint.parser,
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
};

export const MEASURED_GLOBS = ["packages/*/src/**/*.ts", "tests/steps/**/*.ts"];

const IGNORED_COPIES_OF_THE_TREE = {
  ignores: ["**/dist/**", ".stryker-tmp/**", "**/node_modules/**"],
};

const SONARJS_NAMESPACE = { plugins: { sonarjs } };

const NO_DEAD_SUPPRESSION = {
  linterOptions: { reportUnusedDisableDirectives: "error" },
};

export default [
  IGNORED_COPIES_OF_THE_TREE,
  SONARJS_NAMESPACE,
  NO_DEAD_SUPPRESSION,
  {
    files: MEASURED_GLOBS,
    languageOptions: tsLanguageOptions,
    rules: thresholdRules(PRODUCTION_THRESHOLD),
  },
  {
    files: ["**/*.test.ts"],
    languageOptions: tsLanguageOptions,
    rules: thresholdRules(TEST_THRESHOLD),
  },
];
