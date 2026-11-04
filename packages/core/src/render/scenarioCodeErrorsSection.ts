import type { RenderInput } from "../domain/renderInput.js";
import {
  foreignCodeCarriersOf,
  scenarioCodeCleanlinessOf,
  scenarioCodeErrorsAre,
  type ForeignScnCodeError,
  type ScenarioCodeCleanliness,
  type ScenarioCodeError,
} from "../domain/scnTags.js";
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

function cleanStatement(cleanliness: ScenarioCodeCleanliness): string {
  switch (cleanliness.kind) {
    case "no-feature-file":
      return coreMessage(CoreMessage.NoFeatureFileJudged);
    case "no-coded-scenario":
      return coreMessage(CoreMessage.CleanNoCodedScenario, { featureFiles: cleanliness.featureFiles });
    case "each-file-own-code":
      return coreMessage(CoreMessage.CleanEachFileOwnCode, {
        featureFiles: cleanliness.featureFiles,
        featureCodes: cleanliness.featureCodes,
      });
    case "others-no-feature-code":
      return coreMessage(CoreMessage.CleanOthersNoFeatureCode, {
        featureFiles: cleanliness.featureFiles,
        featureCodes: cleanliness.featureCodes,
        noFeatureCode: cleanliness.noFeatureCode,
      });
  }
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
  const errors = report.errorsInTheInputs?.scenarioCodeErrors;
  if (errors === undefined) return [];
  const count = coreMessage(CoreMessage.ScenarioCodeErrorCount, { count: errors.length });
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
  if (report.errorsInTheInputs?.scenarioCodeErrors !== undefined) return [];
  const { featureFiles, featureCodes } = report.summary.scenarioCodes ?? {};
  if (typeof featureFiles !== "number" || typeof featureCodes !== "number") return [];
  return [cleanStatement(scenarioCodeCleanlinessOf({ featureFiles, featureCodes })), ""];
};
