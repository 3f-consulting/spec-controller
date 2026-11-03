import { describe, it, expect } from "vitest";
import { remarkWordsOf } from "./remarkWords.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";

describe("[SCN-RPT-065] a check step that did not run is worded by what the record said, skipped, ended with another outcome or carrying none, prefixed by the code it cites", () => {
  it("words a skipped step, a step that ended with another outcome and a step with no outcome, each prefixed by the code it cites", () => {
    const notes = [
      { kind: "check-step-did-not-run", code: "SCN-CVT-003", outcome: "skipped" },
      { kind: "check-step-did-not-run", code: "SCN-CVT-004", outcome: "neutral" },
      { kind: "check-step-did-not-run", code: "SCN-CVT-005" },
    ] as const;
    expect(notes.map((note) => remarkWordsOf({ notes: [note] }))).toStrictEqual([
      CORE_MESSAGES[CoreMessage.CheckStepSkipped]("SCN-CVT-003"),
      CORE_MESSAGES[CoreMessage.CheckStepEnded]("SCN-CVT-004", "neutral"),
      CORE_MESSAGES[CoreMessage.CheckStepNoOutcome]("SCN-CVT-005"),
    ]);
  });
});
