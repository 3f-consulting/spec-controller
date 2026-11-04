import type { ObservationNote } from "../domain/journal.js";
import { CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";

interface Remark {
  readonly message?: string;
  readonly notes?: readonly ObservationNote[];
}

function noteWords(note: ObservationNote): string {
  switch (note.kind) {
    case "several-scn-codes":
      return coreMessage(CoreMessage.SeveralScnCodesCited, { count: note.codes.length, codes: note.codes.join(", ") });
    case "shared-scn-code":
      return coreMessage(CoreMessage.SharedScnCode, { code: note.code });
    case "ambiguous-step":
      return note.step === undefined
        ? coreMessage(CoreMessage.AmbiguousUnnamedStep)
        : coreMessage(CoreMessage.AmbiguousNamedStep, { step: note.step });
    case "check-step-did-not-run":
      return checkStepWords(note.code, note.outcome);
  }
}

function checkStepWords(code: string, outcome: string | undefined): string {
  if (outcome === undefined) return coreMessage(CoreMessage.CheckStepNoOutcome, { scnId: code });
  if (outcome === "skipped") return coreMessage(CoreMessage.CheckStepSkipped, { scnId: code });
  return coreMessage(CoreMessage.CheckStepEnded, { scnId: code, outcome });
}

export function remarkWordsOf({ message, notes = [] }: Remark): string | undefined {
  const words = [...(message === undefined || message.trim() === "" ? [] : [message]), ...notes.map(noteWords)];
  return words.length === 0 ? undefined : words.join(" ");
}

export function remarkHeadlineOf({ message, notes = [] }: Remark, quote: (line: string) => string): string | undefined {
  const headline = message?.split("\n").map((line) => line.replace(/\s+/g, " ").trim()).find((line) => line.length > 0);
  return remarkWordsOf({ ...(headline === undefined ? {} : { message: quote(headline) }), notes });
}
