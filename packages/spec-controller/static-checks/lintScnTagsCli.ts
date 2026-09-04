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
 * Mirrors `lint:feature-codes` / `hygiene:no-committed-reports`: a pure function of
 * the checked-out tree, a full CI gate on every push. The static check is @lint-cited
 * (`@lint=lint:scn-tags` on @SCN-STG-001) so the tool's own ledger reconciles it —
 * not an uncited static-check.
 *
 * An optional `--features <dir>` overrides the default features/ directory (the
 * @integration fixtures pass a planted dir; the real-tree gate takes the default).
 */

import { existsSync, readFileSync } from "node:fs";
import { discoverFeatures } from "../src/ingest/ingestScenarios.js";
import { UnreadableFeatureCorpusError } from "../src/ingest/gherkinValidation.js";
import { killFloorReaderFor } from "../src/ingest/ingestQualityChecks.js";
import { DEFAULT_DEFERRAL_TAGS } from "../src/deferralTags.js";
import {
  registeredCheckTags,
  measuredCheckTags,
  resolveDeferralTags,
  resolveCheckRegistry,
  resolveThresholds,
} from "@3f-consulting/spec-controller-core/internal";
import { lintScnTags, type FeatureFileSource } from "./scnTags.js";

/** The target's own `package.json` — the config every resolver below reads, read once. */
export interface TargetPackageJson {
  specController?: { deferralTags?: unknown; checkRegistry?: unknown; thresholds?: unknown };
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
  return resolveDeferralTags(packageJson, DEFAULT_DEFERRAL_TAGS);
}

/**
 * The BARE CHECK TAGS a fitness scenario may satisfy the floor with, steps or none
 * (@SCN-STG-005; the "stepless" qualifier this line carried is retired with 3F-3126) —
 * read through the SAME resolvers the reconciler reads them with (@SCN-LNT-005), so the floor
 * admits exactly what the obligation rule raises against. Two readers of one config key would
 * each decide independently which words name a check, and a scenario the floor accepted while
 * the engine raised nothing for it would be tier-named and evidence-free.
 *
 * TWO SETS, UNIONED, WHICH IS THE OBLIGATION RULE'S OWN READING (@SCN-STG-009, and
 * `ingestQualityChecks`'s `obligationTags` one file over). A MEASURED check is held against an
 * authored ceiling and nothing invokes it, so it has no runnable script handle and the registry
 * can never carry it; the only place it is named is the target's thresholds. Read from the
 * registry alone this floor reds a stepless `@ci-run-time` scenario for naming no tier — on the
 * very tag its own obligation was raised from.
 *
 * Absent, malformed or empty config yields NO tags from either, and the floor then behaves
 * exactly as it did before — the defensive stance lives in the resolvers, alongside the
 * deferral reader's.
 *
 * THE ROOT IS THE WORKING DIRECTORY BECAUSE THE MANIFEST WAS READ FROM IT (@SCN-MUT-012). A bar
 * may name a mutation gate whose record the threshold resolver has to open, and that record
 * belongs to whichever tree the manifest came from — which here is `targetPackageJson`'s bare
 * relative read, so the two cannot answer for different trees.
 */
export function floorCheckTags(packageJson: TargetPackageJson): readonly string[] {
  return [
    ...new Set([
      ...registeredCheckTags(resolveCheckRegistry(packageJson)),
      ...measuredCheckTags(resolveThresholds(packageJson, killFloorReaderFor("."))),
    ]),
  ];
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

/**
 * The corpus this run is held over, or a REFUSAL if the Gherkin parser rejects any file in it
 * (@SCN-GPG-002, 3F-2817).
 *
 * EXIT 2, NOT 1, AND THE DISTINCTION IS THE POINT. Exit 1 is this floor's verdict — a scenario
 * names an @SCN and no evidence tier. A refusal is not a verdict: nothing was concluded, because
 * the input could not be read. Exit 2 is already this repository's status for exactly that
 * (@SCN-CLI-014/015/016), so a caller can tell "your scenarios are untiered" from "your feature
 * files are unreadable" by status alone.
 *
 * The parser's own words, verbatim, and as a SENTENCE: an uncaught throw would reach the operator
 * as Node's stack frames under Node's own exit 1 — the verdict status, wearing a crash.
 */
function corpusSources(dir: string | undefined): FeatureFileSource[] {
  try {
    const discovered = dir === undefined ? discoverFeatures() : discoverFeatures(dir);
    return discovered.map((f) => ({ slug: f.slug, source: readFileSync(f.path, "utf8") }));
  } catch (err) {
    if (err instanceof UnreadableFeatureCorpusError) {
      console.error(err.message);
      process.exit(2);
    }
    throw err;
  }
}

/** Read the tree, resolve the target's two sets, and exit on the floor's verdict. */
export function runScnTagsLint(argv: readonly string[]): void {
  const sources = corpusSources(featuresDirArg(argv));

  const packageJson = targetPackageJson();
  const result = lintScnTags(
    sources,
    recognisedDeferralTags(packageJson),
    floorCheckTags(packageJson)
  );

  if (result.ok) {
    console.log(
      "scn-tags lint: OK — every @SCN scenario names an evidence tier (or is parked), every tag on it is grammar, and no scenario claims more than one check."
    );
    process.exit(0);
  }

  console.error(
    `scn-tags lint: FAILED — ${result.violations.length} finding(s): a scenario naming an @SCN but no evidence tier (and not parked), a tag that is neither a tier nor a recognised deferral tag, or a scenario claiming more than one check:`
  );
  for (const v of result.violations) {
    console.error(`  ${v.message}`);
  }
  process.exit(1);
}

// Run only when invoked as the script, so the @unit arm can import the resolver above without
// the gate reconciling a tree as a side effect of the import (the lintScnSubIssuesCli convention).
const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`;

if (invokedDirectly) runScnTagsLint(process.argv.slice(2));
