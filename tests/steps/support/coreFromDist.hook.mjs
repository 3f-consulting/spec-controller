/**
 * THE RESOLUTION A CONSUMER GETS, RESTORED FOR AN IN-REPO RUN (3F-3424).
 *
 * `packages/spec-controller/dist/cli.js` imports `@3f-consulting/spec-controller-core` by name.
 * In this workspace that name resolves through `packages/core/package.json`'s `exports`, which
 * points at `./src/index.ts` — TypeScript, with `.js` specifiers that exist only as `.ts` files.
 * `tsx` rewrites both; plain `node` can do neither, so `node dist/cli.js` fails to start with
 * `ERR_MODULE_NOT_FOUND` on `packages/core/src/parse/scenarios.js`.
 *
 * THAT IS A DEVELOPMENT ARRANGEMENT, NOT THE SHIPPED ONE. `packages/core/package.json` carries
 * `publishConfig.exports` mapping `.` to `./dist/index.js`, and npm REPLACES `exports` with
 * `publishConfig.exports` wholesale at publish rather than merging them. So a consumer's install
 * resolves this name to `dist`, and the only place it resolves to `src` is a checkout of this
 * repository. This hook puts the consumer's resolution back for a spawn that asked for it: built
 * CLI, built core, exactly the pair an adopter runs.
 *
 * WHY A HOOK AND NOT A CONDITION IN THE MANIFEST, AND WHAT THAT CHOICE COSTS — WHICH IS NOTHING.
 * A `"spec-controller-built"` condition on core's `exports` plus `node --conditions` would also
 * work, but it edits `packages/`, which 3F-3424 rules out ("the step definitions move; the product
 * code under `packages/` does not"), and it would leave a test-only condition sitting in a
 * published package's manifest for a reader to wonder about. The reason that trade is free rather
 * than merely acceptable is `registerHooks`: measured on this tree, `node --import <this>
 * dist/cli.js` with no arguments costs **0.07s**, which is what bare `node dist/cli.js` costs and
 * what a condition would have cost. `register()` — the loader-thread form tried first — cost 0.09s.
 * The route replaced cost 0.18s.
 *
 * ONLY THESE TWO NAMES. Everything else falls through to Node's own resolution untouched, so a
 * spawn that reaches for anything this hook does not name gets exactly the answer it would have
 * got without it — and a new core subpath appearing would fail loudly here rather than silently
 * resolve somewhere else.
 */

import { pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const coreDist = join(repoRoot, "packages", "core", "dist");

const PUBLISHED_RESOLUTION = new Map([
  ["@3f-consulting/spec-controller-core", pathToFileURL(join(coreDist, "index.js")).href],
  ["@3f-consulting/spec-controller-core/internal", pathToFileURL(join(coreDist, "internal.js")).href],
]);

export function resolve_(specifier, context, nextResolve) {
  const published = PUBLISHED_RESOLUTION.get(specifier);
  if (published !== undefined) return { url: published, format: "module", shortCircuit: true };
  return nextResolve(specifier, context);
}

export { resolve_ as resolve };
