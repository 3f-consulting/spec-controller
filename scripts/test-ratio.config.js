// 4 is the owner's judgement, set by hand while the scenarios are reviewed for lines no claim needs; it comes down by hand once that review makes the room.
export const testRatioCeiling = 4;

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
