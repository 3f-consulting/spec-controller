/**
 * `## Scenario code errors` (3F-3635) — the corpus's misfiled codes, each by its handle and what
 * to do about it, or the statement that there are none.
 *
 * ITS OWN MODULE, for `runVerdict.ts`'s reason: `markdown.ts` is far past the size a touched file
 * is held to, and a self-contained emitter travels with its own arms.
 *
 * IT SITS BESIDE `## Run integrity`, ahead of the summary views, because like the unsound stamp it
 * is a caveat on every cut beneath it — the by-feature one above all, which groups on the very
 * codes listed here. It speaks whenever a corpus was judged, and never blank: clean codes are a
 * finding too, stated with the population they were found over (@SCN-STG-021). A reconciliation
 * composed from parsed scenarios carries no `scenarioCodeErrors`, and there is nothing to say.
 *
 * THE POPULATION IS THE JUDGEMENT'S OWN (3F-3666): `scenarioCodePopulation`, counted from the
 * files the codes were judged over and saved in the JSON, so a re-render states it unchanged. It
 * holds two counts because they differ as soon as one file carries no code. The feature-name map
 * lists coded files only, so a count taken from it states the wrong population.
 */

import type { RenderInput } from "../assemble/renderInput.js";
import type { ScenarioCodePopulation } from "../domain/scenarioCodeError.js";

/** Said on every judged run, errors or none: a duplicate belongs on its account, not here. */
const DUPLICATE_LINE =
  "A duplicated @SCN code is not listed here: it is reported on its account's rows, as `duplicate-scn-code`.";

/** `1 feature file`, `3 feature codes`: a count and its noun, never one count for two nouns. */
function counted(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

function cleanStatement(population: ScenarioCodePopulation | undefined): string {
  const inFile = "every coded scenario sits in the file its code names";
  // A report saved before the population was recorded: clean, with no numbers it does not have.
  if (population === undefined) return `Scenario codes are clean, and ${inFile}.`;
  const { featureFiles, featureCodes } = population;
  // Nothing was judged, so nothing is certified: an empty corpus is not a clean one (3F-3666).
  if (featureFiles === 0) return "No feature file was judged, so this section vouches for no scenario code.";
  const over = `Scenario codes are clean over ${counted(featureFiles, "feature file")} carrying ${counted(featureCodes, "feature code")}`;
  if (featureCodes === 0) return `${over}: no scenario in ${featureFiles === 1 ? "it" : "them"} carries an @SCN code to misfile.`;
  if (featureCodes === featureFiles) return `${over}: each file carries a code of its own, and ${inFile}.`;
  const uncoded = featureFiles - featureCodes;
  return (
    `${over}: each code is carried by exactly one file, ${inFile}, and the other ${uncoded} ` +
    `${uncoded === 1 ? "holds" : "hold"} no coded scenario.`
  );
}

export const scenarioCodeErrorsSection = (report: RenderInput): string[] => {
  if (report.scenarioCodeErrors === undefined) return [];
  const errors = report.scenarioCodeErrors;
  if (errors.length === 0) {
    return ["## Scenario code errors", "", cleanStatement(report.scenarioCodePopulation), "", DUPLICATE_LINE, ""];
  }
  const count =
    errors.length === 1 ? "1 scenario code error" : `${errors.length} scenario code errors`;
  return [
    "## Scenario code errors",
    "",
    `${count} — each misfiles a scenario code, so the by-feature cut below cannot be trusted, and ` +
      "the run fails (exit 1). Every account still reconciles as it would if the code were filed " +
      "correctly.",
    "",
    ...errors.map((error) => `- \`${error.kind}\` — ${error.message}`),
    "",
    DUPLICATE_LINE,
    "",
  ];
};
