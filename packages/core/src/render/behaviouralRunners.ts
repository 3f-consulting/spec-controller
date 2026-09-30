import type { RenderInput } from "../assemble/renderInput.js";
import { RUNTIME_QUALITY_CHECKS } from "../domain/ledger.js";

const runnerTierAccount = (
  runnerTiers: Readonly<Record<string, string | null>> | undefined
): string[] =>
  runnerTiers === undefined
    ? []
    : RUNTIME_QUALITY_CHECKS.filter((tier) => typeof runnerTiers[tier] !== "string").map((tier) =>
        Object.hasOwn(runnerTiers, tier)
          ? `- ${tier} — no runner: the target names none.`
          : `- ${tier} — unnamed: the target has not said.`
      );

const unrecognisedKeyAccount = (keys: readonly string[] | undefined): string[] =>
  (keys ?? []).map(
    (key) =>
      `- ${key} — not a tier: the runner block is keyed by the four canon tiers, and this key excludes nothing.`
  );

export const behaviouralRunnersSection = (report: RenderInput): string[] => {
  const runners = report.summary.behaviouralRunners ?? [];
  const account = [
    ...runnerTierAccount(report.summary.runnerTiers),
    ...unrecognisedKeyAccount(report.summary.unrecognisedRunnerKeys),
  ];
  if (runners.length === 0 && account.length === 0) return [];
  return [
    "### Behavioural runners",
    "",
    ...(runners.length > 0
      ? [
          "| Tier | Runner | Recognised at |",
          "| --- | --- | --- |",
          ...runners.map(({ tier, runner, step }) => `| ${tier} | ${runner} | ${step} |`),
          "",
        ]
      : []),
    ...(account.length > 0 ? [...account, ""] : []),
  ];
};
