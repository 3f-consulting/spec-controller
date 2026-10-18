import { bareTerm } from "../lib/bareTerm.js";
import { SCN_CODE } from "../domain/featureCode.js";

export interface ScriptCitation {
  readonly scnId: string;
}

export function citationOfCitedRow(citedScn: string | undefined): ScriptCitation | null {
  if (citedScn === undefined) return null;
  const scnId = bareTerm(citedScn);
  return SCN_CODE.test(scnId) ? { scnId } : null;
}
