import { CLAIM_CODE_PREFIXES } from "./featureCode.js";

export interface ClaimCodeOccurrence {
  readonly text: string;
  readonly path: string;
  readonly line: number;
  readonly commit?: string;
}

export interface AllocationRequest {
  readonly part: string;
  readonly headerCodes: readonly string[];
  readonly isNew?: boolean;
}

export interface UnknownPart {
  readonly kind: "unknown-part";
  readonly part: string;
  readonly headerCodes: readonly string[];
}

export type UnknownPartCarried =
  | { readonly kind: "none" }
  | { readonly kind: "some"; readonly headerCodes: readonly [string, ...(readonly string[])] };

export interface Allocation {
  readonly kind: "allocated";
  readonly code: string;
  readonly highest: { readonly code: string; readonly occurrence: ClaimCodeOccurrence } | null;
  readonly alreadyHeaded?: boolean;
}

const NUMBER_WIDTH = 3;

// A number a retired prefix carried is still never handed out again.
export const ALLOCATION_COUNTED_PREFIXES: readonly string[] = [...CLAIM_CODE_PREFIXES, "SCN"];

const COUNTED_CODES = new RegExp(`(?:${ALLOCATION_COUNTED_PREFIXES.join("|")})-([A-Z0-9]+)-\\d+`, "g");

function numberOf(code: string): number {
  return Number(code.slice(code.lastIndexOf("-") + 1));
}

function outranks(code: string, occurrence: ClaimCodeOccurrence, highest: NonNullable<Allocation["highest"]>): boolean {
  const difference = numberOf(code) - numberOf(highest.code);
  return difference > 0 || (difference === 0 && occurrence.commit === undefined && highest.occurrence.commit !== undefined);
}

function highestOf(part: string, occurrences: readonly ClaimCodeOccurrence[]): Allocation["highest"] {
  let highest: Allocation["highest"] = null;
  for (const occurrence of occurrences) {
    for (const [code, codePart] of occurrence.text.matchAll(COUNTED_CODES)) {
      if (codePart !== part) continue;
      if (highest === null || outranks(code, occurrence, highest)) highest = { code, occurrence };
    }
  }
  return highest;
}

export function nextClaimCode(request: AllocationRequest, occurrences: readonly ClaimCodeOccurrence[]): Allocation | UnknownPart {
  const headed = request.headerCodes.includes(request.part);
  if (!headed && request.isNew !== true) {
    return { kind: "unknown-part", part: request.part, headerCodes: [...new Set(request.headerCodes)].sort() };
  }
  const highest = highestOf(request.part, occurrences);
  const next = (highest === null ? 0 : numberOf(highest.code)) + 1;
  const code = `CLM-${request.part}-${String(next).padStart(NUMBER_WIDTH, "0")}`;
  return headed && request.isNew === true ? { kind: "allocated", code, highest, alreadyHeaded: true } : { kind: "allocated", code, highest };
}

export function unknownPartCarried(unknown: UnknownPart): UnknownPartCarried {
  const [first, ...rest] = unknown.headerCodes;
  return first === undefined ? { kind: "none" } : { kind: "some", headerCodes: [first, ...rest] };
}
