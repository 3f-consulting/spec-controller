/**
 * THE BEHAVIOURAL RUNNERS a run recognised (@SCN-USG-011) — the tier a consumer named, the runner
 * they named for it, and the step of their pipeline it was recognised at.
 *
 * WHY THE REPORT SAYS IT AT ALL. A recognition rule over somebody else's pipeline will be wrong
 * sometimes, and the question is only whether being wrong is VISIBLE. Naming the steps this reader
 * recognised is what makes it so: a consumer reads the row, sees a step they know is a fitness
 * check, and corrects it in one line of their own configuration. Silence here would put the rule
 * back where the prefix set was — a judgement nobody can see being made. Since @SCN-USG-004 the
 * same recognition also DECIDES membership rather than only reporting it, which is what makes the
 * visibility load-bearing instead of courteous.
 *
 * Its own module rather than a further section in `markdown.ts`, which sits at a `max-lines`
 * exception — and an exception excuses existing debt, never headroom. The precedent is
 * `runVerdict.ts`, moved out for exactly this reason.
 */

import type { RenderInput } from "../assemble/renderInput.js";
import { RUNTIME_QUALITY_CHECKS } from "../domain/ledger.js";

/**
 * WHAT THE TARGET SAID ABOUT THE TIERS NO RUNNER WAS NAMED FOR (@SCN-USG-016) — one line each, and
 * two different lines, because a tier the target says it HAS none and a tier it never mentioned are
 * opposite facts. Neither recognises a step and neither excludes one, so this is the only place in
 * the whole run where the difference between them is readable.
 *
 * AND THE UNNAMED LINE IS WHAT MAKES THE NULL WORTH WRITING. Without it a consumer who states
 * `"performance": null` gets the report they would have got by saying nothing, and no reason to
 * ever write it; with it, the tool says out loud that it has not been told, and the null is the
 * answer. That is the same asymmetry the whole axis runs on — say what was seen and what was not,
 * and let the consumer correct it in one line of their own configuration.
 *
 * THE FOUR TIERS ARE CANON AND ARE NOT A LIST THIS MODULE KEEPS. `RUNTIME_QUALITY_CHECKS` is the
 * ledger's own enumeration of the runtime tiers, read here rather than restated: a second copy
 * would agree by coincidence, and this axis's whole argument is that a list of names is the drift.
 *
 * A NAMED TIER IS NOT ACCOUNTED FOR HERE, whether or not a step was recognised for it. What a
 * target that named a runner nothing runs is owed stays the open question the section below
 * already deferred; naming a runner is not saying you have none.
 */
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

/**
 * THE KEYS THE RUNNER BLOCK WAS GIVEN THAT ARE NOT TIERS (@SCN-USG-019) — one line each, naming the
 * key and saying what it did.
 *
 * THE LINE EXISTS BECAUSE THE ALTERNATIVE IS SILENCE, and silence here is the same fault as a
 * dropped step: the consumer wrote a key, believes it took effect, and nothing they can read says
 * otherwise. The key is not honoured — the resolver partitioned it out before any recognition ran —
 * so the only remaining question was whether they get to find that out, and this is the answer.
 *
 * IT SAYS WHAT THE KEY DID, NOT ONLY THAT IT WAS SEEN. "Excludes nothing" is the fact a consumer
 * needs to act on: they wrote it to take a check out of discovery, that is precisely what it did
 * not do, and the check is on the books below where they can read it.
 */
const unrecognisedKeyAccount = (keys: readonly string[] | undefined): string[] =>
  (keys ?? []).map(
    (key) =>
      `- ${key} — not a tier: the runner block is keyed by the four canon tiers, and this key excludes nothing.`
  );

/**
 * The recognised-runner cut and the account of the tiers it recognised none for, or nothing at all.
 *
 * OMITTED WHEN THE TARGET HAS SAID NOTHING, which is every target carrying no runner block: the
 * section appears when the target named something and the report is otherwise byte-identical to
 * what it was. This section speaks only for a target that has spoken.
 *
 * AND THE SILENCE IS THE RIGHT ANSWER FOR THE ONE THAT HAS NOT (@SCN-USG-017), which was an open
 * question when the omission was written and is now settled by the scenario that asked it. What a
 * `new-client` is owed is every step of their pipeline on the books, which the observer gives them;
 * a section here would have nothing to report but four tiers nobody named, and printing it would
 * turn an absence the tool supports into a form the report asks them to fill in.
 */
export const behaviouralRunnersSection = (report: RenderInput): string[] => {
  const runners = report.summary.behaviouralRunners ?? [];
  const account = [
    ...runnerTierAccount(report.summary.runnerTiers),
    // AFTER THE TIERS, because the four are the block's subject and an unrecognised key is what was
    // written beside them. A consumer reads down the canon set and then what did not belong to it.
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
