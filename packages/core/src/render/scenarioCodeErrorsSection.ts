import type { RenderInput } from "../domain/report.js";
import {
  scenarioCodeErrorsAre,
  type ForeignScnCodeError,
  type ScenarioCodeError,
  type ScenarioCodePopulation,
} from "../domain/scenarioCodeError.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";

function scenarioCodeErrorsFraming(errors: readonly ScenarioCodeError[], count: string): string {
  switch (scenarioCodeErrorsAre(errors)) {
    case "misfilings":
      return CORE_MESSAGES[CoreMessage.ScenarioCodeErrorsFraming](count);
    case "several-codes":
      return CORE_MESSAGES[CoreMessage.SeveralScnCodesFraming](count);
    case "both":
      return CORE_MESSAGES[CoreMessage.MisfiledAndSeveralScnCodesFraming](count);
  }
}

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

function worded(error: ScenarioCodeError): string {
  if (error.kind === "duplicate-feature-code") {
    return CORE_MESSAGES[CoreMessage.DuplicateFeatureCode](error.featureCode, error.files.length, error.files.join(", "));
  }
  if (error.kind === "foreign-scn-code") return foreignWorded(error);
  if (error.kind === "no-feature-code") return CORE_MESSAGES[CoreMessage.NoFeatureCode](error.files.join(", "));
  return CORE_MESSAGES[CoreMessage.ScenarioSeveralScnCodes](error.files.join(", "), error.scenario, error.codes);
}

function foreignWorded(error: ForeignScnCodeError): string {
  const file = error.files.join(", ");
  const carriers = error.namedFeatureFiles;
  if (carriers.length === 0) {
    return CORE_MESSAGES[CoreMessage.ForeignScnCodeNoCarrier](file, error.featureCode, error.scnId, error.namedFeatureCode);
  }
  if (carriers.length === 1) {
    return CORE_MESSAGES[CoreMessage.ForeignScnCodeOneCarrier](file, error.featureCode, error.scnId, error.namedFeatureCode, carriers[0]!);
  }
  return CORE_MESSAGES[CoreMessage.ForeignScnCodeManyCarriers](
    file,
    error.featureCode,
    error.scnId,
    error.namedFeatureCode,
    carriers.length,
    carriers.join(", ")
  );
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
    ...errors.map((error) => `- \`${error.kind}\` — ${worded(error)}`),
    "",
    duplicateLine,
    "",
  ];
};
