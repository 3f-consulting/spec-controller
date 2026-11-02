export default {
  packageManager: "pnpm",
  testRunner: "vitest",
  plugins: ["@stryker-mutator/vitest-runner"],
  coverageAnalysis: "perTest",
  // A local run's scope only: mutation.yml passes each of its scopes' own list with --mutate.
  mutate: [
    "packages/core/src/domain/**/*.ts",
    "!packages/core/src/domain/**/*.test.ts",
    "!packages/core/src/domain/**/*.test-utils.ts",
  ],
  reporters: ["progress", "clear-text", "html", "json"],
  htmlReporter: { fileName: "reports/mutation/index.html" },
  tempDirName: ".stryker-tmp",
  timeoutMS: 30000,
  thresholds: { break: 95 },
};
