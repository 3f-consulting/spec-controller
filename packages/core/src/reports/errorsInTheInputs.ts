import { writtenClaimCode, type ClaimCode, type ClaimCodeError } from "../domain/claimCodes.js";
import type { ErrorsInTheInputs } from "../domain/evidenceReconciliation.js";
import { coreText } from "../messages/catalogue.js";
import { quoted } from "./quoted.js";

// A value as the inputs wrote it: a claim code written out, and a list as each of its values.
const shown = (value: string | ClaimCode | readonly (string | ClaimCode)[]): string[] =>
  typeof value === "string" ? [value] : "featureCode" in value ? [writtenClaimCode(value)] : value.flatMap(shown);

// What a claim code error is about: each of its values, in the order the error has them.
const factsOf = ({ kind: _kind, ...facts }: ClaimCodeError): string[] => Object.values(facts).flatMap(shown);

const item = (kind: string, facts: readonly string[]): string => `- ${quoted(kind)}: ${facts.map(quoted).join(", ")}`;

export function errorsInTheInputsSection({ claimCodeErrors, configurationErrors }: ErrorsInTheInputs): string[] {
  return [
    `## ${coreText("errors-heading")}`,
    "",
    ...claimCodeErrors.map((error) => item(error.kind, factsOf(error))),
    ...configurationErrors.map(({ kind, entry }) => item(kind, [entry])),
  ];
}
