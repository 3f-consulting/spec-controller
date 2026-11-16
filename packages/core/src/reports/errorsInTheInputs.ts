import { writtenClaimCode, type ClaimCodeError } from "../domain/claimCodes.js";
import type { ErrorsInTheInputs } from "../domain/evidenceReconciliation.js";
import { coreText } from "../messages/catalogue.js";
import { quoted } from "./quoted.js";

// What each claim code error is about, as the inputs wrote it.
function factsOf(error: ClaimCodeError): readonly string[] {
  if (error.kind === "foreign-claim-code") return [error.file, writtenClaimCode(error.claimCode), ...error.filesWithItsFeatureCode];
  if (error.kind === "no-feature-code") return [error.file];
  if (error.kind === "duplicate-feature-code") return [error.featureCode, ...error.files];
  if (error.kind === "several-claim-codes") return [error.file, error.title, ...error.claimCodes.map(writtenClaimCode)];
  return [error.file, error.title, writtenClaimCode(error.claimCode)];
}

const item = (kind: string, facts: readonly string[]): string => `- ${quoted(kind)}: ${facts.map(quoted).join(", ")}`;

export function errorsInTheInputsSection({ claimCodeErrors, configurationErrors }: ErrorsInTheInputs): string[] {
  return [
    `## ${coreText("errors-heading")}`,
    "",
    ...claimCodeErrors.map((error) => item(error.kind, factsOf(error))),
    ...configurationErrors.map(({ kind, entry }) => item(kind, [entry])),
  ];
}
