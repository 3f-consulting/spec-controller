import { describe, it, expect } from "vitest";
import { remarkWordsOf } from "./remarkWords.js";
import { CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";

describe("[SCN-RPT-065] a check step that did not run is worded by what the record said, skipped, ended with another outcome or carrying none, prefixed by the code it cites", () => {
  it("words a skipped step, a step that ended with another outcome and a step with no outcome, each prefixed by the code it cites", () => {
    const notes = [
      { kind: "check-step-did-not-run", code: "SCN-CVT-003", outcome: "skipped" },
      { kind: "check-step-did-not-run", code: "SCN-CVT-004", outcome: "neutral" },
      { kind: "check-step-did-not-run", code: "SCN-CVT-005" },
    ] as const;
    expect(notes.map((note) => remarkWordsOf({ notes: [note] }))).toStrictEqual([
      coreMessage(CoreMessage.CheckStepSkipped, { scnId: "SCN-CVT-003" }),
      coreMessage(CoreMessage.CheckStepEnded, { scnId: "SCN-CVT-004", outcome: "neutral" }),
      coreMessage(CoreMessage.CheckStepNoOutcome, { scnId: "SCN-CVT-005" }),
    ]);
  });
});
