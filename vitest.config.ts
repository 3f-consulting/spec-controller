import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const coreSource = (entry: string): string =>
  fileURLToPath(new URL(`./packages/core/src/${entry}`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@3f-consulting\/spec-controller-core$/, replacement: coreSource("index.ts") },
    ],
  },
  test: {
    include: ["packages/*/src/**/*.test.ts"],
    coverage: {
      enabled: false,
      provider: "v8",
      include: ["packages/*/src/**"],
      reporter: ["json"],
      reportOnFailure: true,
    },
  },
});
