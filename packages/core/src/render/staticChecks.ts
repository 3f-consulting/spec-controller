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
  // A pure counts summary off `summary.staticChecks` (2.4) — symmetric with the
  // runtime `### Test volume` line. There is no census section: the per-guard DETAIL lives in
  // the rows (named → each scenario's fitness sub-row; the no-evidence-obligation static-checks surface
  // as `cites-no-scenario` credit items on the `(no scenario)` suspense row). Only the running
  // volume + the uncited count render here; the named count is implicit.
  return [
    "### Static checks", "",
    `${counts.runningStaticCheckCount} static check(s) run, ${counts.uncitedStaticCheckCount} uncited static check(s).`,
    "",
  ];
};
