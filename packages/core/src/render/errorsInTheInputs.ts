import type { ErrorsInTheInputs } from "../domain/evidenceReconciliation.js";
import type { ClaimCodeError } from "../domain/claimCodes.js";
import { coreText, type CoreTextCode } from "./coreText.js";
import { heading } from "./heading.js";
import { inCell } from "./quoted.js";
import { table } from "./table.js";

type Fact = ClaimCodeError extends infer Error ? (Error extends unknown ? Exclude<keyof Error, "kind"> : never) : never;

const FACT_LABEL: Readonly<Record<Fact, CoreTextCode>> = {
  files: "files-label",
  featureCode: "feature-code-label",
  claimCode: "claim-code-label",
  namedFeatureCode: "named-feature-code-label",
  namedFeatureFiles: "named-feature-files-label",
  scenario: "scenario-label",
  codes: "codes-label",
};

function about(error: ClaimCodeError): string {
  return Object.entries(error)
    .filter((entry): entry is [Fact, string | readonly string[]] => entry[0] !== "kind")
    .map(([fact, value]) => `${coreText(FACT_LABEL[fact])}: ${(typeof value === "string" ? [value] : value).map(inCell).join(" ")}`)
    .join("; ");
}

export function errorsInTheInputsSection({ claimCodeErrors, configurationErrors }: ErrorsInTheInputs): string[] {
  return [
    heading(2, "errors-in-the-inputs-heading"),
    ...(claimCodeErrors === undefined
      ? []
      : [
          heading(3, "claim-code-errors-heading"),
          coreText("claim-code-errors-key"),
          table([coreText("kind-column"), coreText("about-column")], claimCodeErrors.map((error) => [error.kind, about(error)])),
        ]),
    ...(configurationErrors === undefined
      ? []
      : [
          heading(3, "configuration-errors-heading"),
          coreText("configuration-errors-key"),
          table([coreText("kind-column"), coreText("setting-column")], configurationErrors.map(({ kind, entry }) => [kind, inCell(entry)])),
        ]),
  ];
}
