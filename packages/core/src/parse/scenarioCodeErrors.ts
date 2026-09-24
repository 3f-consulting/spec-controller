/**
 * THE SCENARIO CODE ERRORS (3F-3635) — everything about a feature CODE binding to a feature FILE,
 * asked of the corpus `balance` reads. A code is an account number and its file the account class:
 * these rules say whether each code is filed under a class that exists, and whether each class
 * has exactly one number.
 *
 * THE PAIR BELOW IS ONE RULE READ FROM BOTH ENDS. `duplicateFeatureCodes` holds one code to one
 * file; `foreignScenarioCodes` holds a file's scenarios to the code that file carries. Together
 * they are what the hand-kept 33-entry allocation table was really enforcing — this code belongs
 * to this file — asked of the corpus about itself rather than of a second list a consumer has
 * never seen.
 */

import { featureCodeOf } from "../lib/featureCode.js";
import type { ScenarioCodeError } from "../domain/scenarioCodeError.js";
import { parseTaggedScenarios } from "./scenarios.js";

/**
 * One discovered feature file, as the ingest edge read it.
 *
 * THE HEADER CODE ARRIVES; IT IS NEVER RE-DERIVED HERE. It is read by exactly one thing — the
 * ingest edge's `extractFeatureCode` — and that is also the reading the report's by-feature cut
 * groups on, so these rules and the report cannot disagree about the very field the rules are ABOUT.
 */
export interface CorpusFile {
  /** The feature-file basename without the `.feature` extension. */
  slug: string;
  /** The file's `@<FFF>` header code, or null where it carries none. */
  featureCode: string | null;
  /** The file's raw Gherkin source, read once at the edge. */
  source: string;
}

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
 * AN UNCODED FILE IS NOT THIS RULE'S. `null` is skipped rather than treated as a code two files
 * could share; a file with no header code whose scenarios carry codes is `no-feature-code`'s.
 */
export function duplicateFeatureCodes(features: readonly CorpusFile[]): ScenarioCodeError[] {
  const filesByCode = new Map<string, string[]>();
  for (const file of features) {
    if (file.featureCode === null) continue;
    filesByCode.set(file.featureCode, [
      ...(filesByCode.get(file.featureCode) ?? []),
      `${file.slug}.feature`,
    ]);
  }

  const faults: ScenarioCodeError[] = [];
  for (const [code, files] of filesByCode) {
    if (files.length < 2) continue;
    faults.push({
      kind: "duplicate-feature-code",
      files,
      message:
        `the feature code @${code} is carried by ${files.length} feature ` +
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
 * AN UNCODED FILE RAISES NOTHING HERE: with no header there is nothing for an id to be foreign
 * TO, and the file itself is `no-feature-code`'s.
 *
 * AND AN ID `featureCodeOf` CANNOT PARSE RAISES NOTHING HERE — a Named limit, not a claim that
 * something else reports it. Measured (3F-3635): `@SCN-TOOLONGCODE-001` in a `@ONE` file is read
 * by the scenario reader as an ordinary account and reconciles satisfied, while this rule, which
 * needs the id's feature part, skips it. Which reader's answer the tree should hold is 3F-3636's.
 *
 * The tag walk is `parseTaggedScenarios`, which inherits Feature- and Rule-level tags exactly as
 * cucumber does. A hand-rolled scan of the tag lines is the second reading that walk was
 * extracted to end, and it is what a rule ABOUT ids can least afford: an id hoisted to a `Rule:`
 * belongs to every scenario beneath it, and a scan that missed that would pass over the file.
 */
export function foreignScenarioCodes(features: readonly CorpusFile[]): ScenarioCodeError[] {
  const faults: ScenarioCodeError[] = [];
  for (const file of features) {
    if (file.featureCode === null) continue;
    for (const scenario of parseTaggedScenarios(file.source)) {
      const named = featureCodeOf(scenario.scnId);
      if (named === null || named === file.featureCode) continue;
      faults.push({
        kind: "foreign-scn-code",
        files: [`${file.slug}.feature`],
        message:
          `${file.slug}.feature carries the feature code ` +
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

/**
 * A feature file carrying no header code while its scenarios carry codes (3F-3635; absorbs the
 * cancelled 3F-3314). The file is an account class with no number, so the by-feature cut files its
 * scenarios under whatever their ids happen to name.
 *
 * "CARRIES A CODE" IS THE ACCOUNT READER'S ANSWER, NOT `featureCodeOf`'s (operator ruling,
 * 2026-09-24). `parseTaggedScenarios` is the walk the ledger's accounts are minted from, so a
 * scenario it reads is an account, whether or not its feature part is one `featureCodeOf` accepts.
 * That is what catches a file headed `@TOOLONGCODE`: its header is no header code, and its
 * `@SCN-TOOLONGCODE-001` is still an account.
 *
 * ONE ERROR PER FILE, because the file is what the remedy changes: give it a header code.
 */
export function uncodedFeatureFiles(features: readonly CorpusFile[]): ScenarioCodeError[] {
  return features
    .filter((file) => file.featureCode === null && parseTaggedScenarios(file.source).length > 0)
    .map((file) => ({
      kind: "no-feature-code" as const,
      files: [`${file.slug}.feature`],
      message:
        `${file.slug}.feature carries no feature code, but its scenarios carry @SCN codes. A feature ` +
        `file is the class its scenarios' codes are filed under: give it a header code of its own, ` +
        `and code its scenarios for it.`,
    }));
}

/**
 * Every scenario code error in this corpus, in a stable order (3F-3635).
 */
export function scenarioCodeErrorsOf(features: readonly CorpusFile[]): ScenarioCodeError[] {
  return [
    ...duplicateFeatureCodes(features),
    ...foreignScenarioCodes(features),
    ...uncodedFeatureFiles(features),
  ];
}
