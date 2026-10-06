import type { RenderInput } from "../assemble/renderInput.js";
import { RUNTIME_QUALITY_CHECKS } from "../domain/ledger.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";

const runnerTierAccount = (
  runnerTiers: Readonly<Record<string, string | null>> | undefined
): string[] =>
  runnerTiers === undefined
    ? []
    : RUNTIME_QUALITY_CHECKS.filter((tier) => typeof runnerTiers[tier] !== "string").map((tier) =>
        Object.hasOwn(runnerTiers, tier)
          ? `- ${CORE_MESSAGES[CoreMessage.RunnerTierNamesNone](tier)}`
          : `- ${CORE_MESSAGES[CoreMessage.RunnerTierUnnamed](tier)}`
      );

const unrecognisedKeyAccount = (keys: readonly string[] | undefined): string[] =>
  (keys ?? []).map(
(key) => `- ${CORE_MESSAGES[CoreMessage.RunnerKeyNotATier](key)}`);

export const behaviouralRunnersSection = (report: RenderInput): string[] => {
  const runners = report.summary.behaviouralRunners ?? [];
  const account = [
    ...runnerTierAccount(report.summary.runnerTiers),
    ...unrecognisedKeyAccount(report.summary.unrecognisedRunnerKeys),
  ];
  if (runners.length === 0 && account.length === 0) return [];
  return [
    CORE_MESSAGES[CoreMessage.BehaviouralRunnersHeading],
    "",
    ...(runners.length > 0
      ? [
          CORE_MESSAGES[CoreMessage.BehaviouralRunnersTableHeader],
          "| --- | --- | --- |",
          ...runners.map(({ tier, runner, step }) => `| ${tier} | ${runner} | ${step} |`),
          "",
        ]
      : []),
    ...(account.length > 0 ? [...account, ""] : []),
  ];
};
