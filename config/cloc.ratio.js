// 3.5 is the owner's judgement, set by hand; no measurement derives it.
export const testRatioCeiling = 3.5;

// Git pathspec globs: a tracked file matching an include and no exclude is counted.
export const test = {
  include: [
    "packages/**/*.test.ts",
    "packages/**/*.test-utils.ts",
    "tests/**/*.ts",
    "tests/**/*.mts",
    "tests/**/*.mjs",
  ],
  exclude: ["tests/fixtures/**"],
};

export const production = {
  include: ["packages/*/src/**/*.ts"],
  exclude: ["packages/**/*.test.ts", "packages/**/*.test-utils.ts"],
};
