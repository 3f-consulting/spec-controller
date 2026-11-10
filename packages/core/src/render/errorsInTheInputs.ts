import type { ErrorsInTheInputs } from "../domain/evidenceReconciliation.js";
import { coreText } from "./coreText.js";
import { heading } from "./heading.js";
import { inCell } from "./quoted.js";
import { table } from "./table.js";

const about = (facts: object): string =>
  Object.entries(facts)
    .filter(([key]) => key !== "kind")
    .flatMap(([, value]: [string, unknown]) => (Array.isArray(value) ? value.map(String) : [String(value)]))
    .map(inCell)
    .join(" ");

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
