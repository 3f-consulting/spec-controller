/**
 * CLI entry point for the feature-code lint. Run via `pnpm lint:feature-codes`
 * in CI: it discovers the repo's feature files, lints their header codes
 * against the registry, and exits non-zero on any violation.
 *
 * AND REFUSES A CORPUS IT CANNOT READ (@SCN-GPG-002, 3F-2817). This is the ladder's FIRST
 * feature-file step (ci.yml:53), and `pnpm cucumber` — the only other reader with a parser in it
 * — is some thirteen steps later. So this edge is where a file cucumber cannot parse stops
 * collecting greens.
 */

import { lintFeatureCodes, type LintResult } from "./featureCodes.js";
import { UnreadableFeatureCorpusError } from "../../packages/spec-controller/src/ingest/gherkinValidation.js";

/**
 * The lint's verdict, or a REFUSAL if the corpus could not be read at all.
 *
 * EXIT 2, NOT 1, AND THE DISTINCTION IS THE POINT. Exit 1 is this check's verdict — findings
 * exist in your corpus. A refusal is not a verdict: nothing was concluded, because the input
 * could not be read. Exit 2 is already this repository's status for exactly that
 * (@SCN-CLI-014/015/016), so a caller can tell "your feature files are wrong" from "your feature
 * files are unreadable" by status alone.
 *
 * The parser's own words, verbatim, and as a SENTENCE: an uncaught throw would reach the operator
 * as Node's stack frames under Node's own exit 1 — the verdict status, wearing a crash.
 */
function corpusVerdict(): LintResult {
  try {
    return lintFeatureCodes();
  } catch (err) {
    if (err instanceof UnreadableFeatureCorpusError) {
      console.error(err.message);
      process.exit(2);
    }
    throw err;
  }
}

/** Read the tree and exit on the lint's verdict — or on its refusal to reach one. */
export function runFeatureCodesLint(): void {
  const result = corpusVerdict();

  if (result.uncoded.length > 0) {
    console.log(`feature-code lint: uncoded features (informational): ${result.uncoded.join(", ")}`);
  }

  if (result.ok) {
    console.log("feature-code lint: OK — every feature code a header names is unique and registered.");
    process.exit(0);
  }

  console.error("feature-code lint: FAILED");
  for (const v of result.violations) {
    console.error(`  [${v.kind}] ${v.message}`);
  }
  process.exit(1);
}

// Run only when invoked as the script, so the @unit arm can import the run above without the
// gate reconciling a tree as a side effect of the import (the lintScnTagsCli convention).
const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`;

if (invokedDirectly) runFeatureCodesLint();
