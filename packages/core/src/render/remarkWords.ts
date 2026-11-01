import type { ObservationNote } from "../domain/journal.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";

interface Remark {
  readonly message?: string;
  readonly notes?: readonly ObservationNote[];
}

function noteWords(note: ObservationNote): string {
  switch (note.kind) {
    case "several-scn-codes":
      return CORE_MESSAGES[CoreMessage.SeveralScnCodes](note.codes);
    case "shared-scn-code":
      return CORE_MESSAGES[CoreMessage.SharedScnCode](note.code);
    case "ambiguous-step":
      return note.step === undefined
        ? CORE_MESSAGES[CoreMessage.AmbiguousUnnamedStep]
        : CORE_MESSAGES[CoreMessage.AmbiguousNamedStep](note.step);
    case "check-step-did-not-run":
      return checkStepWords(note.code, note.outcome);
  }
}

function checkStepWords(code: string, outcome: string | undefined): string {
  if (outcome === undefined) return CORE_MESSAGES[CoreMessage.CheckStepNoOutcome](code);
  if (outcome === "skipped") return CORE_MESSAGES[CoreMessage.CheckStepSkipped](code);
  return CORE_MESSAGES[CoreMessage.CheckStepEnded](code, outcome);
}

export function remarkWordsOf({ message, notes = [] }: Remark): string | undefined {
  const words = [...(message === undefined ? [] : [message]), ...notes.map(noteWords)];
  return words.length === 0 ? undefined : words.join(" ");
}

export function remarkHeadlineOf({ message, notes = [] }: Remark): string | undefined {
  const headline = message?.split("\n").map((line) => line.replace(/\s+/g, " ").trim()).find((line) => line.length > 0);
  return remarkWordsOf({ ...(headline === undefined ? {} : { message: headline }), notes });
}
