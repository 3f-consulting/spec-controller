import type { RenderInput } from "../domain/report.js";
import { scenarioCodeErrorsFraming, type ScenarioCodePopulation } from "../domain/scenarioCodeError.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";

function counted(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

function cleanStatement(population: ScenarioCodePopulation | undefined): string {
  if (population === undefined) return CORE_MESSAGES[CoreMessage.ScenarioCodesClean];
  const { featureFiles, featureCodes } = population;
  if (featureFiles === 0) return CORE_MESSAGES[CoreMessage.NoFeatureFileJudged];
  const over = CORE_MESSAGES[CoreMessage.ScenarioCodesCleanOver](
    counted(featureFiles, CORE_MESSAGES[CoreMessage.FeatureFileNoun]),
    counted(featureCodes, CORE_MESSAGES[CoreMessage.FeatureCodeNoun])
  );
  if (featureCodes === 0) {
    const them = featureFiles === 1 ? CORE_MESSAGES[CoreMessage.ItPronoun] : CORE_MESSAGES[CoreMessage.ThemPronoun];
    return CORE_MESSAGES[CoreMessage.CleanNoCodedScenario](over, them);
  }
  if (featureCodes === featureFiles) return CORE_MESSAGES[CoreMessage.CleanEachFileOwnCode](over);
  const noFeatureCode = featureFiles - featureCodes;
  const hold = noFeatureCode === 1 ? CORE_MESSAGES[CoreMessage.HoldsVerb] : CORE_MESSAGES[CoreMessage.HoldVerb];
  return CORE_MESSAGES[CoreMessage.CleanOthersNoFeatureCode](over, noFeatureCode, hold);
}

export const scenarioCodeErrorsSection = (report: RenderInput): string[] => {
  if (report.scenarioCodeErrors === undefined) return [];
  const errors = report.scenarioCodeErrors;
  const heading = CORE_MESSAGES[CoreMessage.ScenarioCodeErrorsHeading];
  const duplicateLine = CORE_MESSAGES[CoreMessage.DuplicateScnCodeNotListed];
  if (errors.length === 0) {
    return [heading, "", cleanStatement(report.scenarioCodePopulation), "", duplicateLine, ""];
  }
  const count =
    errors.length === 1
      ? CORE_MESSAGES[CoreMessage.OneScenarioCodeError]
      : CORE_MESSAGES[CoreMessage.ScenarioCodeErrorCount](errors.length);
  return [
    heading,
    "",
    scenarioCodeErrorsFraming(errors, count),
    "",
    ...errors.map((error) => `- \`${error.kind}\` — ${error.message}`),
    "",
    duplicateLine,
    "",
  ];
};
