import { CLAIM_CODE_SOURCE } from "../domain/featureCode.js";

const CLAIM_CODE_CITATION = new RegExp(`\\[(${CLAIM_CODE_SOURCE})\\]`, "g");

export function claimCodeCitationsOf(text: string): string[] {
  return [...text.matchAll(CLAIM_CODE_CITATION)].map((match) => match[1]!);
}
