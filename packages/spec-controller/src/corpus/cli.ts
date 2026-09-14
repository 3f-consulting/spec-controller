/**
 * The `tags` command — `spec-controller tags`, the `@SCN` scheme policing itself over a
 * target's Gherkin corpus.
 *
 * THIS EDGE OWNS ONLY THE READS. The rule is `corpusFaults`, in core, reached through the ROOT
 * barrel and nothing else: `./internal` is dropped by `publishConfig.exports` at pack time, and
 * this module travels in the tarball. That is not a style preference — an installed
 * `balance --help` once threw ERR_PACKAGE_PATH_NOT_EXPORTED behind thirteen green gates because a
 * published module reached that subpath (3F-3086). So what happens here is: discover the corpus,
 * read the manifest, build the mutation-record reader, hand over the bytes.
 *
 * ITS OWN COMMAND RATHER THAN A `balance` FLAG. `balance`'s exit code IS its verdict — 0
 * balanced, 1 out of balance, 3 pending-under-strict, 4 unsound, 5 nothing to reconcile — and a
 * corpus FAULT is not a reconciliation verdict. A flag would either overload one of those codes or
 * add a further meaning to a status a consumer's CI branches on. A second command costs one registry entry and gives
 * the fault its own ladder:
 *
 *   0 — the corpus obeys the scheme.
 *   1 — findings; the corpus was read and it breaks a rule.
 *   2 — the corpus (or the manifest) could not be READ at all. Not a verdict, because nothing was
 *       concluded. Sibling to @SCN-CLI-014/015/016 on `balance`, and the same argument: an input
 *       the tool cannot read is a usage error, never a verdict.
 *
 * Usage:
 *   spec-controller tags [--features <dir>] [--package-json <path>]
 */

import { existsSync, readFileSync } from "node:fs";

import { corpusFaults } from "@3f-consulting/spec-controller-core";

import { cliRegistry, renderCommandHelp } from "../cli-registry.js";
import { checkUnknownFlags, parseArgs } from "../cli-args.js";
import { DEFAULT_DEFERRAL_TAGS } from "../deferralTags.js";
import { UnreadableFeatureCorpusError } from "../ingest/gherkinValidation.js";
import { discoverFeatures } from "../ingest/ingestScenarios.js";
import { killFloorReaderFor } from "../ingest/ingestQualityChecks.js";
import { resolveTargetRoot, resolveToolIdentity } from "../run-management/resolveRunInputs.js";

/** The corpus and the manifest, or the reason neither could be read. */
type CorpusInputs =
  | {
      ok: true;
      features: { slug: string; featureCode: string | null; source: string }[];
      packageJson: Record<string, unknown>;
      root: string;
    }
  | { ok: false; error: string };

/**
 * Read everything the rule takes, or say why it could not be read.
 *
 * ONE PLACE, ONE STATUS, because it is one Rule. A corpus the Gherkin parser rejects, a features
 * directory that is not there, and a manifest that is not JSON are three spellings of "the tool
 * could not read its input" — and every one of them, left to escape, lands on Node's default exit
 * 1, which is this command's code for FINDINGS. A crashed invocation would then be
 * indistinguishable by status from a corpus that genuinely breaks a rule, which is exactly the
 * collision 3F-1742 closed on `balance`.
 *
 * THE PARSE REFUSAL IS INHERITED, NOT RESTATED (@SCN-GPG-001). `discoverFeatures` refuses a corpus
 * cucumber could not run rather than returning one, so this command gets that refusal by going
 * through the shared discovery — the same way `balance` does — and what is left here is turning
 * it into this command's status. Its message carries the parser's own words verbatim.
 *
 * THE SOURCES ARE READ HERE because the rule is pure and takes bytes. `DiscoveredFeature` carries
 * the header code and the scenario ids but not the file's text, and the grammar rules that follow
 * this one need the text to walk the tags.
 */
function readCorpusInputs(featuresDir: string | undefined, manifestPath: string): CorpusInputs {
  try {
    const discovered = featuresDir === undefined ? discoverFeatures() : discoverFeatures(featuresDir);
    return {
      ok: true,
      features: discovered.map((f) => ({
        slug: f.slug,
        featureCode: f.featureCode,
        source: readFileSync(f.path, "utf8"),
      })),
      packageJson: existsSync(manifestPath)
        ? (JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>)
        : {},
      root: resolveTargetRoot({ features: featuresDir }),
    };
  } catch (err) {
    if (err instanceof UnreadableFeatureCorpusError) return { ok: false, error: err.message };
    const failure = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `The corpus could not be read: ${failure}` };
  }
}

/**
 * Police a target's corpus against the `@SCN` scheme's own rules.
 *
 * `process.exitCode` RATHER THAN `process.exit`, so whatever has been written is flushed intact
 * rather than truncated mid-write — the convention `balance`'s own gate settled on.
 */
export function runTags(argv: string[]): void {
  // Answer `--help`/`-h` from the registry BEFORE any parse, so it never falls through as a stray
  // flag while the command runs anyway. The registry is the single source, so a flag that exists
  // is a flag that appears in help — there is no hand-kept list here to drift.
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(renderCommandHelp(cliRegistry, "tags") + "\n");
    return;
  }

  const args = parseArgs(argv);

  // Registry-bounded parse (@SCN-CLI-009's rule, applied to this command's own scope): `tags`
  // accepts ONLY the flags its registry entry lists. By construction, not by assertion — the
  // helper is the one `balance` uses, given this command's name.
  const unknownFlagError = checkUnknownFlags(args, cliRegistry, "tags", resolveToolIdentity().toolVersion);
  if (unknownFlagError) {
    process.stderr.write(unknownFlagError + "\n");
    process.exitCode = 2;
    return;
  }

  // `--package-json` defaults to the manifest at the cwd, matching `balance`'s default: the
  // target is the tree you are standing in unless you say otherwise.
  const inputs = readCorpusInputs(args["features"], args["package-json"] ?? "package.json");
  if (!inputs.ok) {
    process.stderr.write(inputs.error + "\n");
    process.exitCode = 2;
    return;
  }

  const faults = corpusFaults({
    features: inputs.features,
    packageJson: inputs.packageJson,
    // The STARTER deferral set — the application layer's own policy, which a target's config may
    // only extend. Single-sourced here for the reason the reconcile composition takes it as a
    // parameter: which words the community recognises is the product's answer, not the engine's.
    deferralTags: DEFAULT_DEFERRAL_TAGS,
    killFloor: killFloorReaderFor(inputs.root),
  });

  if (faults.length === 0) {
    process.stdout.write(
      "tags: OK — every feature code names one feature file, and every tag on the corpus obeys the @SCN scheme's own rules.\n",
    );
    return;
  }

  process.stderr.write(`tags: FAILED — ${faults.length} finding(s):\n`);
  for (const fault of faults) process.stderr.write(`  ${fault.message}\n`);
  process.exitCode = 1;
}
