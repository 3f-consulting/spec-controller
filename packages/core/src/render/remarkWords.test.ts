import { describe, it, expect } from "vitest";
import { remarkWordsOf } from "./remarkWords.js";

describe("[SCN-RPT-065] a check step that did not run is worded by what the record said, skipped, ended with another outcome or carrying none, prefixed by the code it cites", () => {
  it("words a skipped step, a step that ended with another outcome and a step with no outcome, each prefixed by the code it cites", () => {
    const notes = [
      { kind: "check-step-did-not-run", code: "SCN-CVT-003", outcome: "skipped" },
      { kind: "check-step-did-not-run", code: "SCN-CVT-004", outcome: "neutral" },
      { kind: "check-step-did-not-run", code: "SCN-CVT-005" },
    ] as const;
    expect(notes.map((note) => remarkWordsOf({ notes: [note] }))).toStrictEqual([
      "SCN-CVT-003: the CI run's record says this check's step was skipped — so the check did not run.",
      "SCN-CVT-004: the CI run's record says this check's step ended `neutral` — so the check did not run.",
      "SCN-CVT-005: the CI run's record carries no outcome for this check's step — so the check did not run.",
    ]);
  });
});
