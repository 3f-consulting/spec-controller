import type { RenderInput } from "../domain/renderInput.js";
import type { TierWithoutRunner } from "../domain/evidenceReconciliation.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";

const runnerTierAccount = (tiers: readonly TierWithoutRunner[] | undefined): string[] =>
  (tiers ?? []).map(({ tier, namesNone }) =>
    namesNone
      ? `- ${CORE_MESSAGES[CoreMessage.RunnerTierNamesNone](tier)}`
      : `- ${CORE_MESSAGES[CoreMessage.RunnerTierUnnamed](tier)}`
  );

const unrecognisedKeyAccount = (keys: readonly string[] | undefined): string[] =>
  (keys ?? []).map(
(key) => `- ${CORE_MESSAGES[CoreMessage.RunnerKeyNotATier](key)}`);

export const behaviouralRunnersSection = (report: RenderInput): string[] => {
  const runners = report.summary.behaviouralRunners ?? [];
  const account = [
    ...runnerTierAccount(report.summary.tiersWithoutRunner),
    ...unrecognisedKeyAccount(report.errors?.configuration?.runnerKeysNotATier),
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
