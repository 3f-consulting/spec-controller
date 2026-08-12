/**
 * CLI entry point for the tier-tag floor static check. Run via `pnpm lint:scn-tags` in
 * CI: it discovers the repo's feature files (via `discoverFeatures`), reads each
 * file's SOURCE — since `DiscoveredFeature.scenarioCodes` carries only the @SCN
 * ids, not the per-scenario tag blocks the floor needs — and flags every scenario
 * that carries an @SCN-<FFF>-<NNN> but NAMES no evidence tier and is not PARKED.
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
import { resolveDeferralTags, resolveCheckRegistry } from "../src/ingest/ingestQualityChecks.js";
import { registeredCheckTags } from "@3f-consulting/spec-controller-core/internal";
import { lintScnTags, type FeatureFileSource } from "./scnTags.js";

/** The target's own `package.json` — the config both resolvers below read, read once. */
interface TargetPackageJson {
  specController?: { deferralTags?: unknown; checkRegistry?: unknown };
}

/**
 * The target's `package.json`, or an empty object where there is none.
 *
 * The disk read stays HERE rather than in `scnTags.ts`, which imports nothing — that is what
 * keeps its dependency from `vocabAudit` (@SCN-VOC-013) one-way and cycle-free.
 */
function targetPackageJson(): TargetPackageJson {
  if (!existsSync("package.json")) return {};
  return JSON.parse(readFileSync("package.json", "utf8")) as TargetPackageJson;
}

/**
 * The recognised community deferral tags for the tree being checked (@SCN-STG-002) —
 * `DEFAULT_DEFERRAL_TAGS` extended by the target's `specController.deferralTags`, via the
 * SAME resolver the ingest edge uses (@SCN-PND-021). The unrecognised-tag question must
 * not answer differently from the product's own policy, so the set is resolved rather
 * than restated.
 *
 * IT IS ALSO THE PARKING SET (@SCN-STG-008), and this line is where the community default
 * enters. `lintScnTags` names no community tag and parks nothing it is not handed; what makes
 * `@wip` still work for a target that configures nothing is the starter list INSIDE this
 * resolver, in the application layer that owns product policy. Reading the config here rather
 * than there is what keeps `scnTags.ts` import-free — which is what keeps `vocabTagGrammar.ts`'s
 * dependency on its `isTierTag` one-way and cycle-free.
 */
function recognisedDeferralTags(packageJson: TargetPackageJson): readonly string[] {
  return resolveDeferralTags(packageJson);
}

/**
 * The BARE CHECK TAGS the target registers (@SCN-STG-005) — the tags a stepless fitness scenario
 * may satisfy the floor with, read through the SAME resolver the reconciler reads its registry with
 * (@SCN-LNT-005), so the floor admits exactly what the obligation rule raises against. Two readers
 * of one config key would each decide independently which words name a check, and a scenario the
 * floor accepted while the engine raised nothing for it would be tier-named and evidence-free.
 *
 * Absent, malformed or empty config yields NO tags, and the floor then behaves exactly as it did
 * before — the defensive stance lives in the resolver, alongside the deferral reader's.
 */
function registryCheckTags(packageJson: TargetPackageJson): readonly string[] {
  return registeredCheckTags(resolveCheckRegistry(packageJson));
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

const packageJson = targetPackageJson();
const result = lintScnTags(
  sources,
  recognisedDeferralTags(packageJson),
  registryCheckTags(packageJson)
);

if (result.ok) {
  console.log(
    "scn-tags lint: OK — every @SCN scenario names an evidence tier (or is parked), every tag on it is grammar, and no stepless fitness scenario claims more than one check."
  );
  process.exit(0);
}

console.error(
  `scn-tags lint: FAILED — ${result.violations.length} finding(s): a scenario naming an @SCN but no evidence tier (and not parked), a tag that is neither a tier nor a recognised deferral tag, or a stepless fitness scenario claiming more than one check:`
);
for (const v of result.violations) {
  console.error(`  ${v.message}`);
}
process.exit(1);
