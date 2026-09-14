/**
 * THE STATIC-CHECK CENSUS a run banked — the counts line under Summary views, and the corpus's
 * half-converted checks beside it.
 *
 * Its own module rather than a section in `markdown.ts`, which sits at a `max-lines` exception —
 * and an exception excuses existing debt, never headroom. Moved out whole at 3F-3353, when the
 * behavioural-runner cut beside it needed the room; `runVerdict.ts` is the precedent, moved for
 * exactly this reason. NOTHING about the section changed in the move: same emitter, same lines,
 * same omit-when-absent.
 */

import type { RenderInput } from "../assemble/renderInput.js";

/**
 * THE RETIRED-KEY ACCOUNT (@SCN-USG-021) — one line per `specController.*` key this reader has
 * retired that the target's manifest still carries, naming the key and saying what became of it.
 *
 * THE LINE EXISTS BECAUSE THE ALTERNATIVE IS SILENCE, the same argument
 * `behaviouralRunners.ts`'s `unrecognisedKeyAccount` makes for a key the target INVENTED: a
 * consumer who wrote `checkRegistry` in good faith, when it was read, believes it still routes
 * their checks. Nothing reads it now — the entries it names reach no candidate and resolve no
 * citation — so the only remaining question is whether they get to find that out, and this is
 * the answer.
 */
const retiredKeyAccount = (keys: readonly string[] | undefined): string[] =>
  (keys ?? []).map(
    (key) =>
      `- specController.${key} — retired: this reader no longer reads it, and none of its entries reach the books.`
  );

/**
 * Static checks (@SCN-USG-001) — the STATIC-check evidence observation side under
 * Summary views, the mirror of `### Test volume` on the runtime axis. Renders the counts line
 * (`N static check(s) run, K uncited static check(s)`) alone — a pure counts summary, symmetric with
 * `### Test volume` (2.4). The named count is implicit (`running − uncited`), so it
 * is no longer printed. The per-guard member detail lives in the rows (named → each
 * scenario's `@lint` sub-row; no-evidence-obligation → the suspense row's `cites-no-scenario` credit items), so
 * no list renders here. Omitted only when no static-check census is threaded (the back-compat path).
 * The counts read off the report's materialised `summary.staticChecks`.
 */
export const staticChecksSection = (report: RenderInput): string[] => {
  // THE HALF-CONVERTED CHECKS (@SCN-LNT-020) render HERE, under the same heading, because they are
  // the same class of half-entry as an uncited static check — something the run saw and nothing
  // owed — read off the other side of the books. FACTS ONLY, count and ids: the reader is told what
  // the corpus said about itself and left with the one remedy there is, which is to write the row.
  // OMIT-WHEN-EMPTY, so an unconverted corpus renders byte-identically to before.
  const { staticChecks: counts, unconfiguredFitnessScenarios: halfConverted = [] } = report.summary;
  if (!counts) return [];
  // THE RETIRED-KEY ACCOUNT (@SCN-USG-021) renders HERE, under the same heading, because a
  // retired key is a fact about the STATIC axis: every key this reader has retired so far named
  // a route onto this axis's books, never the runtime one. OMIT-WHEN-EMPTY, the same as every
  // account beside it.
  const retired = retiredKeyAccount(report.summary.retiredKeys);
  // A pure counts summary off `summary.staticChecks` (2.4) — symmetric with the
  // runtime `### Test volume` line. There is no census section: the per-guard DETAIL lives in
  // the rows (named → each scenario's `@lint` sub-row; the no-evidence-obligation static-checks surface
  // as `cites-no-scenario` credit items on the `(no scenario)` suspense row). Only the running
  // volume + the uncited count render here; the named count is implicit.
  return [
    "### Static checks", "",
    `${counts.runningStaticCheckCount} static check(s) run, ${counts.uncitedStaticCheckCount} uncited static check(s).`,
    "",
    ...(halfConverted.length > 0 ? [`${halfConverted.length} @fitness scenario(s) no configured row names: ${halfConverted.join(", ")}.`, ""] : []),
    ...(retired.length > 0 ? [...retired, ""] : []),
  ];
};
