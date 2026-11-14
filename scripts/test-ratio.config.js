// 2.0 sits a margin above the measured 1.74, so a return to tests no claim needs reds the gate. It is never raised to let work run.
export const testRatioCeiling = 2.0;

// Git pathspec globs: a tracked file matching an include and no exclude is counted.
export const test = {
  include: [
    "packages/**/*.test.ts",
    "packages/**/*.test-utils.ts",
    "tests/**/*.ts",
    "tests/**/*.mts",
    "tests/**/*.mjs",
  ],
  exclude: [],
};

export const production = {
  include: ["packages/*/src/**/*.ts"],
  exclude: ["packages/**/*.test.ts", "packages/**/*.test-utils.ts"],
};
