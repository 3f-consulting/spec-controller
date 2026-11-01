import type { RenderInput } from "../domain/renderInput.js";
import type { ConfigurationKind } from "../domain/evidenceReconciliation.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { codeSpan } from "./codeSpan.js";

function kindWords(kind: ConfigurationKind): string {
  switch (kind) {
    case "list":
      return CORE_MESSAGES[CoreMessage.ManifestKindList];
    case "object":
      return CORE_MESSAGES[CoreMessage.ManifestKindObject];
    case "string":
      return CORE_MESSAGES[CoreMessage.ManifestKindString];
    case "string-or-null":
      return CORE_MESSAGES[CoreMessage.ManifestKindStringOrNull];
    case "null":
      return kind;
    default:
      return CORE_MESSAGES[CoreMessage.ManifestKindOfType](kind);
  }
}

export const configurationNotReadSection = (report: RenderInput): string[] => {
  const wrongKinds = report.errors?.configuration?.ofWrongKind ?? [];
  const unknownKeys = report.errors?.configuration?.keysNotRead ?? [];
  const runnerKeysNotALayer = report.errors?.configuration?.runnerKeysNotALayer ?? [];
  const nonChecksMatchingNoStep = report.errors?.configuration?.nonChecksMatchingNoStep ?? [];
  const nonChecksNotAStepName = report.errors?.configuration?.nonChecksNotAStepName ?? [];
  if (
    wrongKinds.length === 0 &&
    unknownKeys.length === 0 &&
    runnerKeysNotALayer.length === 0 &&
    nonChecksMatchingNoStep.length === 0 &&
    nonChecksNotAStepName.length === 0
  )
    return [];
  return [
    CORE_MESSAGES[CoreMessage.ConfigurationNotReadHeading],
    "",
    CORE_MESSAGES[CoreMessage.ConfigurationNotReadIntro],
    "",
    ...wrongKinds.map(
      ({ entry, is, reads }) => `- ${CORE_MESSAGES[CoreMessage.ConfigurationWrongKind](codeSpan(entry), kindWords(is), kindWords(reads))}`
    ),
    ...unknownKeys.map(
      (key) => `- ${CORE_MESSAGES[CoreMessage.ConfigurationUnknownKey](codeSpan(`specController.${key}`))}`
    ),
    ...runnerKeysNotALayer.map(
      (key) => `- ${CORE_MESSAGES[CoreMessage.RunnerKeyNotALayer](codeSpan(`specController.runners.${key}`))}`
    ),
    ...nonChecksMatchingNoStep.map(
      (entry) => `- ${CORE_MESSAGES[CoreMessage.NotChecksEntryMatchesNoStep]("`specController.notChecks`", codeSpan(entry))}`
    ),
    ...nonChecksNotAStepName.map(
      (entry) => `- ${CORE_MESSAGES[CoreMessage.NotChecksEntryNotAStepName]("`specController.notChecks`", codeSpan(entry))}`
    ),
    "",
  ];
};
