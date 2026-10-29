import type { RenderInput } from "../domain/renderInput.js";
import type { ConfigurationKind } from "../domain/evidenceReconciliation.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";

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
  if (wrongKinds.length === 0 && unknownKeys.length === 0) return [];
  return [
    CORE_MESSAGES[CoreMessage.ConfigurationNotReadHeading],
    "",
    CORE_MESSAGES[CoreMessage.ConfigurationNotReadIntro],
    "",
    ...wrongKinds.map(
      ({ entry, is, reads }) => `- ${CORE_MESSAGES[CoreMessage.ConfigurationWrongKind](`\`${entry}\``, kindWords(is), kindWords(reads))}`
    ),
    ...unknownKeys.map(
      (key) => `- ${CORE_MESSAGES[CoreMessage.ConfigurationUnknownKey](`\`specController.${key}\``)}`
    ),
    "",
  ];
};
