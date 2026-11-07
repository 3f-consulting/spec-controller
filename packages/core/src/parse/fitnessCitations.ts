import { bareTerm } from "../lib/bareTerm.js";
import { CLAIM_CODE } from "../domain/featureCode.js";

export interface ScriptCitation {
  readonly claimCode: string;
}

export function citationOfCitedRow(citedClaimCode: string | undefined): ScriptCitation | null {
  if (citedClaimCode === undefined) return null;
  const claimCode = bareTerm(citedClaimCode);
  return CLAIM_CODE.test(claimCode) ? { claimCode } : null;
}
