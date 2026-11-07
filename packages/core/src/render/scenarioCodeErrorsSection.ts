import type { RenderInput } from "../domain/renderInput.js";
import {
  foreignCodeCarriersOf,
  scenarioCodeCleanlinessOf,
  scenarioCodeErrorsAre,
  type ForeignClaimCodeError,
  type ScenarioCodeCleanliness,
  type ClaimCodeError,
} from "../domain/scnTags.js";
import { CoreError, CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { markdownHeading } from "./heading.js";
import { errorEntry } from "./errorEntry.js";

const CODE_OF: Readonly<Record<ClaimCodeError["kind"], CoreError>> = {
  "duplicate-feature-code": CoreError.DuplicateFeatureCode,
  "foreign-claim-code": CoreError.ForeignClaimCode,
  "no-feature-code": CoreError.NoFeatureCode,
  "several-claim-codes": CoreError.SeveralClaimCodes,
};

function scenarioCodeErrorsFraming(errors: readonly ClaimCodeError[], count: string): string {
  switch (scenarioCodeErrorsAre(errors)) {
    case "misfilings":
      return coreMessage(CoreMessage.ClaimCodeErrorsFraming, { count });
    case "several-codes":
      return coreMessage(CoreMessage.SeveralClaimCodesFraming, { count });
    case "both":
      return coreMessage(CoreMessage.MisfiledAndSeveralClaimCodesFraming, { count });
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

function worded(error: ClaimCodeError): string {
  if (error.kind === "duplicate-feature-code") {
    return coreMessage(CoreMessage.DuplicateFeatureCode, {
      code: error.featureCode,
      fileCount: error.files.length,
      files: error.files.join(", "),
    });
  }
  if (error.kind === "foreign-claim-code") return foreignWorded(error);
  if (error.kind === "no-feature-code") return coreMessage(CoreMessage.NoFeatureCode, { file: error.files.join(", ") });
  return coreMessage(CoreMessage.ScenarioSeveralClaimCodes, {
    file: error.files.join(", "),
    scenario: error.scenario,
    codeCount: error.codes.length,
    codes: error.codes.join(", "),
  });
}

function foreignWorded(error: ForeignClaimCodeError): string {
  const values = { file: error.files.join(", "), featureCode: error.featureCode, claimCode: error.claimCode, named: error.namedFeatureCode };
  const carriers = foreignCodeCarriersOf(error);
  switch (carriers.kind) {
    case "none":
      return coreMessage(CoreMessage.ForeignClaimCodeNoCarrier, values);
    case "carried":
      return coreMessage(CoreMessage.ForeignClaimCodeCarried, {
        ...values,
        carrierCount: carriers.files.length,
        carriers: carriers.files.join(", "),
      });
  }
}

export const scenarioCodeErrorsSection = (report: RenderInput): string[] => {
  const errors = report.errorsInTheInputs?.claimCodeErrors;
  if (errors === undefined) return [];
  const count = coreMessage(CoreMessage.ClaimCodeErrorCount, { count: errors.length });
  return [
    markdownHeading(3, coreMessage(CoreMessage.ClaimCodeErrorsHeading)),
    "",
    scenarioCodeErrorsFraming(errors, count),
    "",
    ...errors.map((error) => errorEntry(CODE_OF[error.kind], worded(error))),
    "",
    coreMessage(CoreMessage.DuplicateClaimCodeNotListed, { outcome: coreMessage(CoreMessage.OutcomeDuplicateClaimCode) }),
    "",
  ];
};

export const scenarioCodesCleanStatement = (report: RenderInput): string[] => {
  if (report.errorsInTheInputs?.claimCodeErrors !== undefined) return [];
  const { featureFiles, featureCodes } = report.summary.claimCodes ?? {};
  if (typeof featureFiles !== "number" || typeof featureCodes !== "number") return [];
  return [cleanStatement(scenarioCodeCleanlinessOf({ featureFiles, featureCodes })), ""];
};
