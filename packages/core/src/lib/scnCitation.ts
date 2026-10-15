import { SCN_ID_SOURCE } from "../domain/featureCode.js";

const SCN_CITATION = new RegExp(`\\[(${SCN_ID_SOURCE})\\]`, "g");

export function scnCitationsOf(text: string): string[] {
  return [...text.matchAll(SCN_CITATION)].map((match) => match[1]!);
}
