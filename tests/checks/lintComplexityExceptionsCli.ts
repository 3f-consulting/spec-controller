/**
 * CLI entry point for the exception-list reconciliation — THE RATCHET (@SCN-CPX-003, 3F-2318).
 *
 * Run via `pnpm lint:complexity-exceptions` in CI: it measures the real tree with eslint at the BARE
 * standard (10 / 40 / 400, no exception blocks) and reds if `complexityExceptions.mjs` no longer
 * states what that measurement found — above the recorded value, below it, or not over the standard
 * at all. Over a list that agrees with the tree it exits 0.
 *
 * WHY THIS IS A SECOND CHECK BESIDE THE COMPLEXITY CHECK ITSELF. eslint can only red on
 * `value > max`; the
 * load-bearing case here is `value < recorded` — an improvement nobody banked — which it cannot
 * express. Without that half the list is a ceiling that quietly stops descending: a file improves,
 * the entry is never edited, and the recorded number becomes headroom again.
 *
 * WHY THE NAME CARRIES THE `lint:` PREFIX, AND WHY THAT STOPPED BEING LOAD-BEARING (3F-3343).
 * `runningStaticChecks` observed a CI script only when its name carried an observed prefix, so a
 * name outside that set ran in CI while being structurally invisible to spec-controller's own
 * ledger — a real quality check kept off the books, which is exactly where a watermelon hides.
 * The prefix set is gone: this check is on the books because its STEP is a step of ci.yml that
 * runs no declared runner and nothing excludes, and it would be on them under any name at all.
 * The `@lint=lint:complexity-exceptions` tag on @SCN-CPX-003 is what keeps it out of the suspense
 * row as an uncited static check. Observed AND NAMED is the balanced state, unchanged.
 *
 * A PURE FUNCTION OF THE CHECKED-OUT TREE, a full CI gate on every push. That sentence named
 * `lint:scn-tags` as the check it mirrored until 3F-3312 deleted it; the shape is stated on its
 * own here rather than borrowed from a sibling that can leave. It does NOT mirror its own twin any more — @SCN-FIT-001 converted
 * (3F-3151) and is observed through the `id:` on its own CI step, while this one keeps the
 * discovered route. The pair is where a consumer can read both arrangements side by side.
 */

import { COMPLEXITY_EXCEPTIONS } from "./complexityExceptions.mjs";
import {
  measureTreeAtBareStandard,
  reconcileExceptions,
  type Disagreement,
} from "./complexityExceptionsReconciliation.mjs";

/** How to read the reds, printed once above them so the three faults are not read as one. */
const FIX_BY_KIND: Record<Disagreement["kind"], string> = {
  regression: "refactor the file back to its recorded value (never edit the entry up)",
  "improvement-not-banked": "edit the entry down to the measured value and re-date it",
  "stale-entry": "delete the entry — the file is under the standard, and the list shrinks",
};

/** `2 regression, 1 stale-entry` — the shape of the failure, before its detail. */
function tally(disagreements: readonly Disagreement[]): string {
  const counts = new Map<Disagreement["kind"], number>();
  for (const found of disagreements) counts.set(found.kind, (counts.get(found.kind) ?? 0) + 1);
  return [...counts.entries()].map(([kind, count]) => `${count} ${kind}`).join(", ");
}

const root = process.cwd();
const measured = await measureTreeAtBareStandard(root);
const disagreements = reconcileExceptions(COMPLEXITY_EXCEPTIONS, measured);

if (disagreements.length === 0) {
  console.log(
    `complexity-exceptions lint: OK — all ${COMPLEXITY_EXCEPTIONS.length} exception entr(ies) state ` +
      `the value eslint measures today, so the list can only tighten.`,
  );
  process.exit(0);
}

console.error(
  `complexity-exceptions lint: FAILED — ${disagreements.length} exception entr(ies) disagree with ` +
    `the measured tree (${tally(disagreements)}). The list is a claim about this tree, and a claim ` +
    `that has stopped being true is how a ratchet turns back into a ceiling:`,
);
for (const found of disagreements) {
  console.error(`  ${found.message}`);
}
console.error("");
for (const [kind, fix] of Object.entries(FIX_BY_KIND)) {
  console.error(`  ${kind}: ${fix}`);
}
process.exit(1);
