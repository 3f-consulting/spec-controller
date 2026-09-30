import type { RenderInput } from "../assemble/renderInput.js";
import type { ScenarioCodePopulation } from "../domain/scenarioCodeError.js";

const DUPLICATE_LINE =
  "A duplicated @SCN code is not listed here: it is reported on its account's rows, as `duplicate-scn-code`.";

function counted(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

function cleanStatement(population: ScenarioCodePopulation | undefined): string {
  const inFile = "every coded scenario sits in the file its code names";
  if (population === undefined) return `Scenario codes are clean, and ${inFile}.`;
  const { featureFiles, featureCodes } = population;
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
