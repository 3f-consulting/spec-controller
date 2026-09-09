/**
 * CLI entry point for the compatibility-page check (@SCN-FIT-015, 3F-3175).
 *
 * Run via `pnpm doc:compatibility-examples`, as the command of a `specController.fitnessChecks`
 * row. It reads `doc/compatibility.md`, hands every configuration block on it to the reader that
 * page states supports it, and names every entry that does not come back.
 *
 * THE SCRIPT HANDLE CARRIES NO OBSERVED PREFIX, AND THAT IS DELIBERATE (3F-3113). A `lint:` or
 * `guard:` name invoked by a CI `run:` step is DISCOVERED as a running static check, which would
 * put this back on the axis a converted check has left and report it as one nobody cited. A check
 * born converted has no history to preserve, so it takes a name discovery never looks at, and gets
 * a CI step whose `id:` is the code of the row that names it, which is a citation and not a
 * handle.
 *
 * ═══ TWO EXIT CODES, AND THERE IS NO THIRD ONE TO ADD ═══
 *
 * `0` clean, `1` violations. `doc/compatibility.md` is in the tree on every run, so its absence is
 * a fault rather than the ordinary state and exits `1` like any other violation.
 *
 * A COMMAND WHOSE SUBJECT IS SOMETIMES LEGITIMATELY ABSENT SAYS SO IN ITS OWN CI `run:` LINE —
 * `cmd || [ $? -eq 3 ]` — where it becomes an honest success the runner records (3F-3252). The
 * ledger never learns about endings: a step record carries a status and no exit code, so a row that
 * DECLARED one could only be read for whether it was named, and would forgive every skip.
 *
 * Parent: 3F-3154.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { discoverFeatures } from "../../packages/spec-controller/src/ingest/ingestScenarios.js";
import { compatibilityFindings } from "./compatibilityExamples.js";
import { REGISTRY } from "./featureCodes.js";

/** Where the commitment lives, relative to the tree being checked. */
const COMPATIBILITY_PAGE = path.join("doc", "compatibility.md");

function main(): void {
  const page = path.resolve(process.cwd(), COMPATIBILITY_PAGE);
  let markdown: string;
  try {
    markdown = readFileSync(page, "utf8");
  } catch {
    // A MISSING COMMITMENT IS A VIOLATION, never a quiet zero. The page is the whole subject; a run
    // that could not read it examined nothing, and saying so as a pass is the silence fault this
    // repository is named for.
    console.error(`compatibility examples: ${COMPATIBILITY_PAGE} could not be read`);
    process.exitCode = 1;
    return;
  }
  // THE CORPUS IS READ HERE, not in the pure module — the same split `lintScnTagsCli` makes, and
  // the reason this check can be unit-tested against a planted corpus without a directory.
  const findings = compatibilityFindings(markdown, {
    // ALLOCATED, not merely present. A feature code stays this repository's after its feature file
    // is deleted, so the registry is what says whose a cited scenario is — reading the corpus for
    // both halves would quietly stop checking a whole feature's citations the moment it retired.
    featureCodes: new Set(REGISTRY.map((entry) => entry.code)),
    scenarioCodes: new Set(discoverFeatures().flatMap((feature) => feature.scenarioCodes)),
  });
  if (findings.length === 0) {
    console.log(
      "compatibility examples: every documented block resolves through its own reader, and every scenario its examples name is in the corpus"
    );
    return;
  }
  console.error(
    `compatibility examples: ${findings.length} statement(s) on ${COMPATIBILITY_PAGE} this tree no longer bears out`
  );
  for (const finding of findings) {
    console.error(`  ${COMPATIBILITY_PAGE}:${finding.line} — ${finding.message}`);
  }
  process.exitCode = 1;
}

main();
