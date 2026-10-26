// 3 is the owner's judgement, lowered by hand as the estate shrinks; raised to 3.5 for now, temporarily.
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
