import type { RenderInput } from "../assemble/renderInput.js";

const INTRO =
  "The target's package.json holds configuration this run could not use. Each entry below was read as absent, and every account in this report is the one the target gives without it.";

export const configurationNotReadSection = (report: RenderInput): string[] => {
  const wrongKinds = report.summary.wrongKindConfiguration ?? [];
  const unknownKeys = report.summary.unknownConfigurationKeys ?? [];
  if (wrongKinds.length === 0 && unknownKeys.length === 0) return [];
  return [
    "## Configuration not read",
    "",
    INTRO,
    "",
    ...wrongKinds.map(
      ({ entry, is, reads }) => `- \`${entry}\` is ${is} where ${reads} is read, so this run read it as absent.`
    ),
    // One sentence for every unread key: a retired key is told nothing about what it once did.
    ...unknownKeys.map(
      (key) => `- \`specController.${key}\` is not a key the specController block reads, so this run read nothing from it.`
    ),
    "",
  ];
};
