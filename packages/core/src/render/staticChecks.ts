/**
 * THE STATIC-CHECK CENSUS a run banked — the counts line under Summary views, and the corpus's
 * half-converted checks beside it.
 *
 * Its own module rather than a section in `markdown.ts`. Moved out whole at 3F-3353, when the
 * behavioural-runner cut beside it needed the room under the file-length ceiling then in force
 * (retired portfolio-wide on 2026-09-18, 3F-2320); `runVerdict.ts` is the precedent, moved for
 * exactly this reason. NOTHING about the section changed in the move: same emitter, same lines,
 * same omit-when-absent.
 */

import type { RenderInput } from "../assemble/renderInput.js";

/**
 * WHAT BECAME OF ONE RETIRED KEY, in the words its own consequence earns.
 *
 * A ROW-LEVEL FORM ONCE STOOD BESIDE THIS ONE — `fitnessChecks[<@SCN>].<key>`, a bar
 * (@SCN-LNT-035) or a characteristic (@SCN-LNT-039) — and said something different, because its
 * consequence was different: the row still reached the books and only the value on it was unread.
 * It left with the key its rows sat under (3F-3582). `fitnessChecks` is itself retired now, so
 * every retired key says the one thing again: nothing of it reaches the books.
 */
const RETIRED_KEY_FATE = "this reader no longer reads it, and none of its entries reach the books.";

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
  (keys ?? []).map((key) => `- specController.${key} — retired: ${RETIRED_KEY_FATE}`);

/**
 * Static checks (@SCN-USG-001) — the STATIC-check evidence observation side under
 * Summary views, the mirror of `### Test volume` on the runtime axis. Renders the counts line
 * (`N static check(s) run, K uncited static check(s)`) alone — a pure counts summary, symmetric with
 * `### Test volume` (2.4). The named count is implicit (`running − uncited`), so it
 * is no longer printed. The per-guard member detail lives in the rows (named → each
 * scenario's fitness sub-row; no-evidence-obligation → the suspense row's `cites-no-scenario` credit items), so
 * no list renders here. Omitted only when no static-check census is threaded (the back-compat path).
 * The counts read off the report's materialised `summary.staticChecks`.
 */
export const staticChecksSection = (report: RenderInput): string[] => {
  // THE HALF-DECLARED CHECKS ONCE RENDERED HERE (@SCN-LNT-020) — a count and the ids of the
  // `@fitness` scenarios no manifest entry named, beside the uncited static checks, because while
  // such a scenario raised no obligation nothing on its own row could say who it was. It raises one
  // now (3F-3582), so the row says who under the scenario's own `@SCN`, and a second sentence here
  // would print one fault twice with two remedies attached.
  const { staticChecks: counts } = report.summary;
  if (!counts) return [];
  // THE RETIRED-KEY ACCOUNT (@SCN-USG-021) renders HERE, under the same heading, because a
  // retired key is a fact about the STATIC axis: every key this reader has retired so far named
  // a route onto this axis's books, never the runtime one. OMIT-WHEN-EMPTY, the same as every
  // account beside it.
  const retired = retiredKeyAccount(report.summary.retiredKeys);
  // A pure counts summary off `summary.staticChecks` (2.4) — symmetric with the
  // runtime `### Test volume` line. There is no census section: the per-guard DETAIL lives in
  // the rows (named → each scenario's fitness sub-row; the no-evidence-obligation static-checks surface
  // as `cites-no-scenario` credit items on the `(no scenario)` suspense row). Only the running
  // volume + the uncited count render here; the named count is implicit.
  return [
    "### Static checks", "",
    `${counts.runningStaticCheckCount} static check(s) run, ${counts.uncitedStaticCheckCount} uncited static check(s).`,
    "",
    ...(retired.length > 0 ? [...retired, ""] : []),
  ];
};
