/**
 * THE ROUTE AN ADOPTER TAKES — every arm that spawns spec-controller spawns the BUILT binary.
 *
 * WHAT MOVED. These arms used to spawn `node_modules/.bin/tsx packages/spec-controller/src/cli.ts`.
 * They now spawn `node packages/spec-controller/dist/cli.js` — the file `bin` points at. The
 * product code under `packages/` did not move; only the route the suite reaches it by.
 *
 * TWO REASONS, AND THE SECOND IS THE ONE THAT WOULD STAND ON ITS OWN.
 *
 * `technical-design/spec-controller.md` rules that a repository that reaches its own verdict by a
 * route nobody else can take has not proved the route anybody else takes. NO ADOPTER RUNS THIS CLI
 * THROUGH `tsx` FROM SOURCE — they run the `bin`. So the arms that were spawning the TypeScript
 * entry were proving a route with exactly one user, and the arms that reached `runBalance` by
 * naming `cli-balance/cli.ts` directly were proving a route with none: that module is not a `bin`
 * and a consumer cannot address it. Both now go through `dist/cli.js`, with `balance` as the
 * subcommand the host dispatches, which is what a consumer types.
 *
 * And it is cheaper, which is why it was scheduled when it was. Measured at `2b94da2`:
 * `tsx packages/spec-controller/src/cli.ts` with no arguments — print usage and exit — costs
 * **0.18s**; `node packages/spec-controller/dist/cli.js` doing the same costs **0.07s**; a bare
 * `node -e` costs 0.03s. 89 spawns in this suite went through the `tsx` entry, so ~10s of the
 * local run was TypeScript-on-the-fly start-up the built artefact does not pay. That is CPU, and
 * CPU is the thing a 2-core `ubuntu-latest` is short of: a measurement showed that `parallel` bought
 * almost nothing there BECAUSE the cores were already busy, `tsx`/`esbuild`/`tsc` being themselves
 * threaded. On a saturated machine the only lever left is removing work.
 *
 * WHAT THIS BUYS HAS A PRICE, AND THE PRICE IS THAT `dist` IS NOW A PREREQUISITE. See the guard
 * below — a silent pass over a stale `dist` is the worst outcome available here, and is worse than
 * the seconds are worth.
 */

import { BeforeAll } from "@cucumber/cucumber";
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

/**
 * The Node running this suite, never a bare `node` off PATH — a spawn that resolves its own
 * interpreter from the environment is a spawn that can be handed a different one than the suite
 * is running under, and the arms here assert exit codes and stderr verbatim.
 */
export const NODE = process.execPath;

/** The artefact `packages/spec-controller/package.json`'s `bin` points at. */
export const SPEC_CONTROLLER_BIN = join(repoRoot, "packages", "spec-controller", "dist", "cli.js");

/**
 * THE WHOLE ARGV PREFIX, WHICH IS THE BIN PLUS ONE THING IT NEEDS IN A CHECKOUT AND NOWHERE ELSE.
 *
 * `dist/cli.js` imports `@3f-consulting/spec-controller-core` by name. In this workspace that name
 * resolves through `packages/core/package.json`'s `exports` to `./src/index.ts` — which plain
 * `node` cannot load. A consumer never meets that, because npm replaces `exports` with
 * `publishConfig.exports` wholesale at publish and theirs points at `dist`. `coreFromDist.hook.mjs`
 * puts the consumer's resolution back; see its docblock for why it is a hook rather than a
 * condition added to that manifest.
 *
 * SPREAD IT, DO NOT INDEX IT — a call site writes `[...SPEC_CONTROLLER_ARGV, "balance", ...args]`,
 * so the day this prefix needs another element every spawn gets it.
 */
export const SPEC_CONTROLLER_ARGV: readonly string[] = [
  "--import",
  pathToFileURL(join(repoRoot, "tests", "steps", "support", "coreFromDist.register.mjs")).href,
  SPEC_CONTROLLER_BIN,
];

/** The two built packages the spawned binary needs — `dist/cli.js` imports core through the workspace link. */
const BUILT_PACKAGES = ["core", "spec-controller"] as const;

/**
 * The newest mtime under `dir`, ignoring `*.test.ts` (both `tsconfig.build.json`s exclude them, so
 * editing one cannot stale a build) and `*.map`. Returns 0 for a directory that does not exist.
 */
function newestMtime(dir: string): number {
  if (!existsSync(dir)) return 0;
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      newest = Math.max(newest, newestMtime(full));
      continue;
    }
    if (entry.name.endsWith(".test.ts") || entry.name.endsWith(".map")) continue;
    newest = Math.max(newest, statSync(full).mtimeMs);
  }
  return newest;
}

/**
 * THE FRESHNESS GUARD — `dist` must exist and must be at least as new as `src`, or this run stops
 * here with the cure named.
 *
 * WHY THERE IS A GUARD AT ALL. CI runs `pnpm build` before `Cucumber`, so that route into this
 * suite builds first. Somebody
 * typing `pnpm cucumber` on a fresh clone gets neither — and with the arms now spawning `dist`,
 * that run would either crash on a missing file (loud, fine) or, far worse, PASS over a `dist`
 * built from some earlier tree. A green over a stale artefact is a green about code nobody has.
 * That is the worst outcome available here and it is worse than the seconds this ticket bought.
 *
 * WHY IT IS A GUARD AND NOT A `BeforeAll` THAT BUILDS, WHICH IS THE OPTION ONCE ASKED TO BE
 * MEASURED. **`BeforeAll` runs once per WORKER, not once per run** — probed on this tree under
 * `cucumber.js`'s `parallel: 2`: two hooks, two distinct pids, 2ms apart. So a hook that ran
 * `pnpm -r build` would run it N times CONCURRENTLY, which is two `tsc` processes writing the same
 * `packages/<pkg>/dist` at the same instant. That is not an arrangement that RETIRES the measured
 * shared-build exposure — it is that exposure manufactured on purpose, with a 2ms gap where the
 * two builds measured sit 1.8-4.9s apart. It would also rebuild on every local run and in
 * CI, where the tree was already built one step earlier. A `stat` walk costs nothing, cannot
 * collide with anything, and refuses instead of papering over.
 *
 * mtime, NOT CONTENT. Cheap, and it fails SAFE — a spurious "stale" is a red that names its own
 * cure, where a spurious "fresh" is the silent pass this guard exists to prevent. `*.test.ts` is
 * excluded because neither build config compiles it.
 */
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
});
