import { BeforeAll } from "@cucumber/cucumber";
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

export const NODE = process.execPath;

export const SPEC_CONTROLLER_BIN = join(repoRoot, "packages", "spec-controller", "dist", "cli.js");

export const SPEC_CONTROLLER_ARGV: readonly string[] = [SPEC_CONTROLLER_BIN];

const BUILT_PACKAGES = ["core", "spec-controller"] as const;

function newestMtime(path: string): number {
  if (!existsSync(path)) return 0;
  const stat = statSync(path);
  if (!stat.isDirectory()) return stat.mtimeMs;
  let newest = 0;
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const full = join(path, entry.name);
    if (entry.isDirectory()) {
      newest = Math.max(newest, newestMtime(full));
      continue;
    }
    if (entry.name.endsWith(".test.ts") || entry.name.endsWith(".test-utils.ts") || entry.name.endsWith(".map")) continue;
    newest = Math.max(newest, statSync(full).mtimeMs);
  }
  return newest;
}

// cli.js carries core compiled in, so a core-only rebuild passes the per-package check
// while the suite would still spawn the old core.
function refuseBundleOlderThanItsInputs(): void {
  const binAt = statSync(SPEC_CONTROLLER_BIN).mtimeMs;
  const bundleInputs = [
    join("packages", "core", "src"),
    join("packages", "core", "dist"),
    join("packages", "spec-controller", "src"),
    "pnpm-lock.yaml",
  ];
  for (const input of bundleInputs) {
    const inputAt = newestMtime(join(repoRoot, input));
    if (inputAt > binAt) {
      throw new Error(
        `packages/spec-controller/dist/cli.js is OLDER than ${input}, one of its inputs, so ` +
          `this run would spawn a binary that does not carry the code here.\n  ${input} newest: ` +
          `${new Date(inputAt).toISOString()}\n  cli.js:  ${new Date(binAt).toISOString()}\n` +
          `Run \`pnpm build\` first (CI does).`,
      );
    }
  }
}

BeforeAll(function () {
  if (!existsSync(SPEC_CONTROLLER_BIN)) {
    throw new Error(
      `the behavioural suite spawns the BUILT spec-controller binary, and it is not there: ` +
        `${SPEC_CONTROLLER_BIN}\nRun \`pnpm build\` first (CI does).`,
    );
  }
  for (const pkg of BUILT_PACKAGES) {
    const src = join(repoRoot, "packages", pkg, "src");
    const dist = join(repoRoot, "packages", pkg, "dist");
    const srcAt = newestMtime(src);
    const distAt = newestMtime(dist);
    if (distAt === 0) {
      throw new Error(
        `packages/${pkg}/dist does not exist, and the behavioural suite spawns the built binary.\n` +
          `Run \`pnpm build\` first (CI does).`,
      );
    }
    if (srcAt > distAt) {
      throw new Error(
        `packages/${pkg}/dist is OLDER than packages/${pkg}/src, so this run would spawn a binary ` +
          `built from a tree that is no longer here — and would report a verdict about code nobody ` +
          `has.\n  src newest:  ${new Date(srcAt).toISOString()}\n  dist newest: ` +
          `${new Date(distAt).toISOString()}\nRun \`pnpm build\` first (CI does).`,
      );
    }
  }
  refuseBundleOlderThanItsInputs();
});
