import { SCN_ID_SOURCE } from "../domain/featureCode.js";

const SCN_CITATION = new RegExp(`\\[(${SCN_ID_SOURCE})\\]`);

export function parseScnCitation(text: string): string | null {
  const match = SCN_CITATION.exec(text);
  return match ? match[1]! : null;
}

