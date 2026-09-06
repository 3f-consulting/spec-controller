/**
 * CLI entry point for the anemic-domain static check. Run via `pnpm lint:anemic-domain`
 * in CI: it reads the repo's TRACKED files, and exits non-zero — naming every offending
 * module and the word that condemned it — if any domain module is named for a procedural
 * layer. Over a clean tree it exits 0.
 *
 * TRACKED FILES, NOT A FILESYSTEM WALK. An untracked scratch file is not part of the
 * design, and a check that redded on one would be reding the author's working directory
 * rather than the repository. `git ls-files` reads the index, so a staged plant is
 * visible — which is what makes proving the teeth a one-line setup.
 *
 * Mirrors `lint:scn-tags`: a pure decision (`anemicDomain.ts`, `scnTags.ts`) plus a thin edge
 * that supplies the real input. The static check is @lint-cited (`@lint=lint:anemic-domain` on
 * @SCN-ANM-001) so the tool's own ledger reconciles it — not an uncited static check. The
 * `lint:` prefix is required rather than cosmetic: `runningStaticChecks` observes a CI
 * script only when its name carries an observed prefix.
 */

import { execFileSync } from "node:child_process";
import { findProceduralLayerModules } from "./anemicDomain.js";

/** Every file tracked in the repo, repo-relative. */
function trackedFiles(): string[] {
  const out = execFileSync("git", ["ls-files"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return out
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

const violations = findProceduralLayerModules(trackedFiles());

if (violations.length === 0) {
  console.log(
    "anemic-domain lint: OK — no domain module is named for a procedural layer (a concept owns its own behaviour).",
  );
  process.exit(0);
}

console.error(
  `anemic-domain lint: FAILED — ${violations.length} domain module(s) named for a procedural layer. A concept owns its own behaviour; behaviour lifted into a module beside it leaves the concept as inert data:`,
);
for (const violation of violations) {
  console.error(`  ${violation.path} — named for the "${violation.word}" layer`);
}
process.exit(1);
