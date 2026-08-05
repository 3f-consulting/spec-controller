/**
 * CLI entry point for the tier-tag floor static check. Run via `pnpm lint:scn-tags` in
 * CI: it discovers the repo's feature files (via `discoverFeatures`), reads each
 * file's SOURCE — since `DiscoveredFeature.scenarioCodes` carries only the @SCN
 * ids, not the per-scenario tag blocks the floor needs — and flags every scenario
 * that carries an @SCN-<FFF>-<NNN> but NAMES no evidence tier and is not @wip.
 * Exits non-zero, naming every tier-less offender, if any is found; exits 0 over a
 * compliant tree.
 *
 * The tier-tag floor over spec-controller's OWN scenarios (the cobbler's shoes).
 * Mirrors `lint:feature-codes` / `lint:no-committed-reports`: a pure function of
 * the checked-out tree, a full CI gate on every push. The static check is @lint-cited
 * (`@lint=lint:scn-tags` on @SCN-STG-001) so the tool's own ledger reconciles it —
 * not an uncited static-check.
 *
 * An optional `--features <dir>` overrides the default features/ directory (the
 * @integration fixtures pass a planted dir; the real-tree gate takes the default).
 */

import { existsSync, readFileSync } from "node:fs";
import { discoverFeatures } from "../src/ingest/ingestScenarios.js";
import { resolveDeferralTags } from "../src/ingest/ingestQualityChecks.js";
import { lintScnTags, type FeatureFileSource } from "./scnTags.js";

/**
 * The recognised community deferral tags for the tree being checked (@SCN-STG-002) —
 * `DEFAULT_DEFERRAL_TAGS` extended by the target's `specController.deferralTags`, via the
 * SAME resolver the ingest edge uses (@SCN-PND-021). The unrecognised-tag question must
 * not answer differently from the product's own policy, so the set is resolved rather
 * than restated, and the disk read stays HERE: `scnTags.ts` imports nothing, which is
 * what keeps its dependency from `vocabAudit` (@SCN-VOC-013) one-way and cycle-free.
 */
function recognisedDeferralTags(): readonly string[] {
  const packageJson = existsSync("package.json")
    ? (JSON.parse(readFileSync("package.json", "utf8")) as {
        specController?: { deferralTags?: unknown };
      })
    : {};
  return resolveDeferralTags(packageJson);
}

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

const result = lintScnTags(sources, recognisedDeferralTags());

if (result.ok) {
  console.log(
    "scn-tags lint: OK — every @SCN scenario names an evidence tier (or is @wip), and every tag on it is grammar."
  );
  process.exit(0);
}

console.error(
  `scn-tags lint: FAILED — ${result.violations.length} finding(s): a scenario naming an @SCN but no evidence tier (and not @wip), or a tag that is neither a tier nor a recognised deferral tag:`
);
for (const v of result.violations) {
  console.error(`  ${v.message}`);
}
process.exit(1);
