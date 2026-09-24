/**
 * `## Scenario code errors` (3F-3635) — the corpus's misfiled codes, each by its handle and what
 * to do about it, or the statement that there are none.
 *
 * ITS OWN MODULE, for `runVerdict.ts`'s reason: `markdown.ts` is far past the size a touched file
 * is held to, and a self-contained emitter travels with its own arms.
 *
 * IT SITS BESIDE `## Run integrity`, ahead of the summary views, because like the unsound stamp it
 * is a caveat on every cut beneath it — the by-feature one above all, which groups on the very
 * codes listed here. It speaks whenever a corpus was judged, and never blank: clean codes are a
 * finding too, stated with the population they were found over (@SCN-STG-021). A reconciliation
 * composed from parsed scenarios carries no `scenarioCodeErrors`, and there is nothing to say.
 *
 * THE POPULATION IS THE FEATURE-NAME MAP, the one the by-feature cut already reads, so a report
 * re-rendered from its JSON states it with no key of its own. With clean codes the coded files and
 * the codes are one to one, which is why one count names both.
 */

import type { RenderInput } from "../assemble/renderInput.js";

/** Said on every judged run, errors or none: a duplicate belongs on its account, not here. */
const DUPLICATE_LINE =
  "A duplicated @SCN code is not listed here: it is reported on its account's rows, as `duplicate-scn-code`.";

function cleanStatement(codes: number): string {
  if (codes === 1) {
    return (
      "Scenario codes are clean — 1 feature code, carried by exactly one feature file, and every " +
      "coded scenario sits in the file its code names."
    );
  }
  return (
    `Scenario codes are clean — ${codes} feature codes, each carried by exactly one of ${codes} ` +
    "feature files, and every coded scenario sits in the file its code names."
  );
}

export const scenarioCodeErrorsSection = (report: RenderInput): string[] => {
  if (report.scenarioCodeErrors === undefined) return [];
  const errors = report.scenarioCodeErrors;
  if (errors.length === 0) {
    const codes = Object.keys(report.metadata?.featureNames ?? {}).length;
    return ["## Scenario code errors", "", cleanStatement(codes), "", DUPLICATE_LINE, ""];
  }
  const count =
    errors.length === 1 ? "1 scenario code error" : `${errors.length} scenario code errors`;
  return [
    "## Scenario code errors",
    "",
    `${count} — each misfiles a scenario code, so the by-feature cut below cannot be trusted, and ` +
      "the run fails (exit 1). Every account still reconciles as it would if the code were filed " +
      "correctly.",
    "",
    ...errors.map((error) => `- \`${error.kind}\` — ${error.message}`),
    "",
    DUPLICATE_LINE,
    "",
  ];
};
