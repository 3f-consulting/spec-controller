import { featureFilesWithNoFeatureCodeOf, type RenderInput } from "../domain/renderInput.js";
import { foreignCodeCarriersOf, scenarioCodeErrorsAre, type ForeignScnCodeError, type ScenarioCodeError } from "../domain/scnTags.js";
import { CORE_MESSAGES, CoreError, CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { errorEntry } from "./errorEntry.js";

const CODE_OF: Readonly<Record<ScenarioCodeError["kind"], CoreError>> = {
  "duplicate-feature-code": CoreError.DuplicateFeatureCode,
  "foreign-scn-code": CoreError.ForeignScnCode,
  "no-feature-code": CoreError.NoFeatureCode,
  "several-scn-codes": CoreError.SeveralScnCodes,
};

function scenarioCodeErrorsFraming(errors: readonly ScenarioCodeError[], count: string): string {
  switch (scenarioCodeErrorsAre(errors)) {
    case "misfilings":
      return coreMessage(CoreMessage.ScenarioCodeErrorsFraming, { count });
    case "several-codes":
      return coreMessage(CoreMessage.SeveralScnCodesFraming, { count });
    case "both":
      return coreMessage(CoreMessage.MisfiledAndSeveralScnCodesFraming, { count });
  }
}

function counted(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

function cleanStatement(featureFiles: number, featureCodes: number): string {
  const over = CORE_MESSAGES[CoreMessage.ScenarioCodesCleanOver](
    counted(featureFiles, CORE_MESSAGES[CoreMessage.FeatureFileNoun]),
    counted(featureCodes, CORE_MESSAGES[CoreMessage.FeatureCodeNoun])
  );
  if (featureCodes === 0) {
    const them = featureFiles === 1 ? CORE_MESSAGES[CoreMessage.ItPronoun] : CORE_MESSAGES[CoreMessage.ThemPronoun];
    return CORE_MESSAGES[CoreMessage.CleanNoCodedScenario](over, them);
  }
  if (featureCodes === featureFiles) return CORE_MESSAGES[CoreMessage.CleanEachFileOwnCode](over);
  const noFeatureCode = featureFilesWithNoFeatureCodeOf({ featureFiles, featureCodes });
  const hold = noFeatureCode === 1 ? CORE_MESSAGES[CoreMessage.HoldsVerb] : CORE_MESSAGES[CoreMessage.HoldVerb];
  return CORE_MESSAGES[CoreMessage.CleanOthersNoFeatureCode](over, noFeatureCode, hold);
}

function worded(error: ScenarioCodeError): string {
  if (error.kind === "duplicate-feature-code") {
    return coreMessage(CoreMessage.DuplicateFeatureCode, {
      code: error.featureCode,
      fileCount: error.files.length,
      files: error.files.join(", "),
    });
  }
  if (error.kind === "foreign-scn-code") return foreignWorded(error);
  if (error.kind === "no-feature-code") return coreMessage(CoreMessage.NoFeatureCode, { file: error.files.join(", ") });
  return coreMessage(CoreMessage.ScenarioSeveralScnCodes, {
    file: error.files.join(", "),
    scenario: error.scenario,
    codeCount: error.codes.length,
    codes: error.codes.join(", "),
  });
}

function foreignWorded(error: ForeignScnCodeError): string {
  const values = { file: error.files.join(", "), featureCode: error.featureCode, scnId: error.scnId, named: error.namedFeatureCode };
  const carriers = foreignCodeCarriersOf(error);
  switch (carriers.kind) {
    case "none":
      return coreMessage(CoreMessage.ForeignScnCodeNoCarrier, values);
    case "carried":
      return coreMessage(CoreMessage.ForeignScnCodeCarried, {
        ...values,
        carrierCount: carriers.files.length,
        carriers: carriers.files.join(", "),
      });
  }
}

export const scenarioCodeErrorsSection = (report: RenderInput): string[] => {
  const errors = report.errors?.scenarioCodes;
  if (errors === undefined) return [];
  const count =
    errors.length === 1
      ? coreMessage(CoreMessage.OneScenarioCodeError)
      : coreMessage(CoreMessage.ScenarioCodeErrorCount, { count: errors.length });
  return [
    CORE_MESSAGES[CoreMessage.ScenarioCodeErrorsHeading],
    "",
    scenarioCodeErrorsFraming(errors, count),
    "",
    ...errors.map((error) => errorEntry(CODE_OF[error.kind], worded(error))),
    "",
    coreMessage(CoreMessage.DuplicateScnCodeNotListed, { outcome: CORE_MESSAGES[CoreMessage.OutcomeDuplicateScnCode] }),
    "",
  ];
};

export const scenarioCodesCleanStatement = (report: RenderInput): string[] => {
  if (report.errors?.scenarioCodes !== undefined) return [];
  const { featureFiles, featureCodes } = report.summary.scenarioCodes ?? {};
  if (featureFiles === undefined || featureCodes === undefined) return [];
  if (featureFiles === 0) return [CORE_MESSAGES[CoreMessage.NoFeatureFileJudged], ""];
  return [cleanStatement(featureFiles, featureCodes), ""];
};
