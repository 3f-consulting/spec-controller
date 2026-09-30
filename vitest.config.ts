import { defineConfig } from "vitest/config";

export default defineConfig({
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
