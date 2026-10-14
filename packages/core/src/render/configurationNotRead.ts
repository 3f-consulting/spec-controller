import type { RenderInput } from "../domain/report.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";

export const configurationNotReadSection = (report: RenderInput): string[] => {
  const wrongKinds = report.summary.wrongKindConfiguration ?? [];
  const unknownKeys = report.summary.unknownConfigurationKeys ?? [];
  if (wrongKinds.length === 0 && unknownKeys.length === 0) return [];
  return [
    CORE_MESSAGES[CoreMessage.ConfigurationNotReadHeading],
    "",
    CORE_MESSAGES[CoreMessage.ConfigurationNotReadIntro],
    "",
    ...wrongKinds.map(
      ({ entry, is, reads }) => `- ${CORE_MESSAGES[CoreMessage.ConfigurationWrongKind](`\`${entry}\``, is, reads)}`
    ),
    ...unknownKeys.map(
      (key) => `- ${CORE_MESSAGES[CoreMessage.ConfigurationUnknownKey](`\`specController.${key}\``)}`
    ),
    "",
  ];
};
