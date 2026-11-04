import type { RenderInput } from "../domain/renderInput.js";
import type { ConfigurationKind } from "../domain/evidenceReconciliation.js";
import { CORE_MESSAGES, CoreError, CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { codeSpan } from "./codeSpan.js";
import { errorEntry } from "./errorEntry.js";

function kindWords(kind: ConfigurationKind): string {
  switch (kind) {
    case "list":
      return coreMessage(CoreMessage.ManifestKindList);
    case "object":
      return coreMessage(CoreMessage.ManifestKindObject);
    case "string":
      return coreMessage(CoreMessage.ManifestKindString);
    case "string-or-null":
      return coreMessage(CoreMessage.ManifestKindStringOrNull);
    case "null":
      return kind;
    default:
      return coreMessage(CoreMessage.ManifestKindOfType, { type: kind });
  }
}

export const configurationNotReadSection = (report: RenderInput): string[] => {
  const wrongKinds = report.errorsInTheInputs?.configurationNotRead?.ofWrongKind ?? [];
  const unknownKeys = report.errorsInTheInputs?.configurationNotRead?.keysNotRead ?? [];
  const runnerKeysNotALayer = report.errorsInTheInputs?.configurationNotRead?.runnerKeysNotALayer ?? [];
  const nonChecksMatchingNoStep = report.errorsInTheInputs?.configurationNotRead?.nonChecksMatchingNoStep ?? [];
  const nonChecksNotAStepName = report.errorsInTheInputs?.configurationNotRead?.nonChecksNotAStepName ?? [];
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
    coreMessage(CoreMessage.ConfigurationNotReadIntro),
    "",
    ...wrongKinds.map(
      ({ entry, is, reads }) => errorEntry(CoreError.ConfigurationWrongKind, coreMessage(CoreMessage.ConfigurationWrongKind, { entry: codeSpan(entry), is: kindWords(is), reads: kindWords(reads) }))
    ),
    ...unknownKeys.map(
      (key) => errorEntry(CoreError.ConfigurationUnknownKey, coreMessage(CoreMessage.ConfigurationUnknownKey, { key: codeSpan(`specController.${key}`) }))
    ),
    ...runnerKeysNotALayer.map(
      (key) => errorEntry(CoreError.RunnerKeyNotALayer, coreMessage(CoreMessage.RunnerKeyNotALayer, { key: codeSpan(`specController.runners.${key}`) }))
    ),
    ...nonChecksMatchingNoStep.map(
      (entry) => errorEntry(CoreError.NotChecksEntryMatchesNoStep, coreMessage(CoreMessage.NotChecksEntryMatchesNoStep, { key: "`specController.notChecks`", entry: codeSpan(entry) }))
    ),
    ...nonChecksNotAStepName.map(
      (entry) => errorEntry(CoreError.NotChecksEntryNotAStepName, coreMessage(CoreMessage.NotChecksEntryNotAStepName, { key: "`specController.notChecks`", entry: codeSpan(entry) }))
    ),
    "",
  ];
};
