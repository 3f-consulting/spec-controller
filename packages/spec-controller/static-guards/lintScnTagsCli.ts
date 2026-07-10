/**
 * CLI entry point for the tier-tag floor guard. Run via `pnpm lint:scn-tags` in
 * CI: it discovers the repo's feature files (via `discoverFeatures`), reads each
 * file's SOURCE — since `DiscoveredFeature.scenarioCodes` carries only the @SCN
 * ids, not the per-scenario tag blocks the floor needs — and flags every scenario
 * that carries an @SCN-<FFF>-<NNN> but declares no evidence tier and is not @wip.
 * Exits non-zero, naming every tier-less offender, if any is found; exits 0 over a
 * compliant tree.
 *
 * The tier-tag floor over spec-controller's OWN scenarios (the cobbler's shoes).
 * Mirrors `lint:feature-codes` / `lint:no-committed-reports`: a pure function of
 * the checked-out tree, a full CI gate on every push. The guard is @lint-declared
 * (`@lint=lint:scn-tags` on @SCN-STG-001) so the tool's own ledger reconciles it —
 * not an unattributed static-guard.
 *
 * An optional `--features <dir>` overrides the default features/ directory (the
 * @integration fixtures pass a planted dir; the real-tree gate takes the default).
 */

import { readFileSync } from "node:fs";
import { discoverFeatures } from "../src/ingest/ingestScenarios.js";
import { lintScnTags, type FeatureFileSource } from "./scnTags.js";

/** The features dir from an optional `--features <dir>` flag, or undefined. */
function featuresDirArg(argv: readonly string[]): string | undefined {
  const i = argv.indexOf("--features");
  if (i !== -1) {
    const next = argv[i + 1];
    if (next !== undefined && next !== "") return next;
  }
  return undefined;
}

const dir = featuresDirArg(process.argv.slice(2));
const discovered = dir === undefined ? discoverFeatures() : discoverFeatures(dir);
const sources: FeatureFileSource[] = discovered.map((f) => ({
  slug: f.slug,
  source: readFileSync(f.path, "utf8"),
}));

const result = lintScnTags(sources);

if (result.ok) {
  console.log(
    "scn-tags lint: OK — every @SCN scenario declares an evidence tier (or is @wip)."
  );
  process.exit(0);
}

console.error(
  `scn-tags lint: FAILED — ${result.violations.length} scenario(s) declare an @SCN but no evidence tier (and are not @wip):`
);
for (const v of result.violations) {
  console.error(`  ${v.message}`);
}
process.exit(1);
