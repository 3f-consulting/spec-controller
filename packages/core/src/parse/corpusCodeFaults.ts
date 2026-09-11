/**
 * THE CODE RULES of `spec-controller tags` — everything about a feature CODE binding to a feature
 * FILE. Its siblings hold the other two questions: `corpusGrammarFaults.ts` whether a tag on a
 * scenario means anything, `corpusClaimFaults.ts` how many checks one scenario may claim.
 * `corpusFaults.ts` composes the three and is the only entry point any of them has.
 *
 * WHY THE MODULE IS SPLIT AT ALL, AND WHY ON THIS SEAM. The rules were authored in one module and
 * that module reached the 400-line `max-lines` ceiling with four more grammar clauses still to
 * land. The ceiling is not negotiable and an exception entry would have bought silence rather than
 * a smaller module (@SCN-CPX-001), so the split is the answer canon already named. The seam is the
 * one the rules themselves have: a code rule asks *does this code name exactly one file, and is
 * this scenario written in the file its own code names* — questions answered from the corpus's
 * SHAPE, needing nothing about the target. A grammar rule asks *does this word mean anything
 * here*, and answers it off the target's own manifest. Two questions, two inputs, two modules.
 *
 * THE PAIR BELOW IS ONE RULE READ FROM BOTH ENDS. `duplicateFeatureCodes` holds one code to one
 * file; `foreignScenarioCodes` holds a file's scenarios to the code that file carries. Together
 * they are what the hand-kept 33-entry allocation table was really enforcing — this code belongs
 * to this file — asked of the corpus about itself rather than of a second list a consumer has
 * never seen.
 */

import { featureCodeOf } from "../lib/featureCode.js";
import type { CorpusFault, CorpusFile } from "./corpusFaults.js";
import { parseTaggedScenarios } from "./scenarios.js";

/**
 * A feature code carried by more than one feature file (@SCN-STG-010).
 *
 * THE FAULT IS THE PAIR, NOT EITHER FILE, which is why one finding names them all rather than
 * one finding naming each. Neither file is the offender: what is wrong is that a code names two
 * of them, and a message naming one has already decided which of the two should change.
 *
 * WHAT GOES WRONG WITHOUT IT, MEASURED. Over a corpus whose `one.feature` and `two.feature` both
 * carry `@TGT`, `balance` runs clean through and prints ONE by-feature row — `two (TGT)` —
 * claiming a scenario that lives in `one`. Not a red and not a warning: a report cell that says
 * something false, in the section a reader goes to first.
 *
 * AN UNCODED FILE IS NOT A FAULT HERE, and that is a scope line rather than an omission. A file
 * carrying no header code while its scenarios carry `@SCN` ids is admitted unchanged; whether
 * that should red is a policy question about gradual adoption, filed as its own ticket (3F-3314).
 * `null` is therefore skipped rather than treated as a code two files could share.
 */
export function duplicateFeatureCodes(features: readonly CorpusFile[]): CorpusFault[] {
  const filesByCode = new Map<string, string[]>();
  for (const file of features) {
    if (file.featureCode === null) continue;
    filesByCode.set(file.featureCode, [
      ...(filesByCode.get(file.featureCode) ?? []),
      `${file.slug}.feature`,
    ]);
  }

  const faults: CorpusFault[] = [];
  for (const [code, files] of filesByCode) {
    if (files.length < 2) continue;
    faults.push({
      kind: "duplicate-feature-code",
      message:
        `duplicate-feature-code: the feature code @${code} is carried by ${files.length} feature ` +
        `files — ${files.join(", ")}. A feature code names exactly one feature file: a ` +
        `reconciliation's by-feature cut groups on it, so two files sharing a code report as one ` +
        `row and attribute one file's scenarios to the other. Give one of them a code of its own.`,
    });
  }
  return faults;
}

/**
 * A scenario whose `@SCN` names a feature its own file is not (@SCN-STG-011).
 *
 * THE OTHER HALF OF THE PAIR ABOVE. That rule holds one code to one file; this one holds a
 * file's scenarios to the code that file carries.
 *
 * WHAT GOES WRONG WITHOUT IT, MEASURED. Over a corpus whose `@TGT`-headed file holds
 * `@SCN-ZZZ-001`, `balance` runs clean through and prints a by-feature row for a feature `ZZZ`
 * it INVENTED from the id alone — no file in the corpus carries that code — and the
 * feature-code lint over the same tree reports every code a header names unique and registered.
 * Silent in both readers, which is exactly the pair of places a reader looks.
 *
 * THE FINDING NAMES THREE THINGS AND ONE SCENARIO. The file and the id say where to go; the
 * code the file CARRIES is the half of the disagreement the author cannot read off the id, and
 * it is what decides which of the two remedies they want — re-code the scenario, or move it.
 * And it is raised per offending scenario, never per file: a file may hold many scenarios of
 * which one is wrong, and a finding naming the file alone convicts the rest of them.
 *
 * AN UNCODED FILE RAISES NOTHING, deliberately rather than by omission. A file carrying no
 * header code has nothing for an id to be foreign TO. Whether that should red is a policy
 * question about gradual adoption, filed as its own ticket (3F-3314) — and it is the same
 * `null`-is-not-a-code line the duplicate rule draws, drawn once more here so the two cannot
 * come to disagree about what an uncoded file is.
 *
 * AND A MALFORMED ID RAISES NOTHING EITHER, because something else already does. `featureCodeOf`
 * is the ONE owner of the `SCN-<FFF>-<NNN>` grammar in this engine, and an id it cannot parse
 * has no feature part to compare — that fault is `no-scn-code`, which a reconciliation raises
 * and names by id. A second diagnostic here would print one fault's remedy at the other's author.
 *
 * The tag walk is `parseTaggedScenarios`, which inherits Feature- and Rule-level tags exactly as
 * cucumber does. A hand-rolled scan of the tag lines is the second reading that walk was
 * extracted to end, and it is what a rule ABOUT ids can least afford: an id hoisted to a `Rule:`
 * belongs to every scenario beneath it, and a scan that missed that would pass over the file.
 */
export function foreignScenarioCodes(features: readonly CorpusFile[]): CorpusFault[] {
  const faults: CorpusFault[] = [];
  for (const file of features) {
    if (file.featureCode === null) continue;
    for (const scenario of parseTaggedScenarios(file.source)) {
      const named = featureCodeOf(scenario.scnId);
      if (named === null || named === file.featureCode) continue;
      faults.push({
        kind: "foreign-scenario-code",
        message:
          `foreign-scenario-code: ${file.slug}.feature carries the feature code ` +
          `@${file.featureCode}, but holds the scenario @${scenario.scnId}, whose feature part ` +
          `names ${named}. A scenario's code names the file it is written in: a ` +
          `reconciliation's by-feature cut groups on the id, so this one opens a row for a ` +
          `feature no file in the corpus carries and files the scenario under it. Re-code the ` +
          `scenario for @${file.featureCode}, or move it to the file headed @${named}.`,
      });
    }
  }
  return faults;
}
