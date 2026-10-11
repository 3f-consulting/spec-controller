// 3 is the owner's judgement for this product, held at its post-trim size and lowered by hand as the estate shrinks.
export const testRatioCeiling = 3;

// Git pathspec globs: a tracked file matching an include and no exclude is counted.
export const test = {
  include: [
    "packages/**/*.test.ts",
    "packages/**/*.testkit.ts",
    "tests/**/*.ts",
    "tests/**/*.mts",
    "tests/**/*.mjs",
  ],
  exclude: ["tests/fixtures/**"],
};

export const production = {
  include: ["packages/*/src/**/*.ts"],
  exclude: ["packages/**/*.test.ts", "packages/**/*.testkit.ts"],
};
