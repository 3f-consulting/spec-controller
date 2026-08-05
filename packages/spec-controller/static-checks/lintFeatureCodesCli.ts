/**
 * CLI entry point for the feature-code lint. Run via `pnpm lint:feature-codes`
 * in CI: it discovers the repo's feature files, lints their header codes
 * against the registry, and exits non-zero on any violation.
 */

import { lintFeatureCodes } from "./featureCodes.js";

const result = lintFeatureCodes();

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
