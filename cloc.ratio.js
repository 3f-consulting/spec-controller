// 3 is the owner's judgement, lowered by hand as the estate shrinks; the operator's temporary ruling of 2026-10-13 raises it to 3.5 until he returns: "if this blow while you run autonomously then raise the limit to 3.5 and keep going. We will fix it when I come back."
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
